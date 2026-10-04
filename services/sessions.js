import fs from "fs";
import path from "path";
import { SESSIONS_DIR } from "./config.js";
import { getSessions, saveSessions } from "./storage.js";

function ensureSessionsDir() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function cleanId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getSessionPath(sessionId) {
  ensureSessionsDir();

  const id = cleanId(sessionId);

  if (!id) {
    throw new Error("Session ID is required.");
  }

  return path.join(SESSIONS_DIR, id);
}

export function sessionExists(sessionId) {
  return fs.existsSync(getSessionPath(sessionId));
}

export function createSession(sessionId, metadata = {}) {
  const id = cleanId(sessionId);

  if (!id) {
    throw new Error("Invalid session ID.");
  }

  const sessionPath = getSessionPath(id);

  fs.mkdirSync(sessionPath, { recursive: true });

  const sessions = getSessions();

  sessions[id] = {
    id,
    path: sessionPath,
    status: metadata.status || "created",
    phone: metadata.phone || null,
    name: metadata.name || null,
    createdAt: sessions[id]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveSessions(sessions);

  return sessions[id];
}

function normalizeSession(session) {
  if (!session?.id) return session;

  return {
    ...session,
    id: cleanId(session.id),
    path: getSessionPath(session.id)
  };
}

function normalizeStoredSessions(sessions) {
  let changed = false;
  const normalized = {};

  for (const [key, value] of Object.entries(sessions || {})) {
    if (!value?.id) {
      normalized[key] = value;
      continue;
    }

    const session = normalizeSession(value);

    if (value.path !== session.path) {
      changed = true;
    }

    normalized[session.id] = session;
  }

  if (changed) {
    saveSessions(normalized);
  }

  return normalized;
}

export function getSession(sessionId) {
  const id = cleanId(sessionId);
  const sessions = normalizeStoredSessions(getSessions());

  return sessions[id] || null;
}

export function listSessions() {
  const sessions = normalizeStoredSessions(getSessions());
  return Object.values(sessions);
}

export function updateSession(sessionId, updates = {}) {
  const id = cleanId(sessionId);
  const sessions = normalizeStoredSessions(getSessions());

  if (!sessions[id]) {
    throw new Error(`Session "${id}" does not exist.`);
  }

  sessions[id] = {
    ...sessions[id],
    ...updates,
    id,
    path: getSessionPath(id),
    updatedAt: new Date().toISOString()
  };

  saveSessions(sessions);

  return sessions[id];
}

export function removeSession(sessionId) {
  const id = cleanId(sessionId);
  const sessions = getSessions();
  const sessionPath = getSessionPath(id);

  if (!sessions[id] && !fs.existsSync(sessionPath)) {
    return false;
  }

  delete sessions[id];
  saveSessions(sessions);

  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, {
      recursive: true,
      force: true
    });
  }

  return true;
}

export function getSessionStatus(sessionId) {
  const session = getSession(sessionId);

  if (!session) {
    return {
      exists: false,
      status: "not_found"
    };
  }

  return {
    exists: true,
    id: session.id,
    status: session.status,
    phone: session.phone,
    name: session.name,
    path: session.path,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

export function getSessionServiceStatus() {
  ensureSessionsDir();

  return {
    enabled: true,
    multiSession: true,
    sessionsDirectory: SESSIONS_DIR,
    sessionCount: listSessions().length
  };
}
