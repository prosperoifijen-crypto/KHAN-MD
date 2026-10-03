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

    saveGroups(groups);
  }

  return groups;
}

export function getGroup(groupId) {
  const groups = ensureGroup(groupId);
  return groups[groupId];
}

export function updateGroup(groupId, updates = {}) {
  const groups = ensureGroup(groupId);

  groups[groupId] = {
    ...groups[groupId],
    ...updates,
    id: groupId
  };

  saveGroups(groups);

  return groups[groupId];
}

export function setGroupMuted(groupId, muted) {
  return updateGroup(groupId, {
    muted: Boolean(muted)
  });
}

export function setGroupName(groupId, name) {
  return updateGroup(groupId, {
    name: String(name || "").trim()
  });
}

export function setGroupDescription(groupId, description) {
  return updateGroup(groupId, {
    description: String(description || "").trim()
  });
}

export function buildGroupInfo({
  groupId,
  name = "",
  description = "",
  owner = "Unknown",
  memberCount = 0,
  admins = 0
} = {}) {
  return `> ╭━━━〔 𖣔 𝗚𝗥𝗢𝗨𝗣 𝗜𝗡𝗙𝗢 𖣔 〕━━━╮
> ┃𖣔│𓁹 Name: ${name || "Unknown"}
> ┃𖣔│𓁹 ID: ${groupId || "Unknown"}
> ┃𖣔│𓁹 Members: ${memberCount}
> ┃𖣔│𓁹 Admins: ${admins}
> ┃𖣔│𓁹 Owner: ${owner}
> ┃𖣔│𓁹 Description: ${description || "None"}
> ╰━━━━━━━━━━━━━━━━━━━━╯
> ☠️ ${aurelian.botName} • ${aurelian.title}`;
}

function buildMentionLines(participants = [], emoji = "🦇") {
  return participants
    .map(p => p?.id)
    .filter(Boolean)
    .map(jid => `> ${emoji} @${jid.split("@")[0]}`)
    .join("\n");
}

export function buildTagAll(
  participants = [],
  message = "The Primordial Lord summons the realm."
) {
  const mentions = participants
    .map(p => p?.id)
    .filter(Boolean);

  const mentionLines = buildMentionLines(participants, "🦇");

  return {
    text: `> ╭━━━〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗦𝗨𝗠𝗠𝗢𝗡𝗦 𖣔 〕━━━╮
> ┃𖣔│𓁹 ${message}
> ┃𖣔│𓁹 Members summoned: ${mentions.length}
> ╰━━━━━━━━━━━━━━━━━━━━╯
>
${mentionLines}
>
> ☠️ ${aurelian.botName} • ${aurelian.title}`,
    mentions
  };
}

export function buildHideTag(
  participants = [],
  message = "The shadows have summoned the realm."
) {
  const mentions = participants
    .map(p => p?.id)
    .filter(Boolean);

  return {
    text: `> ╭━━━〔 𖣔 𝗛𝗜𝗗𝗗𝗘𝗡 𝗦𝗨𝗠𝗠𝗢𝗡𝗦 𖣔 〕━━━╮
> ┃𖣔│𓁹 ${message}
> ┃𖣔│𓁹 Members summoned: ${mentions.length}
> ╰━━━━━━━━━━━━━━━━━━━━╯
>
> 🕯️ The realm has been silently summoned.
>
> ☠️ ${aurelian.botName} • ${aurelian.title}`,
    mentions
  };
}

export function buildActionMessage({
  action,
  userName = "Member",
  userJid = "",
  emoji = "𖣔",
  message = ""
} = {}) {
  const mention = userJid
    ? `@${userJid.split("@")[0]}`
    : userName;

  const titles = {
    add: "PRIMORDIAL RECRUITMENT",
    kick: "BANISHMENT",
    promote: "ASCENSION",
    demote: "DESCENT",
    mute: "SILENCE",
    unmute: "VOICE RESTORED"
  };

  const descriptions = {
    add: "A new soul has entered the realm.",
    kick: "A soul has been banished from the realm.",
    promote: "A new authority has ascended.",
    demote: "Authority has been withdrawn.",
    mute: "The realm has entered silence.",
    unmute: "The realm may speak once again."
  };

  const title = titles[action] || "PRIMORDIAL ACTION";
  const description = message || descriptions[action] || "The Primordial Lord has acted.";

  return {
    text: `> ╭━━━〔 𖣔 𝗧𝗛𝗘 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗟𝗢𝗥𝗗 𖣔 〕━━━╮
> ┃𖣔│𓁹 ${title}
> ┃𖣔│𓁹 ${description}
>
> ${emoji} ${mention}
>
> ☠️ ${aurelian.botName} • ${aurelian.title}`,
    mentions: userJid ? [userJid] : []
  };
}

export function getGroupList() {
  return Object.values(getGroups());
}

export function registerGroup(groupId, data = {}) {
  return updateGroup(groupId, data);
}

export default {
  getGroup,
  updateGroup,
  setGroupMuted,
  setGroupName,
  setGroupDescription,
  buildGroupInfo,
  buildTagAll,
  buildHideTag,
  buildActionMessage,
  getGroupList,
  registerGroup
};
