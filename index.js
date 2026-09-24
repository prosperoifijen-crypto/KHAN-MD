import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import P from "pino";

async function startReaper() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  // Get the current WhatsApp Web version
  let version;

  try {
    const result = await fetchLatestWaWebVersion();

    if (result?.version) {
      version = result.version;
      console.log(
        "🌐 WhatsApp Web version:",
        version.join(".")
      );
    }
  } catch (error) {
    console.log(
      "⚠️ Could not fetch latest WhatsApp Web version."
    );
    console.log(
      "⚠️ Using Baileys default version instead."
    );
  }

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    ...(version ? { version } : {})
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingRequested = false;

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect }) => {

      if (
        connection === "connecting" &&
        !state.creds.registered &&
        !pairingRequested
      ) {
        pairingRequested = true;

        const phoneNumber = process.env.PHONE_NUMBER;

        if (!phoneNumber) {
          console.log("❌ PHONE_NUMBER is not set.");
          return;
        }

        try {
          await new Promise(resolve =>
            setTimeout(resolve, 3000)
          );

          const code = await sock.requestPairingCode(
            phoneNumber.replace(/\D/g, "")
          );

          console.log(
            "☠️ THE REAPER PAIRING CODE:",
            code
          );

          console.log(
            "📱 WhatsApp → Linked Devices → Link a Device → Link with phone number instead"
          );

        } catch (error) {
          console.error(
            "❌ Pairing code error:",
            error
          );

          pairingRequested = false;
        }
      }

      if (connection === "open") {
        console.log(
          "☠️ THE REAPER HAS AWAKENED 🩸"
        );
      }

      if (connection === "close") {
        const code =
          lastDisconnect?.error?.output?.statusCode;

        console.log(
          "❌ Connection closed. Code:",
          code
        );

        if (code !== DisconnectReason.loggedOut) {
          console.log(
            "🔄 Reaper restarting..."
          );

          setTimeout(() => {
            startReaper();
          }, 5000);

        } else {
          console.log(
            "❌ WhatsApp session logged out."
          );
        }
      }
    }
  );

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      const msg = messages[0];

      if (!msg?.message) {
  return;
      } 
        return;
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const command =
        text.toLowerCase().trim();

      if (command === ".reaper") {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              "☠️ *THE REAPER* 🩸\n\n" +
              "The darkness has awakened.\n\n" +
              "_I don't chase death. Death knows where to find me._"
          }
        );
      }

      if (command === ".menu") {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              "☠️ *THE REAPER* 🩸\n\n" +
              "• .reaper — Reaper status\n" +
              "• .profile — Reaper profile\n" +
              "• .menu — Command menu\n\n" +
              "⚔️ THE REAPER HAS AWAKENED."
          }
        );
      }

      if (command === ".profile") {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
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
          }
        );
      }
    }
  );
}

startReaper();
