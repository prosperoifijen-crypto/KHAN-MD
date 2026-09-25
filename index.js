import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  downloadContentFromMessage
} from "@whiskeysockets/baileys";

import P from "pino";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import ytDlp from "yt-dlp-exec";
import QRCode from "qrcode";
import googleTTS from "google-tts-api";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   THE REAPER — FINAL CORE
   ========================================================= */

const BOT_NAME = "THE REAPER";
const OWNER_NAME = "Reaper";
const VERSION = "3.0.0";
const DEFAULT_PREFIX = ".";
const DATA_DIR = path.join(__dirname, "data");
const DOWNLOAD_DIR = path.join(__dirname, "downloads");
const AUTH_DIR = path.join(__dirname, "auth");
const ASSET_DIR = path.join(__dirname, "assets");

const DATA_FILE = path.join(DATA_DIR, "users.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const BANNER_FILE = path.join(
  ASSET_DIR,
  "The Reaper Command Menu.png"
);

for (const dir of [
  DATA_DIR,
  DOWNLOAD_DIR,
  AUTH_DIR,
  ASSET_DIR
]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/* =========================================================
   SAFE JSON STORAGE
   ========================================================= */

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;

    const raw = fs.readFileSync(file, "utf8").trim();

    if (!raw) return fallback;

    return JSON.parse(raw);
  } catch (error) {
    console.error(`JSON read error: ${file}`, error.message);
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2),
      "utf8"
    );
    return true;
  } catch (error) {
    console.error(`JSON write error: ${file}`, error.message);
    return false;
  }
}

let users = readJson(DATA_FILE, {});

let settings = readJson(SETTINGS_FILE, {
  prefix: DEFAULT_PREFIX,

  menuImage: true,
  welcome: true,
  goodbye: true,

  mode: "public",

  commandCooldown: 1200,

  protection: {
    antilink: false,
    antibadword: false,
    antispam: false,
    antiflood: false,
    antibot: false,
    antitag: false,
    antimention: false,
    antidelete: false,
    antiedit: false,
    antiviewonce: false,
    antisticker: false,
    anticall: false
  },

  group: {},

  botName: BOT_NAME,

  stats: {
    messages: 0,
    commands: 0,
    startedAt: Date.now()
  }
});

function saveUsers() {
  return writeJson(DATA_FILE, users);
}

function saveSettings() {
  return writeJson(SETTINGS_FILE, settings);
}

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function normalizeNumber(value = "") {
  return String(value).replace(/\D/g, "");
}

function getOwnerNumber() {
  return normalizeNumber(
    process.env.PHONE_NUMBER || ""
  );
}

function getOwnerJid() {
  const number = getOwnerNumber();

  return number
    ? `${number}@s.whatsapp.net`
    : "";
}

function isOwner(jid) {
  if (!jid) return false;

  const number = normalizeNumber(
    String(jid).split("@")[0]
  );

  const owner = getOwnerNumber();

  return Boolean(owner && number === owner);
}

function getPrefix() {
  return typeof settings.prefix === "string" &&
    settings.prefix.length
    ? settings.prefix
    : DEFAULT_PREFIX;
}

function setPrefix(value) {
  if (!value) return false;

  const prefix = String(value).trim();

  if (prefix.length > 3) return false;

  settings.prefix = prefix;

  saveSettings();

  return true;
}

function random(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function formatNumber(number) {
  return Number(number || 0).toLocaleString();
}

function formatUptime(seconds) {
  seconds = Math.floor(seconds);

  const days = Math.floor(seconds / 86400);

  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);

  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);

  const secs = seconds % 60;

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function formatDuration(ms) {
  const seconds = Math.max(
    0,
    Math.floor(ms / 1000)
  );

  const minutes = Math.floor(seconds / 60);

  const remaining = seconds % 60;

  return `${minutes}m ${remaining}s`;
}

/* =========================================================
   REAPER RESPONSE SYSTEM
   ========================================================= */

function reaperBox(title, body = "") {
  return (
    `╔═══〔 🦇 ${title} 〕═══╗\n` +
    `${body}\n` +
    `╚══════════════════════╝`
  );
}

