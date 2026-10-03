import fs from "fs";
import path from "path";
import { CONFIG_DIR } from "./config.js";

const SETTINGS_FILE = path.join(CONFIG_DIR, "settings.json");

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {
      prefix: "!",
      mode: "public"
    };
  }
}

function saveSettings(settings) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(settings, null, 2)
  );
}

export function getMode() {
  const settings = loadSettings();
  return settings.mode === "private" ? "private" : "public";
}

export function setMode(mode) {
  mode = String(mode).toLowerCase();

  if (!["public", "private"].includes(mode)) {
    throw new Error("Mode must be public or private.");
  }

  const settings = loadSettings();
  settings.mode = mode;
  saveSettings(settings);

  return mode;
}

export function canRespond({ isOwner = false } = {}) {
  const mode = getMode();

  if (mode === "public") return true;

  return Boolean(isOwner);
}

export function getModeStatus() {
  const mode = getMode();

  return {
    mode,
    description:
      mode === "private"
        ? "Only the authorized owner can use bot commands."
        : "Normal users can use commands according to permissions."
  };
}
