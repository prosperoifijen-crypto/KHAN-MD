import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import P from "pino";

const { state, saveCreds } = await useMultiFileAuthState("auth");

const sock = makeWASocket({
  auth: state,
  logger: P({ level: "silent" }),
  printQRInTerminal: false
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
  if (connection === "open") {
    console.log("☠️ THE REAPER HAS AWAKENED 🩸");
  }

  if (connection === "close") {
    const code = lastDisconnect?.error?.output?.statusCode;

    if (code !== DisconnectReason.loggedOut) {
      console.log("🔄 Reaper reconnecting...");
      setTimeout(() => process.exit(1), 3000);
    } else {
      console.log("❌ WhatsApp session logged out.");
    }
  }
});

sock.ev.on("messages.upsert", async ({ messages }) => {
  const msg = messages[0];
  if (!msg?.message || msg.key.fromMe) return;

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    "";

  if (text.toLowerCase() === ".reaper") {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "☠️ *THE REAPER* 🩸\n\nThe darkness has awakened.\n\n_I don't chase death. Death knows where to find me._"
    });
  }

  if (text.toLowerCase() === ".menu") {
    await sock.sendMessage(msg.key.remoteJid, {
      text:
        "☠️ *THE REAPER* 🩸\n\n" +
        "• .reaper — Reaper status\n" +
        "• .profile — Reaper profile\n" +
        "• .menu — Command menu\n\n" +
        "⚔️ THE REAPER HAS AWAKENED."
    });
  }

  if (text.toLowerCase() === ".profile") {
    await sock.sendMessage(msg.key.remoteJid, {
      text:
        "☠️ *THE REAPER — PROFILE*\n\n" +
        "Alias: The Ripper\n" +
        "Nature: Immortal Vampire\n" +
        "Age: Unknown\n" +
        "Status: Awakened\n" +
        "Power: Blood & Darkness\n" +
        "Weapon: Reaper's Shadow\n" +
        "Rank: The First Reaper\n" +
        "Weakness: His own hunger"
    });
  }
});