function reaperSuccess(title, body = "") {
  return (
    `🦇 *${title}*\n\n` +
    `${body}\n\n` +
    `☠️ *THE REAPER*`
  );
}

function reaperError(body = "") {
  return (
    `🩸 *REAPER ERROR*\n\n` +
    `${body}\n\n` +
    `☠️ Check the command and try again.`
  );
}

function reaperInfo(title, body = "") {
  return (
    `🦇 *${title}*\n\n` +
    `${body}`
  );
}

function reaperUsage(command, example = "") {
  return (
    `🦇 *COMMAND USAGE*\n\n` +
    `Usage: ${getPrefix()}${command}\n` +
    (example
      ? `Example: ${getPrefix()}${example}`
      : "")
  );
}

/* =========================================================
   USER SYSTEM
   ========================================================= */

function createUser(name = "Soul") {
  return {
    name: name || "Soul",

    xp: 0,
    level: 1,

    coins: 100,

    rank: "New Soul",

    wins: 0,
    losses: 0,

    streak: 0,

    daily: 0,

    inventory: [],

    achievements: [],

    missions: {},

    stats: {
      battles: 0,
      games: 0,
      commands: 0,
      hunts: 0,
      work: 0,
      crimes: 0,
      wins: 0,
      losses: 0
    },

    cooldowns: {},

    lastDaily: 0,
    lastWeekly: 0,
    lastMonthly: 0,
    lastHunt: 0,
    lastWork: 0,
    lastCrime: 0,
    lastRob: 0,

    createdAt: Date.now()
  };
}

function getUser(jid, name = "Soul") {
  if (!jid) {
    return createUser(name);
  }

  if (!users[jid]) {
    users[jid] = createUser(name);
    saveUsers();
  }

  const user = users[jid];

  if (
    name &&
    name !== "Soul" &&
    name !== user.name
  ) {
    user.name = name;
  }

  /* Migration protection for old database */

  user.xp ??= 0;
  user.level ??= 1;
  user.coins ??= 100;
  user.rank ??= "New Soul";
  user.wins ??= 0;
  user.losses ??= 0;
  user.streak ??= 0;
  user.inventory ??= [];
  user.achievements ??= [];
  user.missions ??= {};
  user.stats ??= {};
  user.cooldowns ??= {};

  user.stats.battles ??= 0;
  user.stats.games ??= 0;
  user.stats.commands ??= 0;
  user.stats.hunts ??= 0;
  user.stats.work ??= 0;
  user.stats.crimes ??= 0;
  user.stats.wins ??= 0;
  user.stats.losses ??= 0;

  user.lastDaily ??= 0;
  user.lastWeekly ??= 0;
  user.lastMonthly ??= 0;
  user.lastHunt ??= 0;
  user.lastWork ??= 0;
  user.lastCrime ??= 0;
  user.lastRob ??= 0;

  updateRank(user);

  return user;
}

function neededForLevel(level) {
  return (
    100 +
    Math.max(0, level - 1) * 50
  );
}

function updateRank(user) {
  if (user.level >= 50) {
    user.rank = "Reaper Lord";
  } else if (user.level >= 30) {
    user.rank = "Elite Reaper";
  } else if (user.level >= 20) {
    user.rank = "Reaper";
  } else if (user.level >= 12) {
    user.rank = "Dark Soul";
  } else if (user.level >= 6) {
    user.rank = "Blood Seeker";
  } else {
    user.rank = "New Soul";
  }
}

function addXP(jid, amount, name) {
  const user = getUser(jid, name);

  amount = Math.max(
    0,
    Number(amount) || 0
  );

  user.xp += amount;

  let levelsGained = 0;

  while (
    user.xp >= neededForLevel(user.level)
  ) {
    user.xp -= neededForLevel(user.level);

    user.level++;

    user.coins += 25;

    levelsGained++;
  }

  updateRank(user);

  saveUsers();

  return {
    user,
    levelsGained
  };
}

function addCoins(jid, amount, name) {
  const user = getUser(jid, name);

  user.coins += Number(amount) || 0;

  if (user.coins < 0) {
    user.coins = 0;
  }

  saveUsers();

  return user;
}

