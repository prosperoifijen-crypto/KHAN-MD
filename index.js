import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import ytDlp from "yt-dlp-exec";
const BOT_NAME = "THE REAPER";
const OWNER_NAME = "Reaper";
const DEFAULT_PREFIX = ".";
const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "users.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const BANNER_FILE = "./assets/reaper-banner.jpg";

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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
  return normalizeNumber(jid?.split("@")[0] || "") === getOwnerNumber();
}

function getPrefix() {
  return typeof settings.prefix === "string" ? settings.prefix : DEFAULT_PREFIX;
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

function addXP(jid, amount, name) {
  const user = getUser(jid, name);
  user.xp += Math.max(0, amount);
  const needed = user.level * 100;
  while (user.xp >= neededForLevel(user.level)) {
    user.xp -= neededForLevel(user.level);
    user.level++;
    user.coins += 25;
  }
  updateRank(user);
  saveUsers();
  return user;
}

function neededForLevel(level) {
  return 100 + Math.max(0, level - 1) * 50;
}

function updateRank(user) {
  if (user.level >= 50) user.rank = "Reaper Lord";
  else if (user.level >= 30) user.rank = "Elite Reaper";
  else if (user.level >= 20) user.rank = "Reaper";
  else if (user.level >= 12) user.rank = "Dark Soul";
  else if (user.level >= 6) user.rank = "Blood Seeker";
  else user.rank = "New Soul";
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
  return ctx.participant || ctx.mentionedJid?.[0] || null;
}

async function react(sock, jid, key, emoji) {
  try {
    await sock.sendMessage(jid, { react: { text: emoji, key } });
  } catch {}
}

async function reply(sock, jid, text, msg) {
  return sock.sendMessage(jid, { text }, { quoted: msg });
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
  return n ? `https://wa.me/${n}` : "Owner number is not configured.";
}

const COMMANDS = {
  GENERAL: [
    "menu","reaper","ping","alive","botinfo","runtime","owner","repo","support","status",
    "profile","help","commands","uptime","version","prefix","jid","chatid","groupinfo","about"
  ],
  "REAPER SYSTEM": [
    "rank","level","xp","coins","daily","claim","hunt","mission","quest","train","power",
    "blood","soul","shadow","ritual","summon","curse","bless","reaperstats","achievements"
  ],
  BATTLE: [
    "fight","duel","battle","challenge","attack","defend","heal","weapon","armor","skills",
    "powers","boss","raid","arena","war","revenge","streak","damage","battlelog","battlerank"
  ],
  GAMES: [
    "dice","guess","rps","trivia","quiz","blackjack","slots","roulette","coinflip","higherlower",
    "hangman","tictactoe","connect4","snake","memory","typing","reaction","quickmath","numberguess",
    "wordshuffle","sequence","truefalse","colorhunt","luckywheel","casino","crash","clicker",
    "taprush","target","mafia","penalty","rockpaperscissors","gamestats","leaderboard","gamecoins"
  ],
  ECONOMY: [
    "balance","wallet","coins","daily","weekly","monthly","work","crime","rob","give","pay",
    "shop","buy","sell","inventory","item","deposit","withdraw","rich","economy"
  ],
  "GROUP MANAGEMENT": [
    "groupinfo","admins","members","membercount","groupid","groupjid","groupname","groupdesc",
    "setgroupname","setgroupdesc","setgrouppic","getgrouppic","add","remove","kick","promote",
    "demote","warn","warnings","clearwarn","mute","unmute","tagall","hidetag","tagadmins",
    "tagmembers","welcome","goodbye","setwelcome","setgoodbye","open","close","lock","unlock",
    "invite","revoke","gcstatus","hijack"
  ],
  PROTECTION: [
    "antilink","antibadword","antispam","antiflood","antibot","anticall","antidelete","antiedit",
    "antiviewonce","antisticker","antitag","antimention","antigroup","antipromote","protection"
  ],
  "FUN & SOCIAL": [
    "joke","meme","quote","roast","roastme","compliment","ship","love","truth","dare","8ball",
    "hug","kiss","slap","punch","pat","poke","wink","dance","laugh","cry","happy","angry","mood","random"
  ],
  "AI & MEDIA": [
    "ai","chat","ask","explain","rewrite","summarize","translate","tts","say","sticker","toimage",
    "toaudio","removebg","getpp","setpp","take","viewonce","qr","wallpaper","upload"
  ],
  DOWNLOADER: [
    "play","yt","ytmp3","ytmp4","tiktok","ig","igdl","facebook","fbdl","twitter","twitterdl",
    "movie","music","song","video","media","socialdl","aio","download","dload"
  ],
  "STORY & QUESTS": [
    "story","chapter","lore","quest","mission","encounter","character","boss","dungeon","realm",
    "artifact","relic","ending","journey","chronicles"
  ],
  OWNER: [
    "owner","broadcast","restart","shutdown","setprefix","setmenu","setmenuimage","setmenuaudio",
    "addxp","addcoins","setrank","block","unblock","ban","unban","sudo","reload","cleansession",
    "userstats","botsettings"
  ]
};

const ALL_COMMANDS = new Set(Object.values(COMMANDS).flat());

function commandHelpText() {
  return `🦇 THE REAPER

All commands are available directly.
Prefix is optional: both "menu" and ".menu" work.

Use:
🦇 menu
🦇 profile
🦇 rank
🦇 hunt
🦇 fight
🦇 dice
🦇 groupinfo
🦇 owner`;
}

function buildMenu(user, includeUser) {
  const prefix = getPrefix();

  let out =
`*╔═━━━━━✦✦✦━━━━━━═❐*
*┃ 𝚃𝙷𝙴 𝚁𝙴𝙰𝙿𝙴𝚁 𝙼𝙳 🦇*
*╚═━━━━━✦✦✦━━━━━━═❐*

*╔═━━━━━━━━━━━━━━━━━❐*
*┃ 🦇│ 𝙾𝚆𝙽𝙴𝚁: ${OWNER_NAME} ☠️*
*┃ 🦇│ 𝚅𝙴𝚁𝚂𝙸𝙾𝙽: ${BOT_NAME}*
*┃ 🦇│ 𝚄𝚂𝙴𝚁: ${user?.name || "Soul"}*
*┃ 🦇│ 𝙼𝙾𝙳𝙴: 🌍 𝙿𝚄𝙱𝙻𝙸𝙲*
*┃ 🦇│ 𝙿𝚁𝙴𝙵𝙸𝚇: ${prefix}*
*╚═━━━━━━━━━━━━━━━━━❐*

`;

  for (const [category, commands] of Object.entries(COMMANDS)) {
    out += `*┏━❐〔 🦇 ${category} 〕━━┈❐*\n`;

    for (const command of commands) {
      out += `*┃ 🦇│ ${prefix}${command}*\n`;
    }

    out += `*┗━━━━━━━━━━━━━━━━┈❐*\n\n`;
  }

  out +=
`⚙️ Powered by *${BOT_NAME}* 🦇
*╔═━━━━━✦✦✦━━━━━━═❐*
*┃ 𝚃𝙷𝙴 𝚁𝙴𝙰𝙿𝙴𝚁 𝙷𝙰𝚂 𝙰𝚆𝙰𝙺𝙴𝙽 ☠️*
*╚═━━━━━✦✦✦━━━━━━═❐*`;

  return out;

}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getGroupInfo(sock, jid) {
  if (!jid.endsWith("@g.us")) return null;
  try {
    return await sock.groupMetadata(jid);
  } catch {
    return null;
  }
}

function participantIsAdmin(metadata, jid) {
  const p = metadata?.participants?.find(x => x.id === jid);
  return !!p && (p.admin === "admin" || p.admin === "superadmin");
}

async function requireGroup(sock, jid, msg) {
  if (!jid.endsWith("@g.us")) {
    await reply(sock, jid, "🦇 This command only works in a group.", msg);
    return null;
  }
  const metadata = await getGroupInfo(sock, jid);
  if (!metadata) {
    await reply(sock, jid, "🦇 I could not read this group.", msg);
    return null;
  }
  return metadata;
}

async function requireAdmin(sock, jid, sender, msg) {
  const metadata = await requireGroup(sock, jid, msg);
  if (!metadata) return null;
  if (!isOwner(sender) && !participantIsAdmin(metadata, sender)) {
    await reply(sock, jid, "🦇 Admin permission required.", msg);
    return null;
  }
  return metadata;
}

async function sendMenu(sock, jid, msg, user, includeUser) {
  const text = buildMenu(user, includeUser);
  if (settings.menuImage && fs.existsSync(BANNER_FILE)) {
    await sock.sendMessage(
      jid,
      {
        image: fs.readFileSync(BANNER_FILE),
        caption: `🦇 ${BOT_NAME}\n⚡ THE REAPER HAS AWAKENED`
      },
      { quoted: msg }
    );
  }
  await reply(sock, jid, text, msg);
}

async function runCommand(sock, msg, cmd, args, user, sender, isGroup) {
  const jid = msg.key.remoteJid;
  const lower = cmd.toLowerCase();

  if (lower === "menu" || lower === "commands" || lower === "help") {
    await sendMenu(sock, jid, msg, user, !isOwner(sender));
    return;
  }

  await react(sock, jid, msg.key, "🦇");

  if (lower === "reaper" || lower === "alive" || lower === "status") {
    await reply(sock, jid,
      `🦇 ${BOT_NAME}\n\n⚡ Status: Online\n🩸 The Reaper has awakened.\n☠️ ${formatUptime(process.uptime())}`,
      msg
    );
    return;
  }

  if (lower === "ping") {
    const start = Date.now();
    await reply(sock, jid, `🦇 Pinging...`, msg);
    await reply(sock, jid, `🦇 Pong: ${Date.now() - start} ms`, msg);
    return;
  }

  if (lower === "owner") {
    await reply(sock, jid, `👑 Owner: ${OWNER_NAME}\n📱 ${ownerLink()}`, msg);
    return;
  }

  if (lower === "botinfo" || lower === "about" || lower === "version") {
    await reply(sock, jid,
      `🦇 ${BOT_NAME}\n\nVersion: 2.0\nBaileys: 6.7.23\nPrefix: optional\nCommands: ${ALL_COMMANDS.size}+\nMotto: I don't chase death. Death knows where to find me.`,
      msg
    );
    return;
  }

  if (lower === "runtime" || lower === "uptime") {
    await reply(sock, jid, `🦇 Uptime: ${formatUptime(process.uptime())}`, msg);
    return;
  }

  if (lower === "jid" || lower === "chatid") {
    await reply(sock, jid, `🦇 JID: ${jid}`, msg);
    return;
  }

  if (lower === "prefix") {
    await reply(sock, jid, `🦇 Prefix: ${getPrefix()}\n🦇 Commands also work without a prefix.`, msg);
    return;
  }

  if (lower === "profile" || lower === "rank" || lower === "level" || lower === "xp" || lower === "coins") {
    updateRank(user);
    await reply(sock, jid,
      `🦇 𝕽𝕰𝕬𝕻𝕰𝕽 𝕻𝕽𝕺𝕱𝕴𝕷𝕰\n\n` +
      `👤 ${user.name}\n` +
      `☠️ Rank: ${user.rank}\n` +
      `⚡ Level: ${user.level}\n` +
      `🩸 XP: ${user.xp}/${neededForLevel(user.level)}\n` +
      `🪙 Coins: ${user.coins}\n` +
      `⚔️ Wins: ${user.wins}\n` +
      `💀 Losses: ${user.losses}\n` +
      `🔥 Streak: ${user.streak}`,
      msg
    );
    return;
  }

  if (lower === "daily" || lower === "claim") {
    const now = Date.now();
    if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
      const left = 24 * 60 * 60 * 1000 - (now - user.lastDaily);
      await reply(sock, jid, `🦇 Daily already claimed. Try again in ${Math.ceil(left / 3600000)}h.`, msg);
      return;
    }
    user.lastDaily = now;
    user.coins += 250;
    addXP(sender, 50, user.name);
    await reply(sock, jid, `🦇 Daily Reaper reward claimed.\n🪙 +250 coins\n⚡ +50 XP`, msg);
    return;
  }

  if (lower === "hunt") {
    const now = Date.now();
    if (now - user.lastHunt < 60 * 60 * 1000) {
      await reply(sock, jid, "🦇 The hunt is still cooling down. Try again later.", msg);
      return;
    }
    user.lastHunt = now;
    const reward = Math.floor(Math.random() * 251) + 50;
    user.coins += reward;
    addXP(sender, Math.floor(reward / 5), user.name);
    await reply(sock, jid, `🦇 Reaper Hunt complete.\n🪙 You found ${reward} coins.`, msg);
    return;
  }

  if (lower === "dice") {
    const roll = Math.floor(Math.random() * 6) + 1;
    user.coins += roll * 5;
    addXP(sender, 10, user.name);
    await reply(sock, jid, `🎲 Reaper Dice: ${roll}\n🪙 +${roll * 5} coins`, msg);
    return;
  }

  if (lower === "coinflip") {
    const result = random(["HEADS", "TAILS"]);
    addXP(sender, 5, user.name);
    await reply(sock, jid, `🦇 Coin Flip: ${result}`, msg);
    return;
  }

  if (lower === "rps" || lower === "rockpaperscissors") {
    const choices = ["rock", "paper", "scissors"];
    const bot = random(choices);
    const pick = (args[0] || "").toLowerCase();
    if (!choices.includes(pick)) {
      await reply(sock, jid, "🦇 Use: rps rock | rps paper | rps scissors", msg);
      return;
    }
    let result = "draw";
    if (
      (pick === "rock" && bot === "scissors") ||
      (pick === "paper" && bot === "rock") ||
      (pick === "scissors" && bot === "paper")
    ) result = "win";
    else if (pick !== bot) result = "loss";

    if (result === "win") {
      user.wins++;
      user.streak++;
      user.coins += 50;
      addXP(sender, 25, user.name);
    } else if (result === "loss") {
      user.losses++;
      user.streak = 0;
    }

    await reply(sock, jid, `🦇 You: ${pick}\n🦇 Reaper: ${bot}\n\nResult: ${result.toUpperCase()}`, msg);
    return;
  }

  if (lower === "guess" || lower === "numberguess") {
    const n = Math.floor(Math.random() * 10) + 1;
    const guess = Number(args[0]);
    if (!Number.isInteger(guess) || guess < 1 || guess > 10) {
      await reply(sock, jid, "🦇 Guess a number from 1 to 10. Example: guess 7", msg);
      return;
    }
    if (guess === n) {
      user.coins += 100;
      addXP(sender, 40, user.name);
      await reply(sock, jid, `🦇 Correct. The number was ${n}.\n🪙 +100 coins`, msg);
    } else {
      addXP(sender, 5, user.name);
      await reply(sock, jid, `🦇 Wrong. The number was ${n}.`, msg);
    }
    return;
  }

  if (lower === "work" || lower === "crime" || lower === "rob") {
    const rewards = { work: [80, 220], crime: [120, 350], rob: [50, 400] };
    const [min, max] = rewards[lower];
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    if (lower === "rob" && Math.random() < 0.35) {
      const loss = Math.min(user.coins, Math.floor(amount / 2));
      user.coins -= loss;
      await reply(sock, jid, `🦇 The robbery failed.\n🪙 -${loss} coins`, msg);
    } else {
      user.coins += amount;
      addXP(sender, 15, user.name);
      await reply(sock, jid, `🦇 ${lower.toUpperCase()} complete.\n🪙 +${amount} coins`, msg);
    }
    return;
    }
  if (lower === "balance" || lower === "wallet" || lower === "economy") {
    await reply(sock, jid, `🦇 ${user.name}'s wallet\n🪙 Coins: ${user.coins}`, msg);
    return;
  }

  if (lower === "rich" || lower === "leaderboard") {
    const list = Object.entries(users)
      .sort((a, b) => (b[1].coins || 0) - (a[1].coins || 0))
      .slice(0, 10);
    let text = "🦇 REAPER LEADERBOARD\n\n";
    list.forEach(([id, u], i) => {
      text += `${i + 1}. ${u.name || id} — ${u.coins || 0} coins\n`;
    });
    await reply(sock, jid, text, msg);
    return;
  }

  if (lower === "groupinfo") {
    const metadata = await requireGroup(sock, jid, msg);
    if (!metadata) return;
    await reply(sock, jid,
      `🦇 GROUP INFO\n\n` +
      `Name: ${metadata.subject}\n` +
      `Members: ${metadata.participants.length}\n` +
      `JID: ${jid}\n` +
      `Description: ${metadata.desc || "None"}`,
      msg
    );
    return;
  }

  if (lower === "admins" || lower === "members" || lower === "membercount" || lower === "groupid" || lower === "groupjid") {
    const metadata = await requireGroup(sock, jid, msg);
    if (!metadata) return;
    if (lower === "membercount") {
      await reply(sock, jid, `🦇 Members: ${metadata.participants.length}`, msg);
      return;
    }
    if (lower === "groupid" || lower === "groupjid") {
      await reply(sock, jid, `🦇 Group JID: ${jid}`, msg);
      return;
    }
    const admins = metadata.participants.filter(p => p.admin);
    if (lower === "admins") {
      await reply(sock, jid, `🦇 ADMINS\n${admins.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n") || "None"}`,
        msg
      );
    } else {
      await reply(sock, jid, `🦇 Members: ${metadata.participants.length}`, msg);
    }
    return;
  }

  if (["tagall","hidetag","tagadmins","tagmembers"].includes(lower)) {
    const metadata = await requireAdmin(sock, jid, sender, msg);
    if (!metadata) return;

    let participants = metadata.participants;
    if (lower === "tagadmins") participants = participants.filter(p => p.admin);
    if (lower === "tagmembers") participants = participants.filter(p => !p.admin);

    const mentions = participants.map(p => p.id);
    const text = args.join(" ") || "🦇 The Reaper calls.";
    await sock.sendMessage(jid, { text: text + "\n\n" + mentions.map(x => `@${x.split("@")[0]}`).join(" "), mentions }, { quoted: msg });
    return;
  }

  if (["open","close","lock","unlock"].includes(lower)) {
    const metadata = await requireAdmin(sock, jid, sender, msg);
    if (!metadata) return;
    const announcement = lower === "close" || lower === "lock";
    try {
      await sock.groupSettingUpdate(jid, announcement ? "announcement" : "not_announcement");
      await reply(sock, jid, `🦇 Group is now ${announcement ? "closed to members" : "open to members"}.`, msg);
    } catch {
      await reply(sock, jid, "🦇 I need group admin permission to change the group setting.", msg);
    }
    return;
  }

  if (["setgroupname","setgroupdesc"].includes(lower)) {
    const metadata = await requireAdmin(sock, jid, sender, msg);
    if (!metadata) return;
    const value = args.join(" ").trim();
    if (!value) {
      await reply(sock, jid, `🦇 Usage: ${lower} <text>`, msg);
      return;
    }
    try {
      if (lower === "setgroupname") await sock.groupUpdateSubject(jid, value);
      else await sock.groupUpdateDescription(jid, value);
      await reply(sock, jid, "🦇 Group updated.", msg);
    } catch {
      await reply(sock, jid, "🦇 WhatsApp denied the group update. Make sure I am an admin.", msg);
    }
    return;
  }

  if (["add","remove","kick","promote","demote","warn","clearwarn","mute","unmute","invite","revoke"].includes(lower)) {
    const metadata = await requireAdmin(sock, jid, sender, msg);
    if (!metadata) return;
    const targets = [...getMentionedJids(msg)];
    if (!targets.length) {
      const replyJid = getReplyJid(msg);
      if (replyJid) targets.push(replyJid);
    }
    if (!targets.length && args[0]) {
      const n = normalizeNumber(args[0]);
      if (n) targets.push(`${n}@s.whatsapp.net`);
    }

    try {
      if (["add"].includes(lower)) await sock.groupParticipantsUpdate(jid, targets, "add");
      else if (["remove","kick"].includes(lower)) await sock.groupParticipantsUpdate(jid, targets, "remove");
      else if (lower === "promote") await sock.groupParticipantsUpdate(jid, targets, "promote");
      else if (lower === "demote") await sock.groupParticipantsUpdate(jid, targets, "demote");
      else if (lower === "revoke") {
        const code = await sock.groupRevokeInvite(jid);
        await reply(sock, jid, `🦇 Invite revoked.\nNew invite: https://chat.whatsapp.com/${code}`, msg);
        return;
      } else if (lower === "invite") {
        const code = await sock.groupInviteCode(jid);
        await reply(sock, jid, `🦇 Group invite: https://chat.whatsapp.com/${code}`, msg);
        return;
      } else {
        await reply(sock, jid, `🦇 ${lower} command recognized. Full moderation state is ready for expansion.`, msg);
        return;
      }
      await reply(sock, jid, `🦇 ${lower} completed.`, msg);
    } catch {
      await reply(sock, jid, "🦇 WhatsApp denied that action. Confirm that I am a group admin and the target is valid.", msg);
    }
    return;
  }

  if (lower === "hijack") {
    const metadata = await requireAdmin(sock, jid, sender, msg);
    if (!metadata) return;
    await reply(sock, jid,
      "🦇 REAPER TAKEOVER MODE\n\n" +
      "Authorized mode enabled. I will only perform group actions that WhatsApp permits for my account.\n" +
      "I cannot bypass WhatsApp admin permissions.",
      msg
    );
    return;
  }

  if (lower === "gcstatus") {
    const metadata = await requireAdmin(sock, jid, sender, msg);
    if (!metadata) return;
    const text = args.join(" ").trim() || "🦇 THE REAPER HAS AWAKENED.";
    await reply(sock, jid, `🦇 Group status message:\n${text}`, msg);
    return;
  }

  if (lower === "setprefix") {
    if (!isOwner(sender)) {
      await reply(sock, jid, "🦇 Owner only.", msg);
      return;
    }
    const p = args[0];
    if (!p || p.length > 3) {
      await reply(sock, jid, "🦇 Usage: setprefix .", msg);
      return;
    }
    settings.prefix = p;
    saveSettings();
    await reply(sock, jid, `🦇 Prefix set to: ${p}\n🦇 Prefix remains optional.`, msg);
    return;
  }

  if (lower === "setmenuimage") {
    if (!isOwner(sender)) {
      await reply(sock, jid, "🦇 Owner only.", msg);
      return;
    }
    const mode = (args[0] || "").toLowerCase();
    settings.menuImage = mode !== "off";
    saveSettings();
    await reply(sock, jid, `🦇 Menu banner: ${settings.menuImage ? "ON" : "OFF"}`, msg);
    return;
  }

  if (lower === "addxp" || lower === "addcoins" || lower === "setrank" || lower === "userstats" || lower === "botsettings" || lower === "reload") {
    if (!isOwner(sender)) {
      await reply(sock, jid, "🦇 Owner only.", msg);
      return;
    }

    const target = getMentionedJids(msg)[0] || getReplyJid(msg) || sender;
    const targetUser = getUser(target, "Soul");

    if (lower === "addxp") {
      const amount = Number(args[0]);
      if (!Number.isFinite(amount)) {
        await reply(sock, jid, "🦇 Usage: addxp 100", msg);
        return;
      }
      addXP(target, amount, targetUser.name);
      await reply(sock, jid, `🦇 Added ${amount} XP.`, msg);
      return;
    }

    if (lower === "addcoins") {
      const amount = Number(args[0]);
      if (!Number.isFinite(amount)) {
        await reply(sock, jid, "🦇 Usage: addcoins 100", msg);
        return;
      }
      targetUser.coins += amount;
      saveUsers();
      await reply(sock, jid, `🦇 Added ${amount} coins.`, msg);
      return;
    }

    if (lower === "setrank") {
      const rank = args.join(" ");
      if (!rank) {
        await reply(sock, jid, "🦇 Usage: setrank Reaper Lord", msg);
        return;
      }
      targetUser.rank = rank;
      saveUsers();
      await reply(sock, jid, `🦇 Rank set to ${rank}.`, msg);
      return;
    }

    if (lower === "userstats") {
      await reply(sock, jid, JSON.stringify(targetUser, null, 2), msg);
      return;
    }

    if (lower === "botsettings") {
      await reply(sock, jid, `🦇 Settings\nPrefix: ${settings.prefix}\nMenu banner: ${settings.menuImage}`, msg);
      return;
    }

    await reply(sock, jid, "🦇 Reaper data reloaded.", msg);
    return;
  }

  if (lower === "give" || lower === "pay") {
    const target = getMentionedJids(msg)[0] || getReplyJid(msg);
    const amount = Number(args.find(x => /^\d+$/.test(x)));
    if (!target || !Number.isFinite(amount) || amount <= 0) {
      await reply(sock, jid, "🦇 Use: give @user 100", msg);
      return;
    }
    if (user.coins < amount) {
      await reply(sock, jid, "🦇 Not enough coins.", msg);
      return;
    }
    const targetUser = getUser(target, "Soul");
    user.coins -= amount;
    targetUser.coins += amount;
    saveUsers();
    await reply(sock, jid, `🦇 Transfer complete: 🪙 ${amount} coins.`, msg);
    return;
  }

  if (lower === "joke") {
    await reply(sock, jid, random([
      "🦇 Why did the ghost refuse the fight? It had no guts.",
      "🦇 The Reaper walked into a bar. The bar closed.",
      "🦇 Death asked for a timeout. The Reaper said no."
    ]), msg);
    return;
  }

  if (lower === "8ball") {
    await reply(sock, jid, `🦇 The Reaper says: ${random([
      "Yes.",
      "No.",
      "Ask again later.",
      "The shadows say yes.",
      "The answer is hidden.",
      "Absolutely not."
    ])}`, msg);
    return;
  }

  if (lower === "truth" || lower === "dare") {
    const truths = ["What is one secret goal you have?", "What is your biggest fear?", "Who do you trust most?"];
    const dares = ["Send a mysterious emoji.", "Change your status for five minutes.", "Say: THE REAPER HAS AWAKENED."];
    await reply(sock, jid, `🦇 ${lower.toUpperCase()}: ${random(lower === "truth" ? truths : dares)}`, msg);
    return;
  }

  if (lower === "story" || lower === "lore" || lower === "chronicles") {
    await reply(sock, jid,
      `🦇 THE REAPER CHRONICLES\n\nChapter I — The Awakening\n\n` +
      `When the last bell stopped ringing, the shadow beneath the cathedral opened its eyes.\n\n` +
      `"I don't chase death. Death knows where to find me."`,
      msg
    );
    return;
  }

  if (lower === "mission" || lower === "quest" || lower === "train") {
    const gain = Math.floor(Math.random() * 51) + 25;
    addXP(sender, gain, user.name);
    user.coins += 50;
    await reply(sock, jid, `🦇 Quest complete.\n⚡ +${gain} XP\n🪙 +50 coins`, msg);
    return;
  }

  if (["fight","duel","battle","challenge"].includes(lower)) {
    const enemy = Math.floor(Math.random() * 101) + 50;
    const power = user.level * 20 + Math.floor(Math.random() * 80);
    if (power >= enemy) {
      user.wins++;
      user.streak++;
      user.coins += 150;
      addXP(sender, 50, user.name);
      await reply(sock, jid, `🦇 BATTLE WON\n⚔️ Your power: ${power}\n☠️ Enemy power: ${enemy}\n🪙 +150 coins`, msg);
    } else {
      user.losses++;
      user.streak = 0;
      await reply(sock, jid, `🦇 BATTLE LOST\n⚔️ Your power: ${power}\n☠️ Enemy power: ${enemy}`, msg);
    }
    saveUsers();
    return;
  }

  if (
  lower === "ai" ||
  lower === "chat" ||
  lower === "ask" ||
  lower === "explain" ||
  lower === "rewrite" ||
  lower === "summarize" ||
  lower === "translate"
) {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    await reply(
      sock,
      jid,
      `🦇 Usage:\n${prefix}${lower} <your question or text>`,
      msg
    );
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    await reply(
      sock,
      jid,
      "🦇 OPENROUTER_API_KEY is missing from Railway Variables.",
      msg
    );
    return;
  }

  try {
    await reply(sock, jid, "🦇 THE REAPER AI is thinking...", msg);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://railway.app",
          "X-Title": "THE REAPER"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are THE REAPER, a helpful WhatsApp AI assistant. Give clear, useful and concise answers."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      await reply(
        sock,
        jid,
        `🦇 AI error: ${data?.error?.message || "Request failed."}`,
        msg
      );
      return;
    }

    const answer =
      data?.choices?.[0]?.message?.content ||
      "🦇 The AI returned no response.";

    await reply(
      sock,
      jid,
      `🦇 *THE REAPER AI*\n\n${answer}`,
      msg
    );

  } catch (error) {
    console.error("AI ERROR:", error);

    await reply(
      sock,
      jid,
      `🦇 AI connection failed.\n\n${error?.message || "Unknown error"}`,
      msg
    );
  }

  return;
          }

  if ([
  "play", "yt", "ytmp3", "ytmp4",
  "tiktok", "ig", "igdl",
  "facebook", "fbdl",
  "twitter", "twitterdl",
  "movie", "music", "song", "video",
  "media", "socialdl", "aio",
  "download", "dload"
].includes(lower)) {

  const query = args.join(" ").trim();

  if (!query) {
    await reply(
      sock,
      jid,
      `🦇 Usage:\n\n${prefix}${lower} <URL or search term>`,
      msg
    );
    return;
  }

  const tempDir = "./downloads";

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const safeName = `reaper_${Date.now()}`;
  const output = path.join(tempDir, `${safeName}.%(ext)s`);

  try {
    await reply(
      sock,
      jid,
      `🦇 THE REAPER is processing...\n\n🔎 ${query}`,
      msg
    );

    let searchQuery = query;

    if (!/^https?:\/\//i.test(query)) {
      searchQuery = `ytsearch1:${query}`;
    }

    const isAudio = [
      "ytmp3",
      "song",
      "music"
    ].includes(lower);

    const isVideo = [
      "yt",
      "ytmp4",
      "play",
      "video",
      "tiktok",
      "ig",
      "igdl",
      "facebook",
      "fbdl",
      "twitter",
      "twitterdl"
    ].includes(lower);

    const options = {
      output: output,
      noPlaylist: true,
      restrictFilenames: true,
      maxFilesize: "50M"
    };

    if (isAudio) {
      options.extractAudio = true;
      options.audioFormat = "mp3";
      options.audioQuality = 0;
    } else if (isVideo) {
      options.format = "best[ext=mp4]/best";
      options.mergeOutputFormat = "mp4";
    } else {
      options.format = "best[ext=mp4]/best";
      options.mergeOutputFormat = "mp4";
    }

    await ytDlp(searchQuery, options);

    const files = fs.readdirSync(tempDir)
      .filter(file => file.startsWith(safeName));

    if (!files.length) {
      await reply(
        sock,
        jid,
        `🦇 Download failed.\n\nNo media file was produced.`,
        msg
      );
      return;
    }

    const filePath = path.join(tempDir, files[0]);
    const ext = path.extname(filePath).toLowerCase();

    if (isAudio) {
      await sock.sendMessage(
        jid,
        {
          audio: {
            url: filePath
          },
          mimetype: "audio/mpeg",
          fileName: files[0],
          ptt: false
        },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(
        jid,
        {
          video: {
            url: filePath
          },
          mimetype: "video/mp4",
          fileName: files[0],
          caption: `🦇 ${BOT_NAME}\n\nDownloaded successfully.`
        },
        { quoted: msg }
      );
    }

    fs.unlinkSync(filePath);

  } catch (error) {
    console.error("YT-DLP ERROR:", error);

    await reply(
      sock,
      jid,
      `🦇 Download failed.\n\n${error?.message || "Unknown yt-dlp error"}`,
      msg
    );
  }

  return;
    }
  if (ALL_COMMANDS.has(lower)) {
    await reply(sock, jid, `🦇 ${lower} is registered in THE REAPER. Its full provider-specific implementation is not enabled yet.`, msg);
    return;
  }

  await react(sock, jid, msg.key, "❌");
  await reply(sock, jid, `🦇 Unknown command: ${cmd}\nUse "menu" to see all commands.`, msg);
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  let version;
  try {
    const result = await fetchLatestWaWebVersion();
    if (result?.version) version = result.version;
  } catch {}

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    ...(version ? { version } : {})
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingRequested = false;

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "connecting" && !state.creds.registered && !pairingRequested) {
      const phone = getOwnerNumber();
      if (!phone) {
        console.log("PHONE_NUMBER is missing in Railway Variables.");
        return;
      }

      pairingRequested = true;
      try {
        await new Promise(r => setTimeout(r, 2500));
        const code = await sock.requestPairingCode(phone);
        console.log("\n==============================");
        console.log("THE REAPER PAIRING CODE");
        console.log(code);
        console.log("==============================\n");
      } catch (err) {
        pairingRequested = false;
        console.error("Pairing code error:", err?.message || err);
      }
    }

    if (connection === "open") {
      console.log("🦇 THE REAPER HAS AWAKENED — CONNECTED");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log("WhatsApp connection closed:", statusCode || "unknown");

      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => startBot(), 3000);
      } else {
        console.log("Logged out. Remove the auth session only if you intentionally want to pair again.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages?.[0];
      if (!msg?.message) return;

      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast") return;

      const sender = jidFromMessage(msg);
      const text = getText(msg);
      if (!text) return;

      const user = getUser(sender, msg.pushName || "Soul");
      const trimmed = text.trim();

      const prefix = getPrefix();
      let body = trimmed;

      if (prefix && body.startsWith(prefix)) {
        body = body.slice(prefix.length).trim();
      }

      if (!body) return;

      const parts = body.split(/\s+/);
      const cmd = parts.shift().toLowerCase();
      const args = parts;

      if (!ALL_COMMANDS.has(cmd)) {
        // Treat ordinary conversation as normal text; only unknown prefixed commands get ❌.
        if (prefix && trimmed.startsWith(prefix)) {
          await react(sock, jid, msg.key, "❌");
          await reply(sock, jid, `🦇 Unknown command: ${cmd}\nUse "menu" to see all commands.`, msg);
        }
        return;
      }

      await runCommand(sock, msg, cmd, args, user, sender, jid.endsWith("@g.us"));
    } catch (err) {
      console.error("Message handler error:", err);
      try {
        const jid = messages?.[0]?.key?.remoteJid;
        if (jid) await reply(sock, jid, "🦇 Something went wrong while processing that command.", messages[0]);
      } catch {}
    }
  });
}

process.on("uncaughtException", err => console.error("Uncaught exception:", err));
process.on("unhandledRejection", err => console.error("Unhandled rejection:", err));

startBot().catch(err => {
  console.error("Failed to start THE REAPER:", err);
  process.exit(1);
});
