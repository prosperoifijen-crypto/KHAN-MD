import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import P from "pino";

async function startReaper() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingRequested = false;

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

    // Request pairing code only when the socket is connecting
    if (
      connection === "connecting" &&
      !state.creds.registered &&
      !pairingRequested
    ) {
      pairingRequested = true;

      const phoneNumber = process.env.PHONE_NUMBER;

      if (!phoneNumber) {
        console.log("❌ PHONE_NUMBER is not set in Railway Variables.");
        return;
      }

      try {
        const code = await sock.requestPairingCode(
          phoneNumber.replace(/\D/g, "")
        );

        console.log("☠️ THE REAPER PAIRING CODE:", code);
        console.log(
          "📱 WhatsApp → Linked Devices → Link a Device → Link with phone number instead"
        );
      } catch (error) {
        console.error("❌ Pairing code error:", error);
        pairingRequested = false;
      }
    }

    if (connection === "open") {
      console.log("☠️ THE REAPER HAS AWAKENED 🩸");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 Reaper reconnecting...");
        setTimeout(() => startReaper(), 3000);
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
        text:
          "☠️ *THE REAPER* 🩸\n\n" +
          "The darkness has awakened.\n\n" +
          "_I don't chase death. Death knows where to find me._"
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
}

startReaper();