function removeCoins(jid, amount, name) {
  const user = getUser(jid, name);

  const value = Math.max(
    0,
    Number(amount) || 0
  );

  if (user.coins < value) {
    return false;
  }

  user.coins -= value;

  saveUsers();

  return true;
}

function addInventoryItem(
  jid,
  item,
  quantity = 1,
  name
) {
  const user = getUser(jid, name);

  const existing = user.inventory.find(
    x => x.name === item
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    user.inventory.push({
      name: item,
      quantity
    });
  }

  saveUsers();

  return user;
}

function removeInventoryItem(
  jid,
  item,
  quantity = 1
) {
  const user = getUser(jid);

  const existing = user.inventory.find(
    x => x.name === item
  );

  if (!existing) return false;

  if (existing.quantity < quantity) {
    return false;
  }

  existing.quantity -= quantity;

  if (existing.quantity <= 0) {
    user.inventory =
      user.inventory.filter(
        x => x.name !== item
      );
  }

  saveUsers();

  return true;
}

/* =========================================================
   MESSAGE HELPERS
   ========================================================= */

function jidFromMessage(msg) {
  return (
    msg?.key?.participant ||
    msg?.key?.remoteJid ||
    ""
  );
}

function getText(msg) {
  const message = msg?.message || {};

  return (
    message.conversation ||

    message.extendedTextMessage?.text ||

    message.imageMessage?.caption ||

    message.videoMessage?.caption ||

    message.documentMessage?.caption ||

    message.buttonsResponseMessage?.selectedButtonId ||

    message.listResponseMessage?.singleSelectReply
      ?.selectedRowId ||

    ""
  ).trim();
}

function getMentionedJids(msg) {
  const contexts = [
    msg?.message?.extendedTextMessage?.contextInfo,
    msg?.message?.imageMessage?.contextInfo,
    msg?.message?.videoMessage?.contextInfo,
    msg?.message?.documentMessage?.contextInfo
  ].filter(Boolean);

  const result = [];

  for (const context of contexts) {
    if (Array.isArray(context.mentionedJid)) {
      result.push(
        ...context.mentionedJid
      );
    }
  }

  return [...new Set(result)];
}

function getQuotedMessage(msg) {
  const contexts = [
    msg?.message?.extendedTextMessage?.contextInfo,
    msg?.message?.imageMessage?.contextInfo,
    msg?.message?.videoMessage?.contextInfo,
    msg?.message?.documentMessage?.contextInfo
  ].filter(Boolean);

  for (const context of contexts) {
    if (context.quotedMessage) {
      return context;
    }
  }

  return null;
}

function getReplyJid(msg) {
  const context = getQuotedMessage(msg);

  return context?.participant || null;
}

function isGroupJid(jid) {
  return Boolean(
    jid &&
    jid.endsWith("@g.us")
  );
}

function isPrivateJid(jid) {
  return Boolean(
    jid &&
    jid.endsWith("@s.whatsapp.net")
  );
}

/* =========================================================
   SEND HELPERS
   ========================================================= */

async function react(
  sock,
  jid,
  key,
  emoji
) {
  try {
    await sock.sendMessage(
      jid,
      {
        react: {
          text: emoji,
          key
        }
      }
    );
  } catch {}
}

async function reply(
  sock,
  jid,
  text,
  msg
) {
  try {
    return await sock.sendMessage(
      jid,
      {
        text: String(text)
      },
      msg
        ? { quoted: msg }
        : undefined
    );
  } catch (error) {
    console.error(
      "Reply error:",
      error.message
    );
  }
}

async function sendImage(
  sock,
  jid,
  image,
  caption = "",
  msg
) {
  try {
    return await sock.sendMessage(
      jid,
      {
        image,
        caption
      },
      msg
        ? { quoted: msg }
        : undefined
    );
  } catch (error) {
    console.error(
      "Image send error:",
      error.message
    );

    return reply(
      sock,
      jid,
      reaperError(
        "The image could not be sent."
      ),
      msg
    );
  }
}

