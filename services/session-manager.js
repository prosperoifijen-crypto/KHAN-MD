import fs from "fs";
import path from "path";
import pino from "pino";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  Browsers
} from "@whiskeysockets/baileys";

import {
  SESSIONS_DIR
} from "./config.js";

import {
  listSessions,
  updateSession,
  getSession
} from "./sessions.js";

const logger = pino({ level: "info" });

const activeSockets = new Map();

let socketEventBinder = null;

export function setSocketEventBinder(fn) {
  socketEventBinder = typeof fn === "function" ? fn : null;
}

function bindSocketEvents(sock, sessionId) {
  if (typeof socketEventBinder !== "function") return;

  try {
    socketEventBinder(sock, sessionId);
  } catch (error) {
    console.error(
      `Socket event binder failed for ${sessionId}:`,
      error?.message || error
    );
  }
}
const reconnecting = new Set();

const RECONNECT_DELAY = 10000;

function ensureSessionsDir() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function hasCredentials(sessionPath) {
  return fs.existsSync(
    path.join(sessionPath, "creds.json")
  );
}

export function getActiveSocket(sessionId) {
  return activeSockets.get(sessionId) || null;
}

export function getActiveSessionIds() {
  return [...activeSockets.keys()];
}

export async function connectSavedSession(sessionId) {
  const session = getSession(sessionId);

  if (!session) {
    throw new Error(
      `Session "${sessionId}" is not registered.`
    );
  }

  const sessionPath = session.path;

  if (!fs.existsSync(sessionPath)) {
    throw new Error(
      `Session directory does not exist: ${sessionPath}`
    );
  }

  if (!hasCredentials(sessionPath)) {
    throw new Error(
      `No saved credentials found for "${sessionId}".`
    );
  }

  if (reconnecting.has(sessionId)) {
    return activeSockets.get(sessionId) || null;
  }

  const existing = activeSockets.get(sessionId);

  if (existing) {
    return existing;
  }

  reconnecting.add(sessionId);

  try {
    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(sessionPath);

    const {
      version
    } = await fetchLatestWaWebVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS("Chrome"),
      logger,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      syncFullHistory: false,
      markOnlineOnConnect: true
    });

    activeSockets.set(sessionId, sock);
    bindSocketEvents(sock, sessionId);

    sock.ev.on(
      "creds.update",
      saveCreds
    );

    sock.ev.on(
      "connection.update",
      async ({
        connection,
        lastDisconnect
      }) => {

        if (connection === "open") {
          await updateSession(sessionId, {
            status: "connected",
            socketActive: true,
            connectedAt:
              new Date().toISOString(),
            disconnectedAt: null,
            disconnectReason: null,
            error: null
          });

          console.log(
            `☠️ Saved session ${sessionId}: RECONNECTED`
          );
        }

        if (connection === "close") {
          activeSockets.delete(sessionId);

          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          const loggedOut =
            statusCode ===
            DisconnectReason.loggedOut;

          if (loggedOut) {
            await updateSession(sessionId, {
              status: "logged_out",
              socketActive: false,
              disconnectedAt:
                new Date().toISOString(),
              disconnectReason: "logged_out"
            });

            console.log(
              `⚠️ Saved session ${sessionId}: LOGGED OUT`
            );

            return;
          }

          await updateSession(sessionId, {
            status: "disconnected",
            socketActive: false,
            disconnectedAt:
              new Date().toISOString(),
            disconnectReason:
              statusCode ||
              "connection_closed"
          });

          console.log(
            `⚠️ Saved session ${sessionId}: connection closed`
          );

          setTimeout(
            async () => {
              try {
                const current =
                  getSession(sessionId);

                if (!current) {
                  console.log(
                    `⚠️ Saved session ${sessionId}: session no longer exists`
                  );
                  return;
                }

                if (
                  current.status ===
                  "logged_out"
                ) {
                  console.log(
                    `⚠️ Saved session ${sessionId}: reconnect cancelled because session is logged out`
                  );
                  return;
                }

                if (
                  activeSockets.has(sessionId)
                ) {
                  return;
                }

                if (
                  !hasCredentials(
                    current.path
                  )
                ) {
                  console.log(
                    `⚠️ Saved session ${sessionId}: reconnect cancelled because credentials are missing`
                  );

                  await updateSession(
                    sessionId,
                    {
                      status: "failed",
                      socketActive: false,
                      error:
                        "Saved credentials are missing.",
                      failedAt:
                        new Date().toISOString()
                    }
                  );

                  return;
                }

                console.log(
                  `🔄 Saved session ${sessionId}: attempting automatic reconnect...`
                );

                await connectSavedSession(
                  sessionId
                );

              } catch (error) {
                console.error(
                  `❌ Saved session ${sessionId}: automatic reconnect failed:`,
                  error.message
                );
              }
            },
            RECONNECT_DELAY
          );
        }
      }
    );

    return sock;

  } finally {
    reconnecting.delete(sessionId);
  }
}

