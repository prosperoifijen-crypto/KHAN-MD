import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
import { DOWNLOAD_DIR } from "./config.js";

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanName(name = "mediafire") {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "mediafire";
}

export function isMediaFireUrl(url) {
  try {
    const parsed = new URL(String(url).trim());

    return (
      parsed.protocol === "https:" &&
      (
        parsed.hostname === "mediafire.com" ||
        parsed.hostname.endsWith(".mediafire.com")
      )
    );
  } catch {
    return false;
  }
}

export async function getMediaFireInfo(url) {
  if (!isMediaFireUrl(url)) {
    throw new Error("Please provide a valid MediaFire URL.");
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
  } catch (error) {
    throw new Error(
      String(error?.message || error || "MediaFire information lookup failed.")
        .replace(/^ERROR:\s*/i, "")
        .trim()
    );
  }
}

export async function downloadMediaFire(url) {
  if (!isMediaFireUrl(url)) {
    throw new Error("Please provide a valid MediaFire URL.");
  }

  const info = await getMediaFireInfo(url);

  const title = cleanName(
    info.title ||
    info.filename ||
    `mediafire_${Date.now()}`
  );

  const extension = info.ext || "bin";
  const output = path.join(
    DOWNLOAD_DIR,
    `${title}.${extension}`
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
      String(error?.message || error || "MediaFire download failed.")
        .replace(/^ERROR:\s*/i, "")
        .trim()
    );
  }

  if (!fs.existsSync(output)) {
    throw new Error(
      "MediaFire download finished without producing a file."
    );
  }

  const size = fs.statSync(output).size;

  if (!size) {
    try {
      fs.unlinkSync(output);
    } catch {}

    throw new Error("MediaFire produced an empty file.");
  }

  return {
    type: "file",
    title: info.title || title,
    path: output,
    size,
    extension
  };
}

export default {
  isMediaFireUrl,
  getMediaFireInfo,
  downloadMediaFire
};
