import { getGroups, saveGroups } from "./storage.js";

const DEFAULT_PROTECTION = {
  antihijack: false,
  antipromote: false,
  antidemote: false,
  antilink: false,
  antispam: false,
  antibot: false,
  antitag: false,
  antiraid: false
};

function ensureGroup(groupId) {
  const groups = getGroups();

  if (!groups[groupId]) {
    groups[groupId] = {
      id: groupId,
      protection: { ...DEFAULT_PROTECTION }
    };
  }

  if (!groups[groupId].protection) {
    groups[groupId].protection = { ...DEFAULT_PROTECTION };
  }

  for (const key of Object.keys(DEFAULT_PROTECTION)) {
    if (typeof groups[groupId].protection[key] !== "boolean") {
      groups[groupId].protection[key] = DEFAULT_PROTECTION[key];
    }
  }

  saveGroups(groups);

  return groups;
}

export function getProtection(groupId) {
  const groups = ensureGroup(groupId);
  return groups[groupId].protection;
}

export function setProtection(groupId, type, enabled) {
  if (!Object.hasOwn(DEFAULT_PROTECTION, type)) {
    throw new Error(`Unknown protection: ${type}`);
  }

  const groups = ensureGroup(groupId);

  groups[groupId].protection[type] = Boolean(enabled);

  saveGroups(groups);

  return groups[groupId].protection;
}

export function isProtectionEnabled(groupId, type) {
  const protection = getProtection(groupId);
  return Boolean(protection[type]);
}

export function getProtectionStatus(groupId) {
  const protection = getProtection(groupId);

  const labels = {
    antihijack: "🦇 Anti-Hijack",
    antipromote: "👑 Anti-Promote",
    antidemote: "🌑 Anti-Demote",
    antilink: "🔗 Anti-Link",
    antispam: "⚡ Anti-Spam",
    antibot: "🤖 Anti-Bot",
    antitag: "🏷️ Anti-Tag",
    antiraid: "🛡️ Anti-Raid"
  };

  const lines = Object.entries(protection)
    .map(([key, enabled]) =>
      `> ${labels[key] || key}: ${enabled ? "🟢 ON" : "🔴 OFF"}`
    )
    .join("\n");

  return `> ╭━━━〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗣𝗥𝗢𝗧𝗘𝗖𝗧𝗜𝗢𝗡 𖣔 〕━━━╮
> ┃𖣔│𓁹 Group Protection Status
> ╰━━━━━━━━━━━━━━━━━━━━╯
${lines}
>
> ☠️ AURELIAN • THE PRIMORDIAL LORD`;
}

export function resetProtection(groupId) {
  const groups = ensureGroup(groupId);

  groups[groupId].protection = { ...DEFAULT_PROTECTION };

  saveGroups(groups);

  return groups[groupId].protection;
}

export default {
  getProtection,
  setProtection,
  isProtectionEnabled,
  getProtectionStatus,
  resetProtection
};