export async function reconnectSavedSessions() {
  const sessions = listSessions();

  for (const session of sessions) {
    try {
      if (!session?.id || !session?.path) {
        continue;
      }

      /*
       * Never interfere with the original main auth session.
       * Only recover registered multi-user sessions that have
       * their own credentials directory.
       */
      const credsFile = path.join(session.path, "creds.json");

      if (!fs.existsSync(credsFile)) {
        continue;
      }

      /*
       * A Telegram-created session may have been marked
       * disconnected/failed after a temporary network error.
       * If credentials exist, attempt recovery.
       */
      if (
        session.telegramId ||
        session.status === "connected" ||
        session.status === "disconnected" ||
        session.status === "failed" ||
        session.status === "restarting"
      ) {
        console.log(
          `♻️ Recovering saved multi-user session: ${session.id}`
        );

        await connectSavedSession(session.id);
      }

    } catch (error) {
      console.error(
        `⚠️ Could not recover session ${session?.id || "unknown"}:`,
        error.message
      );

      /*
       * Do not destroy the session or mark it permanently failed.
       * A later recovery attempt can try again.
       */
      if (session?.id) {
        try {
          await updateSession(session.id, {
            status: "disconnected",
            socketActive: false,
            error: error.message
          });
        } catch {}
      }
    }
  }
}

export function getSessionManagerStatus() {
  return {
    enabled: true,
    sessionCount:
      listSessions().length,
    activeSessions:
      activeSockets.size,
    reconnecting:
      reconnecting.size
  };
}

export default {
  connectSavedSession,
  reconnectSavedSessions,
  getActiveSocket,
  getActiveSessionIds,
  getSessionManagerStatus,
  setSocketEventBinder
};

