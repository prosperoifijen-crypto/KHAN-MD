import pino from "pino";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  Browsers
} from "@whiskeysockets/baileys";

import {
  createPairingSession,
  markPairingStarted,
  markConnected,
  markDisconnected,
  markFailed,
  getPairingSession
} from "./pairing.js";

import { getSessionPath } from "./sessions.js";

const logger = pino({
  level: "info"
});

const activeSockets = new Map();
const pairingRequests = new Map();
const restartingSessions = new Set();

function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[^\d]/g, "");
}

function cleanPhoneForPairing(phone) {
  return normalizePhone(phone).replace(/^0+/, "");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getStatusCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode || null;
}

export function getActivePairingCount() {
  return activeSockets.size;
}

export function getActivePairingSessions() {
  return [...activeSockets.keys()];
}

async function restartPairedSocket({
  id,
  phone,
  authPath,
  version,
  browser
}) {
  if (restartingSessions.has(id)) {
    return;
  }

  restartingSessions.add(id);

  try {
    console.log(
      `𖣔 Session ${id}: WhatsApp requested restart after pairing.`
    );

    const oldSocket = activeSockets.get(id);

    if (oldSocket) {
      try {
        oldSocket.end(
          new Error("Restarting after successful pairing.")
        );
      } catch {}
    }

    activeSockets.delete(id);

    await wait(1500);

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(authPath);

    const sock = makeWASocket({
      auth: state,
      logger,
      version,
      browser,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      keepAliveIntervalMs: 30_000,
      syncFullHistory: false
    });

    activeSockets.set(id, sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on(
      "connection.update",
      async update => {
        const {
          connection,
          lastDisconnect
        } = update;

        if (connection === "open") {
          await markConnected(id, {
            phone,
            socketActive: true,
            whatsappWebVersion: version.join("."),
            browser: browser.join(" / ")
          });

          console.log(
            `☠️ Session ${id}: CONNECTED after pairing restart.`
          );

          restartingSessions.delete(id);
          return;
        }

        if (connection === "close") {
          const statusCode =
            getStatusCode(lastDisconnect);

          const loggedOut =
            statusCode === DisconnectReason.loggedOut;

          const reason =
            loggedOut
              ? "logged_out"
              : `connection_closed_${statusCode || "unknown"}`;

          activeSockets.delete(id);

          if (loggedOut) {
            await markDisconnected(id, reason);
            restartingSessions.delete(id);

            console.log(
              `⚠️ Session ${id}: logged out.`
            );

            return;
          }

          if (statusCode === 515) {
            console.log(
              `𖣔 Session ${id}: another restart requested.`
            );

            restartingSessions.delete(id);

            await restartPairedSocket({
              id,
              phone,
              authPath,
              version,
              browser
            });

            return;
          }

          await markDisconnected(id, reason);

          restartingSessions.delete(id);

          console.log(
            `⚠️ Session ${id}: connection closed: ${reason}`
          );
        }
      }
    );

  } catch (error) {
    restartingSessions.delete(id);

    await markFailed(
      id,
      error?.message || error
    );

    throw error;
  }
}

export async function startPairing({
  phone,
  name = null,
  sessionId = null
} = {}) {
  const normalizedPhone =
    cleanPhoneForPairing(phone);

  if (!/^\d+$/.test(normalizedPhone)) {
    throw new Error(
      "Invalid WhatsApp number. Use the international number, for example 2348012345678."
    );
  }

  const session = createPairingSession({
    phone: normalizedPhone,
    name,
    sessionId
  });

  const id = session.id;

  if (activeSockets.has(id)) {
    throw new Error(
      `Pairing session "${id}" is already active.`
    );
  }

  if (pairingRequests.has(id)) {
    throw new Error(
      `Pairing request "${id}" is already running.`
    );
  }

  const authPath = getSessionPath(id);

  let sock = null;

  try {
    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(authPath);

    const browser =
      Browsers.macOS("Chrome");

    const latest =
      await fetchLatestWaWebVersion();

    const version = latest?.version;

    if (
      !Array.isArray(version) ||
      version.length !== 3
    ) {
      throw new Error(
        "Unable to obtain the current WhatsApp Web version."
      );
    }

    console.log(
      `𖣔 Pairing session ${id}`
    );

    console.log(
      `𓁹 WhatsApp Web version: ${version.join(".")}`
    );

    console.log(
      `𓁹 Browser: ${browser[0]} / ${browser[1]} / ${browser[2]}`
    );

    sock = makeWASocket({
      auth: state,
      logger,
      version,
      browser,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      keepAliveIntervalMs: 30_000,
      syncFullHistory: false
    });

    activeSockets.set(id, sock);
    pairingRequests.set(id, true);

    await markPairingStarted(id);

    sock.ev.on("creds.update", saveCreds);

    let pairingCode = null;
    let pairingRequested = false;
    let settled = false;

    const pairingPromise =
      new Promise((resolve, reject) => {

        const timeout = setTimeout(() => {
          if (settled) return;

          settled = true;

          reject(
            new Error(
              "Timed out while preparing the WhatsApp pairing code."
            )
          );
        }, 30_000);

        const finish = (fn, value) => {
          if (settled) return;

          settled = true;
          clearTimeout(timeout);

          fn(value);
        };

        const requestCode = async () => {
          if (pairingRequested) {
            return;
          }

          if (sock.authState?.creds?.registered) {
            finish(
              reject,
              new Error(
                "This session is already registered."
              )
            );

            return;
          }

          pairingRequested = true;

          try {
            await wait(1000);

            if (
              sock.authState?.creds?.registered
            ) {
              finish(
                reject,
                new Error(
                  "This session became registered before pairing."
                )
              );

              return;
            }

            pairingCode =
              await sock.requestPairingCode(
                normalizedPhone
              );

            if (!pairingCode) {
              throw new Error(
                "WhatsApp did not return a pairing code."
              );
            }

            console.log(
              `𖣔 Pairing code generated for ${id}: ${pairingCode}`
            );

            finish(
              resolve,
              pairingCode
            );

          } catch (error) {
            finish(
              reject,
              error
            );
          }
        };

        sock.ev.on(
          "connection.update",
          async update => {
            const {
              connection,
              lastDisconnect
            } = update;

            if (connection === "connecting") {
              void requestCode();
            }

            if (connection === "open") {
              await markConnected(id, {
                phone: normalizedPhone,
                socketActive: true,
                whatsappWebVersion:
                  version.join("."),
                browser:
                  browser.join(" / ")
              });

              pairingRequests.delete(id);

              console.log(
                `☠️ Pairing session ${id} is CONNECTED.`
              );
            }

            if (connection === "close") {
              const statusCode =
                getStatusCode(lastDisconnect);

              const loggedOut =
                statusCode ===
                DisconnectReason.loggedOut;

              const reason =
                loggedOut
                  ? "logged_out"
                  : `connection_closed_${statusCode || "unknown"}`;

              console.log(
                `⚠️ Pairing session ${id} closed: ${reason}`
              );

              /*
               * 515 is the important pairing case.
               *
               * WhatsApp has already configured the pairing
               * and is explicitly requesting a socket restart.
               *
               * Do NOT mark this as a failed pairing.
               */
              if (
                statusCode === 515 &&
                pairingCode
              ) {
                pairingRequests.delete(id);

                await restartPairedSocket({
                  id,
                  phone: normalizedPhone,
                  authPath,
                  version,
                  browser
                });

                return;
              }

              activeSockets.delete(id);
              pairingRequests.delete(id);

              await markDisconnected(
                id,
                reason
              );

              if (
                !pairingCode &&
                !settled
              ) {
                finish(
                  reject,
                  new Error(
                    `WhatsApp closed the pairing connection (${reason}).`
                  )
                );
              }
            }
          }
        );
      });

    const code =
      await pairingPromise;

    pairingRequests.delete(id);

    return {
      ok: true,
      sessionId: id,
      phone: normalizedPhone,
      code,
      status: "pairing",
      whatsappWebVersion:
        version.join("."),
      browser
    };

  } catch (error) {
    activeSockets.delete(id);
    pairingRequests.delete(id);

    await markFailed(
      id,
      error?.message || error
    );

    if (sock) {
      try {
        sock.end(
          new Error(
            "Pairing request failed."
          )
        );
      } catch {}
    }

    throw error;
  }
}

export function getPairingStatus(sessionId) {
  return getPairingSession(sessionId);
}

export function getPairingEngineStatus() {
  return {
    enabled: true,
    provider: "Baileys",
    baileysPairingCode: true,
    multiSession: true,
    activeSessions: activeSockets.size,
    pairingRequests: pairingRequests.size,
    restartingSessions: restartingSessions.size,
    liveWhatsAppVersion: true,
    canonicalBrowser: true,
    restartOn515: true
  };
}
