import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import googleTTS from "google-tts-api";
import QRCode from "qrcode";
import { DOWNLOAD_DIR } from "./config.js";

const execFileAsync = promisify(execFile);

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function cleanName(name = "media") {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "media";
}

function ensureFile(file) {
  if (!file || !fs.existsSync(file)) {
    throw new Error("Media file not found.");
  }

  const stat = fs.statSync(file);

  if (!stat.isFile() || stat.size === 0) {
    throw new Error("Media file is empty or invalid.");
  }
}

async function ffmpeg(input, output, args = []) {
  ensureFile(input);

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i",
      input,
      ...args,
      output
    ],
    {
      maxBuffer: 10 * 1024 * 1024
    }
  );

  ensureFile(output);
  return output;
}

export function isMediaFile(file) {
  try {
    ensureFile(file);
    return true;
  } catch {
    return false;
  }
}

export async function toMp3(input) {
  const output = path.join(
    DOWNLOAD_DIR,
    `${cleanName(path.parse(input).name)}.mp3`
  );

  await ffmpeg(
    input,
    output,
    [
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k"
    ]
  );

  return {
    type: "audio",
    path: output
  };
}

export async function toMp4(input) {
  const output = path.join(
    DOWNLOAD_DIR,
    `${cleanName(path.parse(input).name)}_converted.mp4`
  );

  await ffmpeg(
    input,
    output,
    [
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart"
    ]
  );

  return {
    type: "video",
    path: output
  };
}

export async function toGif(input, fps = 12) {
  const output = path.join(
    DOWNLOAD_DIR,
    `${cleanName(path.parse(input).name)}.gif`
  );

  await ffmpeg(
    input,
    output,
    [
      "-vf",
      `fps=${Number(fps) || 12},scale=480:-1:flags=lanczos`
    ]
  );

  return {
    type: "gif",
    path: output
  };
}

export async function resizeMedia(input, width = 512, height = -1) {
  const output = path.join(
    DOWNLOAD_DIR,
    `${cleanName(path.parse(input).name)}_resized.mp4`
  );

  await ffmpeg(
    input,
    output,
    [
      "-vf",
      `scale=${Number(width) || 512}:${Number(height) === -1 ? "-2" : (Number(height) || 512)}`,
      "-c:a",
      "copy"
    ]
  );

  return {
    type: "video",
    path: output
  };
}

export async function blurMedia(input, strength = 10) {
  const output = path.join(
    DOWNLOAD_DIR,
    `${cleanName(path.parse(input).name)}_blur.mp4`
  );

  const value = Math.max(
    1,
    Math.min(Number(strength) || 10, 50)
  );

  await ffmpeg(
    input,
    output,
    [
      "-vf",
      `boxblur=${value}:1`
    ]
  );

  return {
    type: "video",
    path: output
  };
}

export async function makeQr(text, name = "qr") {
  const clean = String(text || "").trim();

  if (!clean) {
    throw new Error("Please provide text or a URL for the QR code.");
  }

  const output = path.join(
    DOWNLOAD_DIR,
    `${cleanName(name)}.png`
  );

  await QRCode.toFile(output, clean, {
    width: 800,
    margin: 2,
    errorCorrectionLevel: "M"
  });

  ensureFile(output);

  return {
    type: "image",
    path: output,
    text: clean
  };
}