export async function createPairingSocket(sessionId, phoneNumber, callbacks = {}) {
  const session = getSession(sessionId);

  if (!session) {
    throw new Error(`Session "${sessionId}" is not registered.`);
  }

  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  const existing = activeSockets.get(sessionId);

  if (existing) {
    return existing;
  }

  const {
    onPairingCode,
    onConnected,
    onDisconnected,
    onFailed
  } = callbacks;

  let sock = null;
  let saveQueue = Promise.resolve();

  try {
    const { state, saveCreds } = await useMultiFileAuthState(session.path);

    const { version } = await fetchLatestWaWebVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      syncFullHistory: false,
      markOnlineOnConnect: true
    });

    activeSockets.set(sessionId, sock);
    bindSocketEvents(sock, sessionId);

    /*
     * IMPORTANT:
     * Queue credential saves so a 515 close cannot race
     * against saveCreds().
     */
    sock.ev.on("creds.update", () => {
      saveQueue = saveQueue
        .then(() => saveCreds())
        .catch(error => {
          console.error(
            `Credential save failed for ${sessionId}:`,
            error.message
          );
        });

      return saveQueue;
    });

    sock.ev.on("connection.update", async update => {
      const {
        connection,
        lastDisconnect,
        isNewLogin
      } = update;

      try {
        /*
         * WhatsApp can report the new login BEFORE connection=open.
         * Mark it here so the 515 restart is treated as a successful
         * pairing lifecycle rather than a failed first connection.
         */
        if (isNewLogin) {
          await saveQueue;

          await updateSession(sessionId, {
            status: "restarting",
            socketActive: true,
            firstConnectedAt: new Date().toISOString(),
            error: null
          });

          console.log(
            `✅ New WhatsApp login received for Telegram session ${sessionId}.`
          );
        }

        /*
         * Request the pairing code only for an unregistered session.
         */
        if (
          connection === "connecting" &&
          !state.creds.registered
        ) {
          const cleanPhone = String(phoneNumber)
            .replace(/[^\d]/g, "");

          await new Promise(resolve => setTimeout(resolve, 5000));

          const code = await sock.requestPairingCode(cleanPhone);

          await updateSession(sessionId, {
            status: "pairing",
            socketActive: true,
            pairingCode: code
          });

          console.log(
            `🔐 Pairing code generated for ${sessionId}: ${code}`
          );

          if (typeof onPairingCode === "function") {
            await onPairingCode(code);
          }
        }

        /*
         * Normal successful connection.
         */
        if (connection === "open") {
          await saveQueue;

          activeSockets.set(sessionId, sock);

          await updateSession(sessionId, {
            status: "connected",
            socketActive: true,
            connectedAt: new Date().toISOString(),
            firstConnectedAt:
              session.firstConnectedAt ||
              new Date().toISOString(),
            disconnectedAt: null,
            disconnectReason: null,
            error: null,
            pairingCode: null
          });

          console.log(
            `🟢 WhatsApp session connected: ${sessionId}`
          );

          if (typeof onConnected === "function") {
            await onConnected(sock);
          }

          return;
        }

        /*
         * 515 = restartRequired.
         *
         * This is EXPECTED after successful pairing.
         * Save credentials first, destroy the old socket reference,
         * then immediately create a NEW socket using the same auth path.
         */
        if (connection === "close") {
          await saveQueue;

          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          const loggedOut =
            statusCode === DisconnectReason.loggedOut;

          const restartRequired =
            statusCode === DisconnectReason.restartRequired ||
            statusCode === 515;

          activeSockets.delete(sessionId);

          await updateSession(sessionId, {
            status: loggedOut
              ? "logged_out"
              : restartRequired
                ? "restarting"
                : "disconnected",
            socketActive: false,
            disconnectedAt: new Date().toISOString(),
            disconnectReason:
              statusCode || "connection_closed"
          });

          console.log(
            `WhatsApp session ${sessionId} closed: ${statusCode}`
          );

          if (typeof onDisconnected === "function") {
            await onDisconnected(statusCode);
          }

          /*
           * Never reconnect a logged-out account.
           */
          if (loggedOut) {
            return;
          }

          /*
           * 515 must reconnect immediately with the freshly
           * persisted credentials.
           */
          if (restartRequired) {
            console.log(
              `♻️ 515 restartRequired — reopening ${sessionId} with saved credentials...`
            );

            try {
              await createPairingSocket(
                sessionId,
                phoneNumber,
                callbacks
              );
            } catch (error) {
              console.error(
                `❌ Restart failed for ${sessionId}:`,
                error.message
              );

              await updateSession(sessionId, {
                status: "failed",
                socketActive: false,
                error: error.message,
                failedAt: new Date().toISOString()
              });

              if (typeof onFailed === "function") {
                await onFailed(error);
              }
            }

            return;
          }

          /*
           * Other disconnects are temporary.
           *
           * IMPORTANT:
           * Once WhatsApp credentials are registered, reconnect using
           * the normal saved-session connector. Do NOT start another
           * pairing lifecycle.
           */
          setTimeout(async () => {
            try {
              const currentSession = getSession(sessionId);

              if (!currentSession) {
                return;
              }

              console.log(
                `♻️ Reconnecting saved WhatsApp session ${sessionId}...`
              );

              await connectSavedSession(sessionId);

            } catch (error) {
              console.error(
                `⚠️ Temporary reconnect failure for ${sessionId}:`,
                error.message
              );

              /*
               * Do NOT mark the session FAILED for a temporary
               * network/fetch error. Leave it disconnected and
               * allow the saved-session reconnect system to retry.
               */
              await updateSession(sessionId, {
                status: "disconnected",
                socketActive: false,
                error: error.message
              });
            }
          }, 5000);
        }

      } catch (error) {
        console.error(
          `❌ Pairing socket error for ${sessionId}:`,
          error.message
        );

        activeSockets.delete(sessionId);

        await updateSession(sessionId, {
          status: "failed",
          socketActive: false,
          error: error.message,
          failedAt: new Date().toISOString()
        });

        if (typeof onFailed === "function") {
          await onFailed(error);
        }
      }
    });

    return sock;

  } catch (error) {
    activeSockets.delete(sessionId);

    await updateSession(sessionId, {
      status: "failed",
      socketActive: false,
      error: error.message,
      failedAt: new Date().toISOString()
    });

    if (typeof onFailed === "function") {
      await onFailed(error);
    }

    throw error;
  }
}