async function sendAudio(
  sock,
  jid,
  audio,
  mimetype = "audio/mpeg",
  ptt = false,
  msg
) {
  try {
    return await sock.sendMessage(
      jid,
      {
        audio,
        mimetype,
        ptt
      },
      msg
        ? { quoted: msg }
        : undefined
    );
  } catch (error) {
    console.error(
      "Audio send error:",
      error.message
    );

    return reply(
      sock,
      jid,
      reaperError(
        "The audio could not be sent."
      ),
      msg
    );
  }
}

/* =========================================================
   GROUP HELPERS
   ========================================================= */

async function getGroupInfo(
  sock,
  jid
) {
  if (!isGroupJid(jid)) {
    return null;
  }

  try {
    return await sock.groupMetadata(jid);
  } catch {
    return null;
  }
}

function findParticipant(
  metadata,
  jid
) {
  return metadata?.participants?.find(
    participant =>
      participant.id === jid
  );
}

function participantIsAdmin(
  metadata,
  jid
) {
  const participant =
    findParticipant(metadata, jid);

  return Boolean(
    participant &&
    (
      participant.admin === "admin" ||
      participant.admin === "superadmin"
    )
  );
}

async function botIsAdmin(
  sock,
  metadata
) {
  const botJid =
    sock.user?.id
      ?.split(":")[0]
      ?.split("@")[0];

  if (!botJid) return false;

  const participant =
    metadata?.participants?.find(
      p =>
        normalizeNumber(
          p.id
        ) === normalizeNumber(
          botJid
        )
    );

  return Boolean(
    participant &&
    (
      participant.admin === "admin" ||
      participant.admin === "superadmin"
    )
  );
}

async function requireGroup(
  sock,
  jid,
  msg
) {
  if (!isGroupJid(jid)) {
    await reply(
      sock,
      jid,
      reaperError(
        "This command only works in a group."
      ),
      msg
    );

    return null;
  }

  const metadata =
    await getGroupInfo(
      sock,
      jid
    );

  if (!metadata) {
    await reply(
      sock,
      jid,
      reaperError(
        "I could not read this group's information."
      ),
      msg
    );

    return null;
  }

  return metadata;
}

async function requireAdmin(
  sock,
  jid,
  sender,
  msg
) {
  const metadata =
    await requireGroup(
      sock,
      jid,
      msg
    );

  if (!metadata) {
    return null;
  }

  if (
    !isOwner(sender) &&
    !participantIsAdmin(
      metadata,
      sender
    )
  ) {
    await reply(
      sock,
      jid,
      reaperError(
        "Admin permission is required."
      ),
      msg
    );

    return null;
  }

  return metadata;
}

async function requireBotAdmin(
  sock,
  jid,
  sender,
  msg
) {
  const metadata =
    await requireAdmin(
      sock,
      jid,
      sender,
      msg
    );

  if (!metadata) {
    return null;
  }

  if (
    !(await botIsAdmin(
      sock,
      metadata
    ))
  ) {
    await reply(
      sock,
      jid,
      reaperError(
        "I need to be a group admin to perform this action."
      ),
      msg
    );

    return null;
  }

  return metadata;
}

/* =========================================================
   MODE SYSTEM
   ========================================================= */

function getBotMode() {
  return settings.mode === "private"
    ? "private"
    : "public";
}

function isPrivateMode() {
  return getBotMode() === "private";
}

function setBotMode(mode) {
  const value =
    String(mode || "")
      .toLowerCase();

  if (
    !["public", "private"]
      .includes(value)
  ) {
    return false;
  }

  settings.mode = value;

  saveSettings();

  return true;
}

function getModeDisplay() {
  return isPrivateMode()
    ? "🔒 PRIVATE"
    : "🌍 PUBLIC";
}

function canUseBot(jid) {
  if (!isPrivateMode()) {
    return true;
  }

  return isOwner(jid);
}

/* =========================================================
   COMMAND COOLDOWNS
   ========================================================= */

const cooldownMap = new Map();