export async function makeTts(text, language = "en") {
  text = String(text || "").trim();

  if (!text) {
    throw new Error("Please provide text for TTS.");
  }

  const url = googleTTS.getAudioUrl(text, {
    lang: language,
    slow: false,
    host: "https://translate.google.com"
  });

  const output = path.join(
    DOWNLOAD_DIR,
    `tts_${Date.now()}.mp3`
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TTS request failed: HTTP ${response.status}`
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  fs.writeFileSync(output, buffer);

  ensureFile(output);

  return {
    type: "audio",
    path: output,
    text,
    language
  };
}

/*
 * REAL WHATSAPP STICKER CONVERSION
 *
 * Supports:
 * JPG
 * JPEG
 * PNG
 * WEBP
 * GIF
 * MP4
 * MOV
 * MKV
 * WEBM
 *
 * Uses the FFmpeg already installed in Termux.
 */
export async function takeSticker(
  input,
  pack = "AURELIAN",
  author = "THE PRIMORDIAL LORD",
  options = {}
) {
  ensureFile(input);

  const ext = path.extname(input).toLowerCase();

  // WebP is already a WhatsApp-compatible sticker format.
  // Do not send animated WebP back through FFmpeg because
  // some Termux FFmpeg WebP decoders cannot read ANIM/ANMF chunks.
  if (ext === ".webp") {
    const name = cleanName(path.parse(input).name);
    const output = path.join(
      DOWNLOAD_DIR,
      `${name}_sticker.webp`
    );

    if (path.resolve(input) !== path.resolve(output)) {
      fs.copyFileSync(input, output);
    }

    ensureFile(output);

    const stat = fs.statSync(output);

    if (stat.size === 0) {
      throw new Error("Generated sticker file is empty.");
    }

    return {
      type: "sticker",
      mimetype: "image/webp",
      path: output,
      size: stat.size,
      animated: true,
      pack,
      author
    };
  }

  const supported = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".mp4",
    ".mov",
    ".mkv",
    ".webm"
  ];

  if (!supported.includes(ext)) {
    throw new Error(
      `Unsupported sticker source: ${ext || "unknown"}`
    );
  }

  const name = cleanName(path.parse(input).name);

  const output = path.join(
    DOWNLOAD_DIR,
    `${name}_sticker.webp`
  );

  const animatedExtensions = [
    ".gif",
    ".mp4",
    ".mov",
    ".mkv",
    ".webm"
  ];

  const animated = animatedExtensions.includes(ext);

  const fps = Math.max(
    5,
    Math.min(Number(options.fps) || 12, 20)
  );

  const duration = Math.max(
    1,
    Math.min(Number(options.duration) || 6, 10)
  );

  /*
   * WhatsApp sticker canvas:
   * 512x512 maximum canvas.
   *
   * force_original_aspect_ratio=decrease
   * keeps the original shape.
   *
   * pad creates the square canvas.
   *
   * rgba/yuva keeps transparency where possible.
   */
  const filter = [
    "scale=512:512:force_original_aspect_ratio=decrease",
    "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0",
    "format=yuva420p"
  ].join(",");

  if (animated) {
    await ffmpeg(
      input,
      output,
      [
        "-t",
        String(duration),
        "-vf",
        filter,
        "-r",
        String(fps),
        "-an",
        "-c:v",
        "libwebp",
        "-lossless",
        "0",
        "-q:v",
        "60",
        "-compression_level",
        "6",
        "-loop",
        "0"
      ]
    );
  } else {
    await ffmpeg(
      input,
      output,
      [
        "-vf",
        filter,
        "-an",
        "-c:v",
        "libwebp",
        "-lossless",
        "0",
        "-q:v",
        "60",
        "-compression_level",
        "6"
      ]
    );
  }

  ensureFile(output);

  const stat = fs.statSync(output);

  if (stat.size === 0) {
    throw new Error(
      "Generated sticker file is empty."
    );
  }

  return {
    type: "sticker",
    mimetype: "image/webp",
    path: output,
    size: stat.size,
    animated,
    pack,
    author
  };
}

export async function imageToMedia(input) {
  ensureFile(input);

  return {
    type: "image",
    path: input
  };
}

export function getMediaStatus() {
  return {
    ffmpeg: true,
    tts: true,
    qr: true,
    sticker: true,
    converters: true
  };
}

export default {
  isMediaFile,
  toMp3,
  toMp4,
  toGif,
  resizeMedia,
  blurMedia,
  makeQr,
  makeTts,
  takeSticker,
  imageToMedia,
  getMediaStatus
};
