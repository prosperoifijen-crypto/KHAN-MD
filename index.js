  code = r'''import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import axios from "axios";
import QRCode from "qrcode";
import googleTTS from "google-tts-api";
import ytSearch from "yt-search";
import ytDlp from "yt-dlp-exec";

const PREFIX = process.env.PREFIX || ".";
const BOT_NAME = "THE REAPER";
const VERSION = "2.0.0";
const OWNER_NUMBER = (process.env.OWNER_NUMBER || "").replace(/\D/g, "");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

const DATA_DIR = path.join(process.cwd(), "data");
const MEDIA_DIR = path.join(DATA_DIR, "media");
const AUTH_DIR = path.join(process.cwd(), "auth_info");

for (const dir of [DATA_DIR, MEDIA_DIR, AUTH_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "reaper.json");

const defaultDB = {
  settings: {
    mode: "public",
    prefix: PREFIX,
    welcome: true,
    goodbye: true,
    commandCooldown: 1500
  },
  users: {},
  groups: {},
  games: {}
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return structuredClone(defaultDB);
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      ...structuredClone(defaultDB),
      ...parsed,
      settings: { ...defaultDB.settings, ...(parsed.settings || {}) },
      users: parsed.users || {},
      groups: parsed.groups || {},
      games: parsed.games || {}
    };
  } catch {
    return structuredClone(defaultDB);
  }
}

let db = loadDB();
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const cooldowns = new Map();

function cleanJid(jid = "") {
  return jid.split(":")[0];
}

function numberFromJid(jid = "") {
  return cleanJid(jid).replace("@s.whatsapp.net", "").replace("@g.us", "");
}

function isOwner(jid = "") {
  const n = numberFromJid(jid);
  return !!OWNER_NUMBER && n === OWNER_NUMBER;
}

function ensureUser(jid, name = "Unknown") {
  const id = cleanJid(jid);
  if (!db.users[id]) {
    db.users[id] = {
      id,
      name,
      xp: 0,
      level: 1,
      coins: 100,
      wins: 0,
      losses: 0,
      power: 10,
      inventory: [],
      achievements: [],
      daily: 0,
      lastDaily: 0,
      lastWork: 0
    };
  }
  db.users[id].name = name || db.users[id].name;
  return db.users[id];
}

function ensureGroup(jid) {
  if (!db.groups[jid]) {
    db.groups[jid] = {
      welcome: true,
      goodbye: true,
      antilink: false,
      antibadword: false,
      antispam: false,
      antiflood: false,
      antitag: false,
      antimention: false,
      warnings: {}
    };
  }
  return db.groups[jid];
}

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function msToTime(ms) {
  let s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  s %= 60;
  return [h, m, s].filter((x, i) => x || i === 2).map((x, i) => i === 0 && h ? `${x}h` : i === 1 && (h || m) ? `${x}m` : `${x}s`).join(" ");
}

function box(title, body = "") {
  return `╭━━━〔 ☠️ ${title} ☠️ 〕━━━╮\n${body}\n╰━━━━━━━━━━━━━━━━━━━━╯`;
}

function ok(title, body) {
  return box(`☠️ ${title}`, `┃ ${body.split("\n").join("\n┃ ")}`);
}

function err(body) {
  return box("REAPER ERROR", `┃ ❌ ${body}`);
}

function info(body) {
  return box("REAPER INFO", `┃ ${body.split("\n").join("\n┃ ")}`);
}

function addXP(user, amount) {
  user.xp += amount;
  let needed = user.level * 100;
  let leveled = false;
  while (user.xp >= needed) {
    user.xp -= needed;
    user.level++;
    user.power += 5;
    needed = user.level * 100;
    leveled = true;
  }
  return leveled;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseArgs(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function getText(msg) {
  return msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";
}

function getContextInfo(msg) {
  return msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    {};
}

function quotedMessage(msg) {
  return getContextInfo(msg)?.quotedMessage || null;
}

function mentionedJids(msg) {
  return getContextInfo(msg)?.mentionedJid || [];
}

function isGroup(jid) {
  return jid?.endsWith("@g.us");
}

async function send(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, { quoted });
}

function commandAllowed(jid, command) {
  const key = `${jid}:${command}`;
  const now = Date.now();
  const last = cooldowns.get(key) || 0;
  const cd = Number(db.settings.commandCooldown || 1500);
  if (now - last < cd) return false;
  cooldowns.set(key, now);
  return true;
}

function menu() {
  return box("THE REAPER", `┃ Version: ${VERSION}
┃ Mode: ${db.settings.mode.toUpperCase()}
┃ Prefix: ${db.settings.prefix}

┃ GENERAL
┃ ${db.settings.prefix}menu  ${db.settings.prefix}ping  ${db.settings.prefix}alive
┃ ${db.settings.prefix}profile  ${db.settings.prefix}help  ${db.settings.prefix}runtime
┃ ${db.settings.prefix}botinfo  ${db.settings.prefix}owner  ${db.settings.prefix}status
┃ ${db.settings.prefix}weather  ${db.settings.prefix}time  ${db.settings.prefix}calc
┃ ${db.settings.prefix}define  ${db.settings.prefix}wiki  ${db.settings.prefix}uuid
┃ ${db.settings.prefix}base64  ${db.settings.prefix}unbase64  ${db.settings.prefix}password

┃ SOUL ECONOMY
┃ ${db.settings.prefix}balance  ${db.settings.prefix}daily  ${db.settings.prefix}work
┃ ${db.settings.prefix}crime  ${db.settings.prefix}rob  ${db.settings.prefix}give
┃ ${db.settings.prefix}shop  ${db.settings.prefix}buy  ${db.settings.prefix}inventory
┃ ${db.settings.prefix}deposit  ${db.settings.prefix}withdraw  ${db.settings.prefix}rich

┃ REAPER BATTLE
┃ ${db.settings.prefix}fight  ${db.settings.prefix}duel  ${db.settings.prefix}battle
┃ ${db.settings.prefix}attack  ${db.settings.prefix}defend  ${db.settings.prefix}heal
┃ ${db.settings.prefix}boss  ${db.settings.prefix}raid  ${db.settings.prefix}arena
┃ ${db.settings.prefix}rank  ${db.settings.prefix}power  ${db.settings.prefix}achievements

┃ GAMES
┃ ${db.settings.prefix}dice  ${db.settings.prefix}rps  ${db.settings.prefix}guess
┃ ${db.settings.prefix}coinflip  ${db.settings.prefix}slots  ${db.settings.prefix}quickmath
┃ ${db.settings.prefix}numberguess  ${db.settings.prefix}trivia  ${db.settings.prefix}hangman
┃ ${db.settings.prefix}tictactoe  ${db.settings.prefix}reaction  ${db.settings.prefix}typing

┃ GROUP
┃ ${db.settings.prefix}groupinfo  ${db.settings.prefix}admins  ${db.settings.prefix}members
┃ ${db.settings.prefix}tagall  ${db.settings.prefix}hidetag  ${db.settings.prefix}tagadmins
┃ ${db.settings.prefix}add  ${db.settings.prefix}kick  ${db.settings.prefix}promote
┃ ${db.settings.prefix}demote  ${db.settings.prefix}warn  ${db.settings.prefix}clearwarn
┃ ${db.settings.prefix}welcome  ${db.settings.prefix}goodbye
┃ ${db.settings.prefix}antilink  ${db.settings.prefix}antispam
┃ ${db.settings.prefix}antiflood  ${db.settings.prefix}antitag

┃ DOWNLOADER
┃ ${db.settings.prefix}play  ${db.settings.prefix}yt  ${db.settings.prefix}ytmp3
┃ ${db.settings.prefix}ytmp4  ${db.settings.prefix}tiktok  ${db.settings.prefix}download

┃ AI
┃ ${db.settings.prefix}ai  ${db.settings.prefix}chat  ${db.settings.prefix}ask

┃ OWNER
┃ ${db.settings.prefix}mode public/private  ${db.settings.prefix}setprefix
┃ ${db.settings.prefix}addcoins  ${db.settings.prefix}addxp  ${db.settings.prefix}botsettings

┃ ━━━ THE REAPER AWAITS ━━━`);
}

function profile(user) {
  const need = user.level * 100;
  const filled = Math.min(10, Math.floor((user.xp / need) * 10));
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return box("SOUL PROFILE", `┃ Name: ${user.name}
┃ Level: ${user.level}
┃ XP: ${user.xp}/${need}
┃ ${bar}
┃ Coins: ${fmt(user.coins)}
┃ Power: ${fmt(user.power)}
┃ Wins: ${user.wins}
┃ Losses: ${user.losses}
┃ Achievements: ${user.achievements.length}`);
}

async function getBotJid(sock) {
  return sock.user?.id || "";
}

async function groupMetadata(sock, jid) {
  try { return await sock.groupMetadata(jid); } catch { return null; }
}

async function isAdmin(sock, jid, userJid) {
  const meta = await groupMetadata(sock, jid);
  if (!meta) return false;
  const member = meta.participants.find(p => cleanJid(p.id) === cleanJid(userJid));
  return !!member?.admin;
}

async function requireGroupAdmin(sock, jid, sender, quoted) {
  if (!isGroup(jid)) {
    await send(sock, jid, err("This command only works in groups."), quoted);
    return false;
  }
  if (!(await isAdmin(sock, jid, sender)) && !isOwner(sender)) {
    await send(sock, jid, err("Group admin permission required."), quoted);
    return false;
  }
  return true;
}

async function requireBotAdmin(sock, jid, quoted) {
  if (!isGroup(jid)) return false;
  const meta = await groupMetadata(sock, jid);
  const bot = meta?.participants?.find(p => cleanJid(p.id) === cleanJid(sock.user?.id));
  if (!bot?.admin) {
    await send(sock, jid, err("I need group-admin permission for that."), quoted);
    return false;
  }
  return true;
}

function targetJids(msg, args = []) {
  const tags = mentionedJids(msg);
  if (tags.length) return tags;
  const nums = args.map(x => x.replace(/\D/g, "")).filter(Boolean);
  return nums.map(n => `${n}@s.whatsapp.net`);
}

async function groupCommand(sock, msg, command, args, sender, jid, quoted) {
  if (!isGroup(jid)) {
    await send(sock, jid, err("Group command only."), quoted);
    return true;
  }
  const g = ensureGroup(jid);

  if (["groupinfo", "members", "membercount", "groupid", "groupjid", "groupname", "groupdesc", "admins"].includes(command)) {
    const meta = await groupMetadata(sock, jid);
    if (!meta) return true;
    if (command === "groupid" || command === "groupjid") return send(sock, jid, info(`Group JID: ${jid}`), quoted);
    if (command === "groupname") return send(sock, jid, info(`Group name: ${meta.subject}`), quoted);
    if (command === "groupdesc") return send(sock, jid, info(`Description:\n${meta.desc || "No description"}`), quoted);
    if (command === "membercount") return send(sock, jid, info(`Members: ${meta.participants.length}`), quoted);
    if (command === "members") return send(sock, jid, info(`Members: ${meta.participants.map((p, i) => `${i + 1}. @${numberFromJid(p.id)}`).join("\n")}`), quoted);
    if (command === "admins") {
      const admins = meta.participants.filter(p => p.admin);
      return sock.sendMessage(jid, { text: info(`Admins: ${admins.length}\n${admins.map(p => `• @${numberFromJid(p.id)}`).join("\n")}`), mentions: admins.map(p => p.id) }, { quoted });
    }
    return send(sock, jid, info(`Name: ${meta.subject}\nMembers: ${meta.participants.length}\nAdmins: ${meta.participants.filter(p => p.admin).length}`), quoted);
  }

  if (["welcome", "goodbye", "antilink", "antibadword", "antispam", "antiflood", "antitag", "antimention"].includes(command)) {
    if (!(await requireGroupAdmin(sock, jid, sender, quoted))) return true;
    const value = args[0]?.toLowerCase();
    if (!["on", "off"].includes(value)) {
      return send(sock, jid, info(`Usage: ${PREFIX}${command} on/off`), quoted);
    }
    const key = command === "welcome" ? "welcome" : command === "goodbye" ? "goodbye" : command;
    g[key] = value === "on";
    saveDB();
    return send(sock, jid, ok("SECURITY", `${command} is now ${value.toUpperCase()}.`), quoted);
  }

  if (["tagall", "hidetag", "tagadmins"].includes(command)) {
    if (!(await requireGroupAdmin(sock, jid, sender, quoted))) return true;
    const meta = await groupMetadata(sock, jid);
    if (!meta) return true;
    let targets = meta.participants.map(p => p.id);
    if (command === "tagadmins") targets = meta.participants.filter(p => p.admin).map(p => p.id);
    const text = args.join(" ") || "THE REAPER has summoned you.";
    return sock.sendMessage(jid, { text: `${text}\n\n${targets.map(x => `@${numberFromJid(x)}`).join(" ")}`, mentions: targets }, { quoted });
  }

  if (["add", "kick", "remove", "promote", "demote"].includes(command)) {
    if (!(await requireGroupAdmin(sock, jid, sender, quoted))) return true;
    if (!(await requireBotAdmin(sock, jid, quoted))) return true;
    const targets = targetJids(msg, args);
    if (!targets.length) return send(sock, jid, info(`Tag a user or provide a number.\nExample: ${PREFIX}${command} @user`), quoted);
    const action = command === "remove" || command === "kick" ? "remove" : command;
    try {
      await sock.groupParticipantsUpdate(jid, targets, action);
      return send(sock, jid, ok("GROUP", `${command} completed.`), quoted);
    } catch (e) {
      return send(sock, jid, err(e.message || "Group action failed."), quoted);
    }
  }

  if (["setgroupname", "setgroupdesc"].includes(command)) {
    if (!(await requireGroupAdmin(sock, jid, sender, quoted))) return true;
    if (!(await requireBotAdmin(sock, jid, quoted))) return true;
    const value = args.join(" ").trim();
    if (!value) return send(sock, jid, info(`Usage: ${PREFIX}${command} <text>`), quoted);
    try {
      if (command === "setgroupname") await sock.groupUpdateSubject(jid, value);
      else await sock.groupUpdateDescription(jid, value);
      return send(sock, jid, ok("GROUP", "Updated successfully."), quoted);
    } catch (e) {
      return send(sock, jid, err(e.message || "Update failed."), quoted);
    }
  }

  if (["warn", "warnings", "clearwarn"].includes(command)) {
    if (!(await requireGroupAdmin(sock, jid, sender, quoted))) return true;
    const targets = targetJids(msg, args);
    const target = targets[0] || sender;
    g.warnings[target] = g.warnings[target] || 0;
    if (command === "warn") g.warnings[target]++;
    if (command === "clearwarn") g.warnings[target] = 0;
    saveDB();
    return send(sock, jid, info(`@${numberFromJid(target)} warnings: ${g.warnings[target]}`), quoted);
  }

  return false;
}

async function aiReply(prompt) {
  if (!OPENROUTER_API_KEY) return "AI is not configured. Add OPENROUTER_API_KEY in Railway Variables.";
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: `You are THE REAPER, a helpful WhatsApp assistant with a dark cyber-gothic personality. Be concise, natural and useful. Do not claim to be human.`
        },
        { role: "user", content: prompt }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://railway.app",
        "X-Title": BOT_NAME
      },
      timeout: 30000
    }
  );
  return response.data?.choices?.[0]?.message?.content?.trim() || "The Reaper has no answer right now.";
}

async function downloadQuotedMedia(msg) {
  const q = quotedMessage(msg);
  if (!q) return null;
  const type = Object.keys(q)[0];
  const media = q[type];
  if (!media || !["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"].includes(type)) return null;
  const stream = await downloadContentFromMessage(media, type.replace("Message", ""));
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { buffer: Buffer.concat(chunks), type, media };
}

async function downloader(sock, jid, msg, command, args, quoted) {
  const query = args.join(" ").trim();
  if (!query) return send(sock, jid, info(`Usage: ${PREFIX}${command} <search or URL>`), quoted);

  let url = query;
  try {
    if (!/^https?:\/\//i.test(query)) {
      const results = await ytSearch(query);
      const first = results.videos?.[0];
      if (!first) return send(sock, jid, err("No result found."), quoted);
      url = first.url;
    }

    const base = path.join(MEDIA_DIR, `${crypto.randomUUID()}`);
    const audio = ["play", "ytmp3", "music", "song"].includes(command);
    const output = `${base}.%(ext)s`;

    await ytDlp(url, {
      output,
      noPlaylist: true,
      ...(audio ? { extractAudio: true, audioFormat: "mp3" } : { format: "mp4/best" })
    });

    const files = fs.readdirSync(MEDIA_DIR)
      .filter(f => f.startsWith(path.basename(base) + "."))
      .map(f => path.join(MEDIA_DIR, f));

    if (!files.length) return send(sock, jid, err("Download failed."), quoted);

    const file = files[0];
    const stat = fs.statSync(file);
    if (stat.size > 50 * 1024 * 1024) {
      fs.unlinkSync(file);
      return send(sock, jid, err("Downloaded file is larger than 50 MB."), quoted);
    }

    const data = fs.readFileSync(file);
    if (audio) await sock.sendMessage(jid, { audio: data, mimetype: "audio/mpeg" }, { quoted });
    else await sock.sendMessage(jid, { video: data, mimetype: "video/mp4" }, { quoted });
    fs.unlinkSync(file);
  } catch (e) {
    for (const f of fs.readdirSync(MEDIA_DIR)) {
      if (f.includes(path.basename(url).slice(0, 8))) {
        try { fs.unlinkSync(path.join(MEDIA_DIR, f)); } catch {}
      }
    }
    await send(sock, jid, err(`Downloader failed: ${e.message || "unknown error"}`), quoted);
  }
}

async function game(sock, jid, msg, command, args, user, quoted) {
  if (command === "dice") {
    const roll = random(1, 6);
    addXP(user, 5);
    saveDB();
    return send(sock, jid, ok("DICE", `🎲 You rolled ${roll}.`), quoted);
  }
  if (command === "coinflip") {
    const result = Math.random() < 0.5 ? "HEADS" : "TAILS";
    user.coins += 10;
    addXP(user, 5);
    saveDB();
    return send(sock, jid, ok("COINFLIP", `🪙 ${result}\n+10 coins`), quoted);
  }
  if (command === "rps") {
    const choices = ["rock", "paper", "scissors"];
    const pick = (args[0] || "").toLowerCase();
    if (!choices.includes(pick)) return send(sock, jid, info(`Usage: ${PREFIX}rps rock|paper|scissors`), quoted);
    const bot = choices[random(0, 2)];
    let result = "DRAW";
    if ((pick === "rock" && bot === "scissors") || (pick === "paper" && bot === "rock") || (pick === "scissors" && bot === "paper")) result = "WIN";
    else if (pick !== bot) result = "LOSS";
    if (result === "WIN") { user.wins++; user.coins += 25; }
    if (result === "LOSS") { user.losses++; user.coins = Math.max(0, user.coins - 10); }
    addXP(user, 10);
    saveDB();
    return send(sock, jid, ok("RPS", `You: ${pick}\nReaper: ${bot}\nResult: ${result}`), quoted);
  }
  if (command === "slots") {
    const symbols = ["☠️", "🩸", "🕷️", "🖤", "⚔️", "👁️"];
    const a = symbols[random(0, symbols.length - 1)];
    const b = symbols[random(0, symbols.length - 1)];
    const c = symbols[random(0, symbols.length - 1)];
    const win = a === b && b === c;
    user.coins += win ? 100 : -10;
    user.coins = Math.max(0, user.coins);
    addXP(user, 10);
    saveDB();
    return send(sock, jid, ok("SLOTS", `${a} | ${b} | ${c}\n${win ? "JACKPOT +100" : "-10 coins"}`), quoted);
  }
  if (["guess", "numberguess"].includes(command)) {
    const key = `${jid}:${user.id}:guess`;
    const current = db.games[key];
    if (!current) {
      db.games[key] = { number: random(1, 10), expires: Date.now() + 60000 };
      saveDB();
      return send(sock, jid, ok("NUMBER HUNT", "I chose a number from 1–10.\nYou have 60 seconds.\nUse .guess <number>"), quoted);
    }
    if (Date.now() > current.expires) {
      delete db.games[key];
      saveDB();
      return send(sock, jid, err("Time expired. Start again with .guess"), quoted);
    }
    const n = Number(args[0]);
    if (!Number.isInteger(n)) return send(sock, jid, info("Enter a number from 1 to 10."), quoted);
    if (n === current.number
