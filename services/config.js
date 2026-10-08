import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

export const ROOT_DIR = ROOT;
export const CONFIG_DIR = path.join(ROOT, "config");

export const PERSISTENT_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.PERSISTENT_DIR ||
  ROOT;

export const DATA_DIR = path.join(PERSISTENT_DIR, "data");
export const SESSIONS_DIR = path.join(PERSISTENT_DIR, "sessions");
export const AUTH_DIR = path.join(PERSISTENT_DIR, "auth");

export const ASSETS_DIR = path.join(ROOT, "assets");
export const DOWNLOAD_DIR = path.join(ROOT, "downloads");

for (const dir of [
  PERSISTENT_DIR,
  DATA_DIR,
  SESSIONS_DIR,
  AUTH_DIR
]) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveJSONPath(file) {
  const clean = String(file || "").replace(/^[/\\]+/, "");

  if (clean.startsWith("data/")) {
    return path.join(DATA_DIR, clean.slice(5));
  }

  return path.join(ROOT, clean);
}

export function loadJSON(file) {
  const filePath = resolveJSONPath(file);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );
  } catch {
    return {};
  }
}

export function saveJSON(file, data) {
  const filePath = resolveJSONPath(file);

  fs.mkdirSync(
    path.dirname(filePath),
    { recursive: true }
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );
}

export const aurelian = loadJSON("config/aurelian.json");
export const settings = loadJSON("config/settings.json");
export const permissions = loadJSON("config/permissions.json");
export const services = loadJSON("config/services.json");
