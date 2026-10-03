import { getGroups, saveGroups } from "./storage.js";
import { aurelian } from "./config.js";

function ensureGroup(groupId) {
  const groups = getGroups();

  if (!groups[groupId]) {
    groups[groupId] = {
      id: groupId,
      name: "",
      description: "",
      welcome: true,
      goodbye: true,
      muted: false,
      createdAt: new Date().toISOString()
    };
  }

  if (typeof groups[groupId].welcome !== "boolean") {
    groups[groupId].welcome = Boolean(groups[groupId].welcome?.enabled);
  }

  if (typeof groups[groupId].goodbye !== "boolean") {
    groups[groupId].goodbye = Boolean(groups[groupId].goodbye?.enabled);
  }

  saveGroups(groups);
  return groups;
}

export function getWelcomeStatus(groupId) {
  const groups = ensureGroup(groupId);
  const group = groups[groupId];

  return [
    "╭━━━〔 𖣔 𝗚𝗥𝗢𝗨𝗣 𝗚𝗥𝗘𝗘𝗧𝗜𝗡𝗚𝗦 𖣔 〕━━━╮",
    `┃𖣔│𓁹 Welcome: ${group.welcome ? "ON" : "OFF"}`,
    `┃𖣔│𓁹 Goodbye: ${group.goodbye ? "ON" : "OFF"}`,
    "┃𖣔│𓁹 Welcome Image: OFF",
    "┃𖣔│𓁹 Welcome Audio: OFF",
    "┃𖣔│𓁹 Goodbye Image: OFF",
    "┃𖣔│𓁹 Goodbye Audio: OFF",
    "╰━━━━━━━━━━━━━━━━━━━━╯"
  ].join("\n");
}

export function setWelcome(groupId, enabled) {
  const groups = ensureGroup(groupId);

  groups[groupId].welcome = Boolean(enabled);

  saveGroups(groups);

  return groups[groupId];
}

export function setGoodbye(groupId, enabled) {
  const groups = ensureGroup(groupId);

  groups[groupId].goodbye = Boolean(enabled);

  saveGroups(groups);

  return groups[groupId];
}

export function isWelcomeEnabled(groupId) {
  const groups = ensureGroup(groupId);
  return Boolean(groups[groupId].welcome);
}

export function isGoodbyeEnabled(groupId) {
  const groups = ensureGroup(groupId);
  return Boolean(groups[groupId].goodbye);
}

export function buildWelcomeMessage({
  groupName = "The Realm",
  userName = "Member",
  groupId = ""
} = {}) {
  return `> ╭━━━〔 𖣔 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗧𝗛𝗘 𝗥𝗘𝗔𝗟𝗠 𖣔 〕━━━╮
> ┃𖣔│𓁹 Welcome, ${userName}!
> ┃𖣔│𓁹 Realm: ${groupName}
> ┃𖣔│𓁹 Group: ${groupId || "Unknown"}
>
> 🦇 The gates of the Primordial Realm have opened.
> 🕯️ May your presence be worthy of the eternal realm.
>
> ☠️ ${aurelian.botName} • ${aurelian.title}`;

}

export function buildGoodbyeMessage({
  groupName = "The Realm",
  userName = "Member",
  groupId = ""
} = {}) {
  return `> ╭━━━〔 𖣔 𝗚𝗢𝗢𝗗𝗕𝗬𝗘 𝗙𝗥𝗢𝗠 𝗧𝗛𝗘 𝗥𝗘𝗔𝗟𝗠 𖣔 〕━━━╮
> ┃𖣔│𓁹 Farewell, ${userName}.
> ┃𖣔│𓁹 Realm: ${groupName}
> ┃𖣔│𓁹 Group: ${groupId || "Unknown"}
>
> 🕯️ One soul has departed the Primordial Realm.
>
> ☠️ ${aurelian.botName} • ${aurelian.title}`;

}

export default {
  getWelcomeStatus,
  setWelcome,
  setGoodbye,
  isWelcomeEnabled,
  isGoodbyeEnabled,
  buildWelcomeMessage,
  buildGoodbyeMessage
};
