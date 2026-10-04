import fs from "fs";

import {
  createPairingSession,
  getPairingSession,
  isValidPhone,
  normalizePhone
} from "./pairing.js";

import {
  getSession,
  updateSession
} from "./sessions.js";

import {
  createPairingSocket,
  getActiveSocket
} from "./session-manager.js";

const TELEGRAM_API =
  "https://api.telegram.org/bot";

const waitingForPhone = new Map();
const telegramSessions = new Map();

function token() {
  const value = process.env.TELEGRAM_BOT_TOKEN;

  if (!value) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured."
    );
  }

  return value;
}

async function telegram(method, body = {}) {
  const response = await fetch(
    `${TELEGRAM_API}${token()}/${method}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      result.description ||
      `Telegram API error: ${method}`
    );
  }

  return result.result;
}

async function sendPhoto(
  chatId,
  photoPath,
  caption = ""
) {
  const form = new FormData();

  form.append(
    "chat_id",
    String(chatId)
  );

  form.append(
    "photo",
    new Blob([
      fs.readFileSync(photoPath)
    ]),
    "aurelian.png"
  );

  form.append(
    "caption",
    caption
  );

  const response = await fetch(
    `${TELEGRAM_API}${token()}/sendPhoto`,
    {
      method: "POST",
      body: form
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      result.description ||
      "Telegram photo upload failed."
    );
  }

  return result.result;
}

async function sendMessage(
  chatId,
  text,
  extra = {}
) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

function getTelegramSession(telegramId) {
  return (
    telegramSessions.get(
      String(telegramId)
    ) || null
  );
}

function setTelegramSession(
  telegramId,
  sessionId
) {
  telegramSessions.set(
    String(telegramId),
    sessionId
  );
}

function clearTelegramSession(
  telegramId
) {
  telegramSessions.delete(
    String(telegramId)
  );
}

function tgPanel(
  title,
  lines = [],
  footer = true
) {
  const out = [
    "𓆩✦𓆪 AURELIAN",
    "THE PRIMORDIAL LORD",
    "",
    `┌─〔 ${title} 〕`,
    "│",
    ...lines.map(
      line => `│ ✦ ${line}`
    ),
    "│",
    "└─────────────────"
  ];

  if (footer) {
    out.push(
      "",
      "𓆩✦𓆪 THE FIRST ETERNAL"
    );
  }

  return out.join("\n");
}

function buildWelcome() {
  return [
    "𓆩✦𓆪 AURELIAN",
    "THE PRIMORDIAL LORD",
    "",
    "Ancient power • Immortality • Rebirth • Mystery",
    "",
    "┌─〔 TELEGRAM GATEWAY 〕",
    "│",
    "│ ✦ /pair 234xxxxxxxxxx",
    "│ ✦ /status",
    "│ ✦ /disconnect",
    "│ ✦ /help",
    "│",
    "└─────────────────",
    "",
    "𓆩✦𓆪 THE FIRST ETERNAL"
  ].join("\n");
}

function buildHelp() {
  return tgPanel(
    "COMMANDS",
    [
      "/start",
      "/pair 234xxxxxxxxxx",
      "/status",
      "/disconnect",
      "/help"
    ]
  );
}

function buildStatus(session) {
  if (!session) {
    return tgPanel(
      "SESSION STATUS",
      [
        "Session : NONE",
        "Status  : NOT CONNECTED",
        "Socket  : INACTIVE"
      ]
    );
  }

  const liveSocket =
    getActiveSocket(session.id);

  const active =
    !!liveSocket;

  let status;

  if (
    active &&
    session.status === "connected"
  ) {
    status = "CONNECTED";
  } else if (
    !active &&
    session.disconnectReason === 428
  ) {
    status = "RECONNECTING";
  } else if (
    !active &&
    session.status === "connected"
  ) {
    status = "RECONNECTING";
  } else {
    status = String(
      session.status ||
      "UNKNOWN"
    ).toUpperCase();
  }

  return tgPanel(
    "SESSION STATUS",
    [
      `Session : ${session.id}`,
      `Phone   : ${session.phone || "Unknown"}`,
      `Status  : ${status}`,
      `Socket  : ${
        active
          ? "ACTIVE"
          : "INACTIVE"
      }`
    ]
  );
}

function buildPairing(
  phone,
  code
) {
  return [
    "𓆩✦𓆪 AURELIAN",
    "THE PRIMORDIAL LORD",
    "",
    "Ancient power • Immortality • Rebirth • Mystery",
    "",
    "┌─〔 WHATSAPP PAIRING 〕",
    "│",
    `│ ✦ Phone : ${phone || "Unknown"}`,
    "│ ✦ Status: WAITING FOR LINK",
    "│",
    "│ ✦ PAIRING CODE",
    "│",
    "",
    `│   ${code || "WAITING..."}`,
    "│",
    "",
    "│ Open WhatsApp → Linked Devices",
    "│ → Link with phone number",
    "│ → Enter the code above",
    "│",
    "└─────────────────",
    "",
    "𓆩✦𓆪 THE FIRST ETERNAL"
  ].join("\n");
}

function buildConnected() {
  return tgPanel(
    "WHATSAPP CONNECTED",
    [
      "Status : CONNECTED",
      "Socket : ACTIVE",
      "Your private gateway is ready."
    ]
  );
}

function buildDisconnected() {
  return tgPanel(
    "WHATSAPP DISCONNECTED",
    [
      "Status : DISCONNECTED",
      "Socket : INACTIVE"
    ]
  );
}

function buildReconnecting() {
  return tgPanel(
    "RECONNECTING",
    [
      "Status : RECONNECTING",
      "Aurelian is restoring the WhatsApp connection.",
      "Please wait..."
    ]
  );
}

function buildError(message) {
  return tgPanel(
    "GATEWAY ERROR",
    [
      message ||
      "An unexpected error occurred."
    ]
  );
}

/*
 * START PAIRING
 *
 * Direct usage:
 * /pair 2348127985137
 *
 * The phone number is passed directly here.
 * No second prompt is required.
 */
async function startPairing(
  chatId,
  telegramId,
  phoneInput = ""
) {
  const existingId =
    getTelegramSession(
      telegramId
    );

  if (existingId) {
    const existing =
      getPairingSession(
        existingId
      );

    if (
      existing &&
      [
        "created",
        "pairing",
        "connected",
        "reconnecting"
      ].includes(existing.status)
    ) {
      await sendMessage(
        chatId,
        buildStatus(existing)
      );

      return;
    }

    clearTelegramSession(
      telegramId
    );
  }

  const phone =
    normalizePhone(
      phoneInput
    );

  /*
   * Only show the usage panel when
   * the user really did not supply
   * a phone number.
   */
  if (
    !phoneInput ||
    !isValidPhone(phone)
  ) {
    await sendMessage(
      chatId,
      tgPanel(
        "PAIR WHATSAPP",
        [
          "Use: /pair 234xxxxxxxxxx",
          "International format.",
          "No + sign.",
          "No spaces."
        ]
      )
    );

    return;
  }

  await handlePhone(
    chatId,
    telegramId,
    phone
  );
}

/*
 * HANDLE PHONE
 *
 * IMPORTANT:
 * This function receives the already
 * extracted phone number.
 */
async function handlePhone(
  chatId,
  telegramId,
  phoneInput
) {
  const phone =
    normalizePhone(
      phoneInput
    );

  if (!isValidPhone(phone)) {
    await sendMessage(
      chatId,
      tgPanel(
        "INVALID PHONE",
        [
          "The phone number is invalid.",
          "Use international digits.",
          "Example: 2348127985137"
        ]
      )
    );

    return;
  }

  waitingForPhone.delete(
    String(telegramId)
  );

  const session =
    createPairingSession({
      phone,
      name:
        `Telegram ${telegramId}`
    });

  setTelegramSession(
    telegramId,
    session.id
  );

  await updateSession(
    session.id,
    {
      telegramId:
        String(telegramId),

      telegramChatId:
        String(chatId),

      telegramUsername:
        null
    }
  );

  await sendMessage(
    chatId,
    tgPanel(
      "CREATING SESSION",
      [
        "Creating your private WhatsApp session.",
        `Phone : ${phone}`,
        "Please wait..."
      ]
    )
  );

  try {
    await createPairingSocket(
      session.id,
      phone,
      {
        onPairingCode:
          async code => {
            try {
              await sendMessage(
                chatId,
                buildPairing(
                  phone,
                  code
                ),
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📋 COPY PAIRING CODE",
                          copy_text: {
                            text: String(code)
                          }
                        }
                      ]
                    ]
                  }
                }
              );
            } catch (error) {
              console.error(
                "Telegram pairing-code message error:",
                error.message
              );
            }
          },

        onConnected:
          async () => {
            try {
              await sendMessage(
                chatId,
                buildConnected()
              );
            } catch (error) {
              console.error(
                "Telegram connected message error:",
                error.message
              );
            }
          },

        onDisconnected:
          async reason => {
            try {
              if (
                Number(reason) === 428
              ) {
                await sendMessage(
                  chatId,
                  buildReconnecting()
                );

                return;
              }

              await sendMessage(
                chatId,
                tgPanel(
                  "WHATSAPP DISCONNECTED",
                  [
                    "Status : DISCONNECTED",
                    "Socket : INACTIVE",
                    `Reason : ${
                      reason ||
                      "Unknown"
                    }`
                  ]
                )
              );
            } catch (error) {
              console.error(
                "Telegram disconnect message error:",
                error.message
              );
            }
          },

        onFailed:
          async error => {
            try {
              await sendMessage(
                chatId,
                buildError(
                  `Pairing failed: ${
                    error?.message ||
                    error ||
                    "Unknown error"
                  }`
                )
              );
            } catch (sendError) {
              console.error(
                "Telegram pairing-failed message error:",
                sendError.message
              );
            }
          }
      }
    );
  } catch (error) {
    clearTelegramSession(
      telegramId
    );

    await sendMessage(
      chatId,
      buildError(
        `Unable to start pairing: ${
          error?.message ||
          error ||
          "Unknown error"
        }`
      )
    );
  }
}

async function disconnectUser(
  chatId,
  telegramId
) {
  const sessionId =
    getTelegramSession(
      telegramId
    );

  if (!sessionId) {
    await sendMessage(
      chatId,
      tgPanel(
        "WHATSAPP SESSION",
        [
          "No WhatsApp session is connected."
        ]
      )
    );

    return;
  }

  const socket =
    getActiveSocket(
      sessionId
    );

  if (socket) {
    try {
      await socket.logout();
    } catch {}
  }

  await updateSession(
    sessionId,
    {
      status: "logged_out",
      socketActive: false,
      disconnectedAt:
        new Date().toISOString(),
      disconnectReason:
        "telegram_disconnect"
    }
  );

  clearTelegramSession(
    telegramId
  );

  await sendMessage(
    chatId,
    buildDisconnected()
  );
}

export async function startTelegramBot() {
  if (
    !process.env.TELEGRAM_BOT_TOKEN
  ) {
    console.log(
      "Telegram bot disabled: TELEGRAM_BOT_TOKEN is not set."
    );

    return;
  }

  console.log(
    "☄️ AURELIAN Telegram gateway starting..."
  );

  let offset = 0;

  while (true) {
    try {
      const updates =
        await telegram(
          "getUpdates",
          {
            offset,
            timeout: 25,
            allowed_updates: [
              "message"
            ]
          }
        );

      for (
        const update of updates
      ) {
        offset =
          update.update_id + 1;

        const message =
          update.message;

        if (
          !message?.chat?.id
        ) {
          continue;
        }

        const chatId =
          message.chat.id;

        const telegramId =
          message.from?.id;

        if (
          telegramId == null
        ) {
          continue;
        }

        const text =
          String(
            message.text || ""
          ).trim();

        if (!text) {
          continue;
        }

        const waiting =
          waitingForPhone.has(
            String(telegramId)
          );

        /*
         * If an old-style waiting state
         * exists and the user sends only
         * a phone number, still support it.
         */
        if (
          waiting &&
          !text.startsWith("/")
        ) {
          await handlePhone(
            chatId,
            telegramId,
            text
          );

          continue;
        }

        const command =
          text
            .split(/\s+/)[0]
            .toLowerCase();

        /*
         * START
         */
        if (
          command === "/start"
        ) {
          const profilePath =
            new URL(
              "../assets/profile/aurelian.png",
              import.meta.url
            );

          await sendPhoto(
            chatId,
            profilePath,
            buildWelcome()
          );

          continue;
        }

        /*
         * HELP
         */
        if (
          command === "/help"
        ) {
          await sendMessage(
            chatId,
            buildHelp()
          );

          continue;
        }

        /*
         * PAIR
         *
         * /pair 2348127985137
         *
         * The number is extracted
         * directly from the command.
         */
        if (
          command === "/pair"
        ) {
          const phone =
            text
              .replace(
                /^\/pair\s*/i,
                ""
              )
              .replace(
                /[^\d]/g,
                ""
              )
              .trim();

          await startPairing(
            chatId,
            telegramId,
            phone
          );

          continue;
        }

        /*
         * STATUS
         */
        if (
          command === "/status"
        ) {
          const sessionId =
            getTelegramSession(
              telegramId
            );

          const session =
            sessionId
              ? getPairingSession(
                  sessionId
                )
              : null;

          await sendMessage(
            chatId,
            buildStatus(
              session
            )
          );

          continue;
        }

        /*
         * DISCONNECT
         */
        if (
          command === "/disconnect"
        ) {
          await disconnectUser(
            chatId,
            telegramId
          );

          continue;
        }

        /*
         * UNKNOWN
         */
        await sendMessage(
          chatId,
          tgPanel(
            "UNKNOWN COMMAND",
            [
              "Command not recognized.",
              "Use /help to view available commands."
            ]
          )
        );
      }
    } catch (error) {
      console.error(
        "Telegram gateway error:",
        error.message
      );

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            5000
          )
      );
    }
  }
}
