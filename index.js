import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";

const BOT_NAME = "THE REAPER";
const OWNER_NAME = "Reaper";
const DEFAULT_PREFIX = ".";
const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "users.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const BANNER_FILE = "./assets/reaper-banner.jpg";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let users = readJson(DATA_FILE, {});

let settings = readJson(SETTINGS_FILE, {
  prefix: DEFAULT_PREFIX,
  menuImage: true,
  welcome: true,
  goodbye: true
});

function saveUsers() {
  writeJson(DATA_FILE, users);
}

function saveSettings() {
  writeJson(SETTINGS_FILE, settings);
}

function normalizeNumber(value = "") {
  return String(value).replace(/\D/g, "");
}

function getOwnerNumber() {
  return normalizeNumber(process.env.PHONE_NUMBER || "");
}

function getOwnerJid() {
  const number = getOwnerNumber();
  return number ? `${number}@s.whatsapp.net` : "";
}

function isOwner(jid) {
  return (
    normalizeNumber(jid?.split("@")[0] || "") ===
    getOwnerNumber()
  );
}

function getPrefix() {
  return typeof settings.prefix === "string"
    ? settings.prefix
    : DEFAULT_PREFIX;
}

function getUser(jid, name = "Soul") {
  if (!users[jid]) {
    users[jid] = {
      name,
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
      lastDaily: 0,
      lastHunt: 0
    };
  } else if (name && name !== "Soul") {
    users[jid].name = name;
  }

  return users[jid];
}

function neededForLevel(level) {
  return 100 + Math.max(0, level - 1) * 50;
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

  user.xp += Math.max(0, amount);

  while (user.xp >= neededForLevel(user.level)) {
    user.xp -= neededForLevel(user.level);
    user.level++;
    user.coins += 25;
  }

  updateRank(user);
  saveUsers();

  return user;
}

function jidFromMessage(msg) {
  return msg.key.participant || msg.key.remoteJid;
}

function getText(msg) {
  const m = msg.message || {};

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ""
  ).trim();
}

function getMentionedJids(msg) {
  const m = msg.message?.extendedTextMessage;
  return m?.contextInfo?.mentionedJid || [];
}

function getReplyJid(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    {};

  return (
    ctx.participant ||
    ctx.mentionedJid?.[0] ||
    null
  );
}

async function react(sock, jid, key, emoji) {
  try {
    await sock.sendMessage(jid, {
      react: {
        text: emoji,
        key
      }
    });
  } catch {}
}

async function reply(sock, jid, text, msg) {
  return sock.sendMessage(
    jid,
    { text },
    { quoted: msg }
  );
}

function formatUptime(seconds) {
  seconds = Math.floor(seconds);

  const d = Math.floor(seconds / 86400);
  seconds %= 86400;

  const h = Math.floor(seconds / 3600);
  seconds %= 3600;

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${d}d ${h}h ${m}m ${s}s`;
}

function ownerLink() {
  const n = getOwnerNumber();

  return n
    ? `https://wa.me/${n}`
    : "Owner number is not configured.";
}

const COMMANDS = {
  GENERAL: [
    "menu","reaper","ping","alive","botinfo","runtime","owner",
    "repo","support","status","profile","help","commands","uptime",
    "version","prefix","jid","chatid","groupinfo","about"
  ],

  "REAPER SYSTEM": [
    "rank","level","xp","coins","daily","claim","hunt","mission",
    "quest","train","power","blood","soul","shadow","ritual",
    "summon","curse","bless","reaperstats","achievements"
  ],

  BATTLE: [
    "fight","duel","battle","challenge","attack","defend","heal",
    "weapon","armor","skills","powers","boss","raid","arena",
    "war","revenge","streak","damage","battlelog","battlerank"
  ],

  GAMES: [
    "dice","guess","rps","trivia","quiz","blackjack","slots",
    "roulette","coinflip","higherlower","hangman","tictactoe",
    "connect4","snake","memory","typing","reaction","quickmath",
    "numberguess","wordshuffle","sequence","truefalse","colorhunt",
    "luckywheel","casino","crash","clicker","taprush","target",
    "mafia","penalty","rockpaperscissors","gamestats",
    "leaderboard","gamecoins"
  ],

  ECONOMY: [
    "balance","wallet","coins","daily","weekly","monthly","work",
    "crime","rob","give","pay","shop","buy","sell","inventory",
    "item","deposit","withdraw","rich","economy"
  ],

  "GROUP MANAGEMENT": [
    "groupinfo","admins","members","membercount","groupid",
    "groupjid","groupname","groupdesc","setgroupname",
    "setgroupdesc","setgrouppic","getgrouppic","add","remove",
    "kick","promote","demote","warn","warnings","clearwarn",
    "mute","unmute","tagall","hidetag","tagadmins","tagmembers",
    "welcome","goodbye","setwelcome","setgoodbye","open","close",
    "lock","unlock","invite","revoke","gcstatus","hijack"
  ],

  PROTECTION: [
    "antilink","antibadword","antispam","antiflood","antibot",
    "anticall","antidelete","antiedit","antiviewonce",
    "antisticker","antitag","antimention","antigroup",
    "antipromote","protection"
  ],

  "FUN & SOCIAL": [
    "joke","meme","quote","roast","roastme","compliment","ship",
    "love","truth","dare","8ball","hug","kiss","slap","punch",
    "pat","poke","wink","dance","laugh","cry","happy","angry",
    "mood","random"
  ],

  "AI & MEDIA": [
    "ai","chat","ask","explain","rewrite","summarize","translate",
    "tts","say","sticker","toimage","toaudio","removebg","getpp",
    "setpp","take","viewonce","qr","wallpaper","upload"
  ],

  DOWNLOADER: [
    "play","yt","ytmp3","ytmp4","tiktok","ig","igdl","facebook",
    "fbdl","twitter","twitterdl","movie","music","song","video",
    "media","socialdl","aio","download","dload"
  ],

  "STORY & QUESTS": [
    "story","chapter","lore","quest","mission","encounter",
    "character","boss","dungeon","realm","artifact","relic",
    "ending","journey","chronicles"
  ],

  OWNER: [
    "owner","broadcast","restart","shutdown","setprefix","setmenu",
    "setmenuimage","setmenuaudio","addxp","addcoins","setrank",
    "block","unblock","ban","unban","sudo","reload","cleansession",
    "userstats","botsettings"
  ]
};

const ALL_COMMANDS = new Set(
  Object.values(COMMANDS).flat()
);
