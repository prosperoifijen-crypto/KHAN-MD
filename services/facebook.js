import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
import { DOWNLOAD_DIR } from "./config.js";

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanName(name = "facebook") {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "facebook";
}

export function isFacebookUrl(url) {
  try {
    const parsed = new URL(String(url).trim());

    return (
      parsed.protocol === "https:" &&
      (
        parsed.hostname === "facebook.com" ||
        parsed.hostname.endsWith(".facebook.com") ||
        parsed.hostname === "fb.watch"
      )
    );
  } catch {
    return false;
  }
}

function normalizeFacebookError(error) {
  const message = String(error?.message || error || "");

  if (
    message.includes("HTTP Error 403") ||
    message.includes("403: Forbidden")
  ) {
    return new Error(
      "Facebook refused access to this video (HTTP 403)."
    );
  }

  if (
    message.includes("Video unavailable") ||
    message.includes("not available") ||
    message.includes("does not exist")
  ) {
    return new Error(
      "This Facebook video is unavailable, deleted, private, or no longer accessible."
    );
  }

  if (
    message.includes("login required") ||
    message.includes("Log in")
  ) {
    return new Error(
      "Facebook requires login or the video is restricted."
    );
  }

  if (
    message.includes("Unable to download webpage") ||
    message.includes("Unable to extract")
  ) {
    return new Error(
      "Facebook could not be accessed or the video information could not be extracted."
    );
  }

  return new Error(
    message.replace(/^ERROR:\s*/i, "").trim() ||
    "Facebook download failed."
  );
}

export async function getFacebookInfo(url) {
  if (!isFacebookUrl(url)) {
    throw new Error("Please provide a valid Facebook video URL.");
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
    throw normalizeFacebookError(error);
  }
}

export async function downloadFacebook(url) {
  if (!isFacebookUrl(url)) {
    throw new Error("Please provide a valid Facebook video URL.");
  }

  const info = await getFacebookInfo(url);

  const title = cleanName(
    info.title ||
    info.description ||
    `facebook_${Date.now()}`
  );

  const output = path.join(
    DOWNLOAD_DIR,
    `${title}.mp4`
  );

  try {
    await ytDlp(url, {
      format:
        "bestvideo[height<=720]+bestaudio/" +
        "best[height<=720]/" +
        "best",

      mergeOutputFormat: "mp4",
      output,

      noWarnings: true,
      noCheckCertificates: true,

      retries: 10,
      fragmentRetries: 10,
      extractorRetries: 5,
      socketTimeout: 30,

      concurrentFragments: 1,
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

    throw normalizeFacebookError(error);
  }

  if (!fs.existsSync(output)) {
    throw new Error(
      "Facebook download finished without producing a video file."
    );
  }

  const fileSize = fs.statSync(output).size;

  if (!fileSize) {
    try {
      fs.unlinkSync(output);
    } catch {}

    throw new Error(
      "Facebook produced an empty video file."
    );
  }

  return {
    type: "video",
    title: info.title || title,
    path: output,
    thumbnail: info.thumbnail || null,
    duration: info.duration || null,
    size: fileSize
  };
}

export default {
  isFacebookUrl,
  getFacebookInfo,
  downloadFacebook
};