const COOLDOWNS = {
  default: 1200,

  ai: 5000,
  chat: 5000,
  ask: 5000,
  explain: 5000,
  rewrite: 5000,
  summarize: 5000,
  translate: 5000,

  play: 7000,
  yt: 7000,
  ytmp3: 7000,
  ytmp4: 7000,
  tiktok: 7000,
  ig: 7000,
  igdl: 7000,
  facebook: 7000,
  fbdl: 7000,
  twitter: 7000,
  twitterdl: 7000,
  download: 7000,
  dload: 7000,
  aio: 7000,

  fight: 4000,
  duel: 4000,
  battle: 4000,
  attack: 2500,
  defend: 2500,
  heal: 3000,

  dice: 1800,
  slots: 2500,
  roulette: 2500,
  crash: 2500,
  clicker: 1200,
  taprush: 1200,

  daily: 3000,
  claim: 3000,
  hunt: 3000,
  work: 3000,
  crime: 4000,
  rob: 5000
};

function checkCooldown(
  jid,
  command
) {
  const now = Date.now();

  const duration =
    COOLDOWNS[command] ??
    COOLDOWNS.default;

  const key =
    `${jid}:${command}`;

  const previous =
    cooldownMap.get(key) || 0;

  const difference =
    now - previous;

  if (difference < duration) {
    return Math.ceil(
      (duration - difference) /
      1000
    );
  }

  cooldownMap.set(
    key,
    now
  );

  return 0;
}

/* =========================================================
   COMMAND REGISTRY
   ========================================================= */

const COMMANDS = {
  GENERAL: [
    "menu",
    "reaper",
    "ping",
    "alive",
    "botinfo",
    "runtime",
    "owner",
    "repo",
    "support",
    "status",
    "profile",
    "help",
    "commands",
    "uptime",
    "version",
    "prefix",
    "jid",
    "chatid",
    "groupinfo",
    "about",
    "weather",
    "time",
    "define",
    "wiki",
    "calc",
    "shorturl",
    "ip",
    "uuid",
    "base64",
    "unbase64",
    "password"
  ],

  "REAPER SYSTEM": [
    "rank",
    "level",
    "xp",
    "coins",
    "daily",
    "claim",
    "hunt",
    "mission",
    "quest",
    "train",
    "power",
    "blood",
    "soul",
    "shadow",
    "ritual",
    "summon",
    "curse",
    "bless",
    "reaperstats",
    "achievements"
  ],

  BATTLE: [
    "fight",
    "duel",
    "battle",
    "challenge",
    "attack",
    "defend",
    "heal",
    "weapon",
    "armor",
    "skills",
    "powers",
    "boss",
    "raid",
    "arena",
    "war",
    "revenge",
    "streak",
    "damage",
    "battlelog",
    "battlerank"
  ],

  GAMES: [
    "dice",
    "guess",
    "rps",
    "trivia",
    "quiz",
    "blackjack",
    "slots",
    "roulette",
    "coinflip",
    "higherlower",
    "hangman",
    "tictactoe",
    "connect4",
    "snake",
    "memory",
    "typing",
    "reaction",
    "quickmath",
    "numberguess",
    "wordshuffle",
    "sequence",
    "truefalse",
    "colorhunt",
    "luckywheel",
    "casino",
    "crash",
    "clicker",
    "taprush",
    "target",
    "mafia",
    "penalty",
    "rockpaperscissors",
    "gamestats",
    "leaderboard",
    "gamecoins"
  ],

  ECONOMY: [
    "balance",
    "wallet",
    "coins",
    "daily",
    "weekly",
    "monthly",
    "work",
    "crime",
    "rob",
    "give",
    "pay",
    "shop",
    "buy",
    "sell",
    "inventory",
    "item",
    "deposit",
    "withdraw",
    "rich",
    "economy"
  ],

  "GROUP MANAGEMENT": [
    "groupinfo",
    "admins",
    "members",
    "membercount",
    "groupid",
    "groupjid",
    "groupname",
    "groupdesc",
    "setgroupname",
    "setgroupdesc",
    "setgrouppic",
    "getgrouppic",
    "add",
    "remove",
    "kick",
    "promote",
    "demote",
    "warn",
    "warnings",
    "clearwarn",
    "mute",
    "unmute",
    "tagall",
    "hidetag",
    "tagadmins",
    "tagmembers",
    "welcome",
    "goodbye",
    "setwelcome",
   
