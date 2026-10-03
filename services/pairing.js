import crypto from "crypto";
import {
  createSession,
  getSession,
  updateSession,
  sessionExists
} from "./sessions.js";

const PAIRING_STATES = Object.freeze({
  CREATED: "created",
  PAIRING: "pairing",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  FAILED: "failed"
});

export function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[^\d]/g, "");
}

export function isValidPhone(phone) {
  const normalized = normalizePhone(phone);

  return (
    /^\d+$/.test(normalized) &&
    normalized.length >= 8 &&
    normalized.length <= 15 &&
    !/^0+$/.test(normalized)
  );
}

export function generateSessionId(prefix = "session") {
  const cleanPrefix =
    String(prefix || "session")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 32) || "session";

  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(5).toString("hex");

  return `${cleanPrefix}-${timestamp}-${random}`;
}

export function createPairingSession({
  phone,
  name = null,
  sessionId = null
} = {}) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidPhone(normalizedPhone)) {
    throw new Error(
      "Invalid phone number. Use the international number without spaces or symbols."
    );
  }

  const id = sessionId
    ? String(sessionId)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_")
    : generateSessionId();

  if (!id) {
    throw new Error("Unable to generate session ID.");
  }

  if (sessionExists(id)) {
    throw new Error(`Session "${id}" already exists.`);
  }

  return createSession(id, {
    phone: normalizedPhone,
    name: name || null,
    status: PAIRING_STATES.CREATED
  });
}

export function markPairingStarted(sessionId) {
  return updateSession(sessionId, {
    status: PAIRING_STATES.PAIRING,
    pairingStartedAt: new Date().toISOString()
  });
}

export function markConnected(sessionId, metadata = {}) {
  return updateSession(sessionId, {
    status: PAIRING_STATES.CONNECTED,
    connectedAt: new Date().toISOString(),
    ...metadata
  });
}

export function markDisconnected(sessionId, reason = null) {
  return updateSession(sessionId, {
    status: PAIRING_STATES.DISCONNECTED,
    disconnectedAt: new Date().toISOString(),
    disconnectReason: reason || null
  });
}

export function markFailed(sessionId, error = null) {
  return updateSession(sessionId, {
    status: PAIRING_STATES.FAILED,
    failedAt: new Date().toISOString(),
    error: error ? String(error) : null
  });
}

export function getPairingSession(sessionId) {
  const session = getSession(sessionId);

  if (!session) return null;

  return {
    id: session.id,
    status: session.status,
    phone: session.phone,
    name: session.name,
    path: session.path,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    pairingStartedAt: session.pairingStartedAt || null,
    connectedAt: session.connectedAt || null,
    disconnectedAt: session.disconnectedAt || null,
    disconnectReason: session.disconnectReason || null,
    failedAt: session.failedAt || null,
    error: session.error || null
  };
}

export function isPairingActive(sessionId) {
  const session = getSession(sessionId);

  if (!session) return false;

  return [
    PAIRING_STATES.CREATED,
    PAIRING_STATES.PAIRING,
    PAIRING_STATES.CONNECTED
  ].includes(session.status);
}

export function getPairingStates() {
  return { ...PAIRING_STATES };
}

export function getPairingServiceStatus() {
  return {
    enabled: true,
    multiSession: true,
    socketManagedHere: false,
    pairingCodeProvider: "Baileys",
    states: Object.values(PAIRING_STATES)
  };
}
