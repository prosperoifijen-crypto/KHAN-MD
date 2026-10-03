import { loadJSON, saveJSON } from "./config.js";

const FILE = "data/telegram-users.json";

export function getTelegramUsers() {
  return loadJSON(FILE);
}

export function getTelegramUser(telegramId) {
  const users = getTelegramUsers();
  return users[String(telegramId)] || null;
}

export function createTelegramUser(telegramId, data = {}) {
  const id = String(telegramId);
  const users = getTelegramUsers();

  users[id] = {
    telegramId: id,
    createdAt:
      users[id]?.createdAt ||
      new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...users[id],
    ...data,
    telegramId: id
  };

  saveJSON(FILE, users);

  return users[id];
}

export function updateTelegramUser(telegramId, updates = {}) {
  return createTelegramUser(
    telegramId,
    updates
  );
}

export function deleteTelegramUser(telegramId) {
  const id = String(telegramId);
  const users = getTelegramUsers();

  if (!users[id]) {
    return false;
  }

  delete users[id];
  saveJSON(FILE, users);

  return true;
}

export function getTelegramUsersList() {
  return Object.values(getTelegramUsers());
}

export function getTelegramUserBySession(sessionId) {
  const users = getTelegramUsers();

  return (
    Object.values(users).find(
      user => user.sessionId === sessionId
    ) || null
  );
}

export function getTelegramUserServiceStatus() {
  return {
    enabled: true,
    userCount: getTelegramUsersList().length
  };
}
