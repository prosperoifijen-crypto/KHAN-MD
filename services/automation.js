import fs from "fs";
import path from "path";
import { CONFIG_DIR } from "./config.js";

const SETTINGS_FILE = path.join(CONFIG_DIR, "settings.json");

const DEFAULT_AUTOMATION = {
  autoread: false,
  autotyping: false,
  autorecording: false,
  autoview: false,
  autostatus: false,
  autobio: false,
  autolike: false
};

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(settings, null, 2)
  );
}

function ensureAutomation(settings) {
  if (!settings.automation) {
    settings.automation = { ...DEFAULT_AUTOMATION };
  }

  for (const key of Object.keys(DEFAULT_AUTOMATION)) {
    if (typeof settings.automation[key] !== "boolean") {
      settings.automation[key] = DEFAULT_AUTOMATION[key];
    }
  }

  return settings;
}

export function getAutomation() {
  const settings = ensureAutomation(loadSettings());
  saveSettings(settings);
  return settings.automation;
}

export function setAutomation(type, enabled) {
  if (!Object.hasOwn(DEFAULT_AUTOMATION, type)) {
    throw new Error(`Unknown automation: ${type}`);
  }

  const settings = ensureAutomation(loadSettings());

  settings.automation[type] = Boolean(enabled);

  saveSettings(settings);

  return settings.automation;
}

export function isAutomationEnabled(type) {
  return Boolean(getAutomation()[type]);
}

export function resetAutomation() {
  const settings = ensureAutomation(loadSettings());

  settings.automation = { ...DEFAULT_AUTOMATION };

  saveSettings(settings);

  return settings.automation;
}

export function getAutomationStatus() {
  const automation = getAutomation();

  const labels = {
    autoread: "👁️ Auto Read",
    autotyping: "⌨️ Auto Typing",
    autorecording: "🎙️ Auto Recording",
    autoview: "👀 Auto View Status",
    autostatus: "📡 Auto Status",
    autobio: "📝 Auto Bio",
    autolike: "❤️ Auto Like Status"
  };

  const lines = Object.entries(automation)
    .map(([key, enabled]) =>
      `> ${labels[key] || key}: ${enabled ? "🟢 ON" : "🔴 OFF"}`
    )
    .join("\n");

  return `> ╭━━━〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗔𝗨𝗧𝗢𝗠𝗔𝗧𝗜𝗢𝗡 𖣔 〕━━━╮
> ┃𖣔│𓁹 Automation Control
> ╰━━━━━━━━━━━━━━━━━━━━╯
${lines}
>
> ☠️ AURELIAN • THE PRIMORDIAL LORD`;
}

export default {
  getAutomation,
  setAutomation,
  isAutomationEnabled,
  resetAutomation,
  getAutomationStatus
};
