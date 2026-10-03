import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
import { DOWNLOAD_DIR } from "./config.js";

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanName(name = "application") {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "application";
}

export function isValidApkUrl(url) {
  try {
    const parsed = new URL(String(url).trim());

    return (
      parsed.protocol === "https:" &&
      ["http:", "https:"].includes(parsed.protocol)
    );
  } catch {
    return false;
  }
}

export async function getApkInfo(url) {
  if (!isValidApkUrl(url)) {
    throw new Error("Please provide a valid APK download URL.");
  }

  try {
    return await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      skipDownload: true,
      retries: 3,
      extractorRetries: 3,
      socketTimeout: 30
    });
  } catch {
    return {
      title: "APK file",
      url
    };
  }
}

export async function downloadApk(url, name = "application") {
  if (!isValidApkUrl(url)) {
    throw new Error("Please provide a valid APK download URL.");
  }

  const safeName = cleanName(name);
  const output = path.join(
    DOWNLOAD_DIR,
    `${safeName}.apk`
  );

  try {
    await ytDlp(url, {
      output,

      noWarnings: true,
      noCheckCertificates: true,

      retries: 10,
      fragmentRetries: 10,
      extractorRetries: 5,
      socketTimeout: 30,

      continue: true,
      noPart: true,
      noOverwrites: false
    });
  } catch (error) {
    if (fs.existsSync(output)) {
      try {
        fs.unlinkSync(output);
      } catch {}
    }

    throw new Error(
      String(error?.message || error || "APK download failed.")
        .replace(/^ERROR:\s*/i, "")
        .trim()
    );
  }

  if (!fs.existsSync(output)) {
    throw new Error(
      "APK download finished without producing a file."
    );
  }

  const size = fs.statSync(output).size;

  if (!size) {
    try {
      fs.unlinkSync(output);
    } catch {}

    throw new Error("APK download produced an empty file.");
  }

  return {
    type: "apk",
    title: safeName,
    path: output,
    size
  };
}

export default {
  isValidApkUrl,
  getApkInfo,
  downloadApk
};
