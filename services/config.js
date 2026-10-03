import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

export const ROOT_DIR = ROOT;
export const CONFIG_DIR = path.join(ROOT, "config");
export const DATA_DIR = path.join(ROOT, "data");
export const ASSETS_DIR = path.join(ROOT, "assets");
export const DOWNLOAD_DIR = path.join(ROOT, "downloads");
export const SESSIONS_DIR = path.join(ROOT, "sessions");

export function loadJSON(file) {
  const filePath = path.join(ROOT, file);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

export function saveJSON(file, data) {
  const filePath = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const aurelian = loadJSON("config/aurelian.json");
export const settings = loadJSON("config/settings.json");
export const permissions = loadJSON("config/permissions.json");
export const services = loadJSON("config/services.json");
