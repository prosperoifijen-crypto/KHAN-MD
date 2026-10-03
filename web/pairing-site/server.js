import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  startPairing,
  getPairingStatus,
  getPairingEngineStatus
} from "../../services/pairing-engine.js";

import {
  reconnectSavedSessions
} from "../../services/session-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PAIRING_PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    service: "PRIMORDIAL LORD PAIRING SITE",
    status: "online",
    engine: getPairingEngineStatus()
  });
});

app.post("/api/pair", async (req, res) => {
  try {
    const phone = String(req.body?.phone || "").trim();
    const name = String(req.body?.name || "").trim() || null;

    if (!phone) {
      return res.status(400).json({
        ok: false,
        error: "WhatsApp number is required."
      });
    }

    const result = await startPairing({
      phone,
      name
    });

    return res.json({
      ok: true,
      sessionId: result.sessionId,
      phone: result.phone,
      code: result.code,
      status: result.status
    });

  } catch (error) {
    console.error("PAIRING ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Pairing request failed."
    });
  }
});

app.get("/api/pair/:sessionId", (req, res) => {
  try {
    const session = getPairingStatus(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Pairing session not found."
      });
    }

    return res.json({
      ok: true,
      session
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Unable to read pairing status."
    });
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log("𖣔 PRIMORDIAL LORD PAIRING SITE");
  console.log(`𓁹 Listening on port ${PORT}`);

  console.log("𓂀 Checking saved WhatsApp sessions...");

  try {
    const results = await reconnectSavedSessions();

    console.log("𓁹 SAVED SESSION RECONNECT RESULT");
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error("SAVED SESSION RECONNECT ERROR:", error);
  }
});
