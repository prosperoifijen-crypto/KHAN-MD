import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
import { DOWNLOAD_DIR } from "./config.js";

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanName(name = "media") {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "media";
}

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export async function getVideoInfo(url) {
  if (!url || !isValidUrl(url)) {
    throw new Error("A valid media URL is required.");
  }

  return ytDlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    skipDownload: true
  });
}

export async function downloadAudio(url) {
  const info = await getVideoInfo(url);

  const title = cleanName(info.title);
  const output = path.join(DOWNLOAD_DIR, `${title}.mp3`);

  await ytDlp(url, {
    extractAudio: true,
    audioFormat: "mp3",
    audioQuality: "128K",
    output,

    noWarnings: true,
    noCheckCertificates: true,

    retries: 10,
    fragmentRetries: 10,
    extractorRetries: 5,
    socketTimeout: 30,

    continue: true
  });

  return {
    type: "audio",
    title: info.title || title,
    path: output
  };
}

export async function downloadVideo(url) {
  const info = await getVideoInfo(url);

  const title = cleanName(info.title);
  const output = path.join(DOWNLOAD_DIR, `${title}.mp4`);

  await ytDlp(url, {
    /*
     * Prefer separate MP4 video + M4A audio.
     * This works when YouTube does not provide
     * a suitable progressive MP4 file.
     */
    format:
      "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/" +
      "bestvideo[height<=360]+bestaudio/" +
      "best[height<=360][ext=mp4]/" +
      "best[height<=360]/best",

    mergeOutputFormat: "mp4",
    output,

    noWarnings: true,
    noCheckCertificates: true,

    // Network reliability
    retries: 10,
    fragmentRetries: 10,
    extractorRetries: 5,
    socketTimeout: 30,
    concurrentFragments: 1,

    // Resume interrupted downloads
    continue: true,

    // Keep individual downloads from becoming excessive
    maxFilesize: "100M"
  });

  return {
    type: "video",
    title: info.title || title,
    path: output
  };
}
