import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
import { DOWNLOAD_DIR } from "./config.js";

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanName(name = "instagram") {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "instagram";
}

export function isInstagramUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "instagram.com" ||
      parsed.hostname.endsWith(".instagram.com")
    );
  } catch {
    return false;
  }
}

export async function getInstagramInfo(url) {
  if (!isInstagramUrl(url)) {
    throw new Error("Please provide a valid Instagram URL.");
  }

  return ytDlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    skipDownload: true
  });
}

export async function downloadInstagram(url) {
  const info = await getInstagramInfo(url);

  const title = cleanName(
    info.title ||
    info.description ||
    `instagram_${Date.now()}`
  );

  const output = path.join(DOWNLOAD_DIR, `${title}.mp4`);

  await ytDlp(url, {
    format:
      "bestvideo[height<=720]+bestaudio/" +
      "best[height<=720]/best",

    mergeOutputFormat: "mp4",
    output,

    noWarnings: true,
    noCheckCertificates: true,

    retries: 10,
    fragmentRetries: 10,
    extractorRetries: 5,
    socketTimeout: 30,

    concurrentFragments: 1,
    continue: true
  });

  return {
    type: "video",
    title: info.title || title,
    path: output,
    thumbnail: info.thumbnail || null,
    duration: info.duration || null
  };
}
