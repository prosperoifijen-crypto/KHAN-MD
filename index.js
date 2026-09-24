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
function buildMenu(user, includeUser) {
  const prefix = getPrefix();

  let out = `🦇 𝕿𝕳𝕰 𝕽𝕰𝕬𝕻𝕰𝕽

👑 Owner: ${OWNER_NAME}
🤖 Bot: ${BOT_NAME}
⚡ Status: Online
📶 Ping: ${prefix}ping`;

  if (includeUser) {
    out += `\n👤 User: ${user.name || "Soul"}`;
  }

  out += `\n
━━━━━━━━━━━━━━━━━━━━━━━━
`;

  for (const [category, commands] of Object.entries(COMMANDS)) {
    out += `\n🦇 ${category}\n`;

    out += commands
      .map(command => `🦇 ${command}`)
      .join("\n");

    out += "\n";
  }

  out += `
━━━━━━━━━━━━━━━━━━━━━━━━
🦇 Motto: I don't chase death. Death knows where to find me.
🦇 Status: THE REAPER HAS AWAKENED`;

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
  const participant = metadata?.participants?.find(
    p => p.id === jid
  );

  return !!participant &&
    (
      participant.admin === "admin" ||
      participant.admin === "superadmin"
    );
}

async function requireGroup(sock, jid, msg) {
  if (!jid.endsWith("@g.us")) {
    await reply(
      sock,
      jid,
      "🦇 This command only works in a group.",
      msg
    );

    return null;
  }

  const metadata = await getGroupInfo(sock, jid);

  if (!metadata) {
    await reply(
      sock,
      jid,
      "🦇 I could not read this group.",
      msg
    );

    return null;
  }

  return metadata;
}

async function requireAdmin(sock, jid, sender, msg) {
  const metadata = await requireGroup(sock, jid, msg);

  if (!metadata) return null;

  if (
    !isOwner(sender) &&
    !participantIsAdmin(metadata, sender)
  ) {
    await reply(
      sock,
      jid,
      "🦇 Admin permission required.",
      msg
    );

    return null;
  }

  return metadata;
}

async function sendMenu(
  sock,
  jid,
  msg,
  user,
  includeUser
) {
  const text = buildMenu(user, includeUser);

  if (
    settings.menuImage &&
    fs.existsSync(BANNER_FILE)
  ) {
    await sock.sendMessage(
      jid,
      {
        image: fs.readFileSync(BANNER_FILE),
        caption:
          `🦇 ${BOT_NAME}\n` +
          `⚡ THE REAPER HAS AWAKENED`
      },
      { quoted: msg }
    );
  }

  await reply(
    sock,
    jid,
    text,
    msg
  );
}

async function runCommand(
  sock,
  msg,
  cmd,
  args,
  user,
  sender,
  isGroup
) {
  const jid = msg.key.remoteJid;
  const lower = cmd.toLowerCase();

  if (
    lower === "menu" ||
    lower === "commands" ||
    lower === "help"
  ) {
    await sendMenu(
      sock,
      jid,
      msg,
      user,
      !isOwner(sender)
    );

    return;
  }

  await react(
    sock,
    jid,
    msg.key,
    "🦇"
  );

  if (
    lower === "reaper" ||
    lower === "alive" ||
    lower === "status"
  ) {
    await reply(
      sock,
      jid,
      `🦇 ${BOT_NAME}

⚡ Status: Online
🩸 The Reaper has awakened.
☠️ ${formatUptime(process.uptime())}`,
      msg
    );

    return;
  }

  if (lower === "ping") {
    const start = Date.now();

    await reply(
      sock,
      jid,
      "🦇 Pinging...",
      msg
    );

    await reply(
      sock,
      jid,
      `🦇 Pong: ${Date.now() - start} ms`,
      msg
    );

    return;
  }

  if (lower === "owner") {
    await reply(
      sock,
      jid,
      `👑 Owner: ${OWNER_NAME}
📱 ${ownerLink()}`,
      msg
    );

    return;
  }

  if (
    lower === "botinfo" ||
    lower === "about" ||
    lower === "version"
  ) {
    await reply(
      sock,
      jid,
      `🦇 ${BOT_NAME}

Version: 2.0
Baileys: 6.7.23
Prefix: optional
Commands: ${ALL_COMMANDS.size}+
Motto: I don't chase death. Death knows where to find me.`,
      msg
    );

    return;
  }

  if (
    lower === "runtime" ||
    lower === "uptime"
  ) {
    await reply(
      sock,
      jid,
      `🦇 Uptime: ${formatUptime(process.uptime())}`,
      msg
    );

    return;
  }

  if (
    lower === "jid" ||
    lower === "chatid"
  ) {
    await reply(
      sock,
      jid,
      `🦇 JID: ${jid}`,
      msg
    );

    return;
  }

  if (lower === "prefix") {
    await reply(
      sock,
      jid,
      `🦇 Prefix: ${getPrefix()}
🦇 Commands also work without a prefix.`,
      msg
    );

    return;
  }

  if (
    lower === "profile" ||
    lower === "rank" ||
    lower === "level" ||
    lower === "xp" ||
    lower === "coins"
  ) {
    updateRank(user);

    await reply(
      sock,
      jid,
      `🦇 𝕽𝕰𝕬𝕻𝕰𝕽 𝕻𝕽𝕺𝕱𝕴𝕷𝕰

👤 ${user.name}
☠️ Rank: ${user.rank}
⚡ Level: ${user.level}
🩸 XP: ${user.xp}/${neededForLevel(user.level)}
🪙 Coins: ${user.coins}
⚔️ Wins: ${user.wins}
💀 Losses: ${user.losses}
🔥 Streak: ${user.streak}`,
      msg
    );

    return;
  }

  if (
    lower === "daily" ||
    lower === "claim"
  ) {
    const now = Date.now();

    if (
      now - user.lastDaily <
      24 * 60 * 60 * 1000
    ) {
      const left =
        24 * 60 * 60 * 1000 -
        (now - user.lastDaily);

      await reply(
        sock,
        jid,
        `🦇 Daily already claimed.
Try again in ${Math.ceil(left / 3600000)}h.`,
        msg
      );

      return;
    }

    user.lastDaily = now;
    user.coins += 250;

    addXP(
      sender,
      50,
      user.name
    );

    await reply(
      sock,
      jid,
      `🦇 Daily Reaper reward claimed.
🪙 +250 coins
⚡ +50 XP`,
      msg
    );

    return;
  }

  if (lower === "hunt") {
    const now = Date.now();

    if (
      now - user.lastHunt <
      60 * 60 * 1000
    ) {
      await reply(
        sock,
        jid,
        "🦇 The hunt is still cooling down. Try again later.",
        msg
      );

      return;
    }

    user.lastHunt = now;

    const reward =
      Math.floor(Math.random() * 251) + 50;

    user.coins += reward;

    addXP(
      sender,
      Math.floor(reward / 5),
      user.name
    );

    await reply(
      sock,
      jid,
      `🦇 Reaper Hunt complete.
🪙 You found ${reward} coins.`,
      msg
    );

    return;
  }

  if (lower === "dice") {
    const roll =
      Math.floor(Math.random() * 6) + 1;

    user.coins += roll * 5;

    addXP(
      sender,
      10,
      user.name
    );

    await reply(
      sock,
      jid,
      `🦇 Reaper Dice: ${roll}
🪙 +${roll * 5} coins`,
      msg
    );

    return;
  }

  if (lower === "coinflip") {
    const result =
      random(["HEADS", "TAILS"]);

    addXP(
      sender,
      5,
      user.name
    );

    await reply(
      sock,
      jid,
      `🦇 Coin Flip: ${result}`,
      msg
    );

    return;
  }

  if (
    lower === "rps" ||
    lower === "rockpaperscissors"
  ) {
    const choices = [
      "rock",
      "paper",
      "scissors"
    ];

    const bot = random(choices);
    const pick =
      (args[0] || "").toLowerCase();

    if (!choices.includes(pick)) {
      await reply(
        sock,
        jid,
        "🦇 Use: rps rock | rps paper | rps scissors",
        msg
      );

      return;
    }

    let result = "draw";

    if (
      (pick === "rock" &&
        bot === "scissors") ||
      (pick === "paper" &&
        bot === "rock") ||
      (pick === "scissors" &&
        bot === "paper")
    ) {
      result = "win";
    } else if (pick !== bot) {
      result = "loss";
    }

    if (result === "win") {
      user.wins++;
      user.streak++;
      user.coins += 50;

      addXP(
        sender,
        25,
        user.name
      );
    } else if (result === "loss") {
      user.losses++;
      user.streak = 0;
    }

    await reply(
      sock,
      jid,
      `🦇 You: ${pick}
🦇 Reaper: ${bot}

Result: ${result.toUpperCase()}`,
      msg
    );

    return;
    }
  if (lower === "guess" || lower === "numberguess") {
    const n = Math.floor(Math.random() * 10) + 1;
    const guess = Number(args[0]);

    if (
      !Number.isInteger(guess) ||
      guess < 1 ||
      guess > 10
    ) {
      await reply(
        sock,
        jid,
        "🦇 Guess a number from 1 to 10.\nExample: guess 7",
        msg
      );
      return;
    }

    if (guess === n) {
      user.coins += 100;

      addXP(
        sender,
        40,
        user.name
      );

      await reply(
        sock,
        jid,
        `🦇 Correct. The number was ${n}.
🪙 +100 coins`,
        msg
      );
    } else {
      addXP(
        sender,
        5,
        user.name
      );

      await reply(
        sock,
        jid,
        `🦇 Wrong. The number was ${n}.`,
        msg
      );
    }

    return;
  }

  if (
    lower === "work" ||
    lower === "crime" ||
    lower === "rob"
  ) {
    const rewards = {
      work: [80, 220],
      crime: [120, 350],
      rob: [50, 400]
    };

    const [min, max] =
      rewards[lower];

    const amount =
      Math.floor(
        Math.random() *
        (max - min + 1)
      ) + min;

    if (
      lower === "rob" &&
      Math.random() < 0.35
    ) {
      const loss = Math.min(
        user.coins,
        Math.floor(amount / 2)
      );

      user.coins -= loss;

      await reply(
        sock,
        jid,
        `🦇 The robbery failed.
🪙 -${loss} coins`,
        msg
      );
    } else {
      user.coins += amount;

      addXP(
        sender,
        15,
        user.name
      );

      await reply(
        sock,
        jid,
        `🦇 ${lower.toUpperCase()} complete.
🪙 +${amount} coins`,
        msg
      );
    }

    return;
  }

  if (
    lower === "balance" ||
    lower === "wallet" ||
    lower === "economy"
  ) {
    await reply(
      sock,
      jid,
      `🦇 ${user.name}'s wallet
🪙 Coins: ${user.coins}`,
      msg
    );

    return;
  }

  if (
    lower === "rich" ||
    lower === "leaderboard"
  ) {
    const list =
      Object.entries(users)
        .sort(
          (a, b) =>
            (b[1].coins || 0) -
            (a[1].coins || 0)
        )
        .slice(0, 10);

    let text =
      "🦇 REAPER LEADERBOARD\n\n";

    list.forEach(
      ([id, u], i) => {
        text +=
          `${i + 1}. ` +
          `${u.name || id} — ` +
          `${u.coins || 0} coins\n`;
      }
    );

    await reply(
      sock,
      jid,
      text,
      msg
    );

    return;
  }

  if (lower === "groupinfo") {
    const metadata =
      await requireGroup(
        sock,
        jid,
        msg
      );

    if (!metadata) return;

    await reply(
      sock,
      jid,
      `🦇 GROUP INFO

Name: ${metadata.subject}
Members: ${metadata.participants.length}
JID: ${jid}
Description: ${metadata.desc || "None"}`,
      msg
    );

    return;
  }

  if (
    lower === "admins" ||
    lower === "members" ||
    lower === "membercount" ||
    lower === "groupid" ||
    lower === "groupjid"
  ) {
    const metadata =
      await requireGroup(
        sock,
        jid,
        msg
      );

    if (!metadata) return;

    if (lower === "membercount") {
      await reply(
        sock,
        jid,
        `🦇 Members: ${metadata.participants.length}`,
        msg
      );

      return;
    }

    if (
      lower === "groupid" ||
      lower === "groupjid"
    ) {
      await reply(
        sock,
        jid,
        `🦇 Group JID: ${jid}`,
        msg
      );

      return;
    }

    const admins =
      metadata.participants.filter(
        p => p.admin
      );

    if (lower === "admins") {
      await sock.sendMessage(
        jid,
        {
          text:
            `🦇 ADMINS\n\n` +
            (
              admins
                .map(
                  (p, i) =>
                    `${i + 1}. @${p.id.split("@")[0]}`
                )
                .join("\n") ||
              "None"
            ),
          mentions:
            admins.map(p => p.id)
        },
        { quoted: msg }
      );
    } else {
      await reply(
        sock,
        jid,
        `🦇 Members: ${metadata.participants.length}`,
        msg
      );
    }

    return;
  }

  if (
    [
      "tagall",
      "hidetag",
      "tagadmins",
      "tagmembers"
    ].includes(lower)
  ) {
    const metadata =
      await requireAdmin(
        sock,
        jid,
        sender,
        msg
      );

    if (!metadata) return;

    let participants =
      metadata.participants;

    if (lower === "tagadmins") {
      participants =
        participants.filter(
          p => p.admin
        );
    }

    if (lower === "tagmembers") {
      participants =
        participants.filter(
          p => !p.admin
        );
    }

    const mentions =
      participants.map(
        p => p.id
      );

    const text =
      args.join(" ").trim() ||
      "🦇 The Reaper calls.";

    await sock.sendMessage(
      jid,
      {
        text:
          text +
          "\n\n" +
          mentions
            .map(
              x =>
                `@${x.split("@")[0]}`
            )
            .join(" "),
        mentions
      },
      { quoted: msg }
    );

    return;
  }

  if (
    [
      "open",
      "close",
      "lock",
      "unlock"
    ].includes(lower)
  ) {
    const metadata =
      await requireAdmin(
        sock,
        jid,
        sender,
        msg
      );

    if (!metadata) return;

    const announcement =
      lower === "close" ||
      lower === "lock";

    try {
      await sock.groupSettingUpdate(
        jid,
        announcement
          ? "announcement"
          : "not_announcement"
      );

      await reply(
        sock,
        jid,
        `🦇 Group is now ${
          announcement
            ? "closed to members"
            : "open to members"
        }.`,
        msg
      );
    } catch {
      await reply(
        sock,
        jid,
        "🦇 I need group admin permission to change the group setting.",
        msg
      );
    }

    return;
  }

  if (
    [
      "setgroupname",
      "setgroupdesc"
    ].includes(lower)
  ) {
    const metadata =
      await requireAdmin(
        sock,
        jid,
        sender,
        msg
      );

    if (!metadata) return;

    const value =
      args.join(" ").trim();

    if (!value) {
      await reply(
        sock,
        jid,
        `🦇 Usage: ${lower} <text>`,
        msg
      );

      return;
    }

    try {
      if (lower === "setgroupname") {
        await sock.groupUpdateSubject(
          jid,
          value
        );
      } else {
        await sock.groupUpdateDescription(
          jid,
          value
        );
      }

      await reply(
        sock,
        jid,
        "🦇 Group updated.",
        msg
      );
    } catch {
      await reply(
        sock,
        jid,
        "🦇 WhatsApp denied the group update. Make sure I am an admin.",
        msg
      );
    }

    return;
  }

  if (
    [
      "add",
      "remove",
      "kick",
      "promote",
      "demote",
      "warn",
      "clearwarn",
      "mute",
      "unmute",
      "invite",
      "revoke"
    ].includes(lower)
  ) {
    const metadata =
      await requireAdmin(
        sock,
        jid,
        sender,
        msg
      );

    if (!metadata) return;

    const targets = [
      ...getMentionedJids(msg)
    ];

    if (!targets.length) {
      const replyJid =
        getReplyJid(msg);

      if (replyJid) {
        targets.push(replyJid);
      }
    }

    if (
      !targets.length &&
      args[0]
    ) {
      const n =
        normalizeNumber(args[0]);

      if (n) {
        targets.push(
          `${n}@s.whatsapp.net`
        );
      }
    }

    try {
      if (lower === "add") {
        await sock.groupParticipantsUpdate(
          jid,
          targets,
          "add"
        );
      }

      else if (
        lower === "remove" ||
        lower === "kick"
      ) {
        await sock.groupParticipantsUpdate(
          jid,
          targets,
          "remove"
        );
      }

      else if (lower === "promote") {
        await sock.groupParticipantsUpdate(
          jid,
          targets,
          "promote"
        );
      }

      else if (lower === "demote") {
        await sock.groupParticipantsUpdate(
          jid,
          targets,
          "demote"
        );
      }

      else if (lower === "revoke") {
        const code =
          await sock.groupRevokeInvite(
            jid
          );

        await reply(
          sock,
          jid,
          `🦇 Invite revoked.
New invite:
https://chat.whatsapp.com/${code}`,
          msg
        );

        return;
      }

      else if (lower === "invite") {
        const code =
          await sock.groupInviteCode(
            jid
          );

        await reply(
          sock,
          jid,
          `🦇 Group invite:
https://chat.whatsapp.com/${code}`,
          msg
        );

        return;
      }

      else {
        await reply(
          sock,
          jid,
          `🦇 ${lower} command recognized.`,
          msg
        );

        return;
      }

      await reply(
        sock,
        jid,
        `🦇 ${lower} completed.`,
        msg
      );
    } catch {
      await reply(
        sock,
        jid,
        "🦇 WhatsApp denied that action. Confirm that I am a group admin and the target is valid.",
        msg
      );
    }

    return;
  }

  if (lower === "hijack") {
    const metadata =
      await requireAdmin(
        sock,
        jid,
        sender,
        msg
      );

    if (!metadata) return;

    await reply(
      sock,
      jid,
      `🦇 REAPER TAKEOVER MODE

Authorized mode enabled.

I will only perform group actions that WhatsApp permits for my account.

I cannot bypass WhatsApp admin permissions.`,
      msg
    );

    return;
  }

  if (lower === "gcstatus") {
    const metadata =
      await requireAdmin(
        sock,
        jid,
        sender,
        msg
      );

    if (!metadata) return;

    const text =
      args.join(" ").trim() ||
      "🦇 THE REAPER HAS AWAKENED.";

    await reply(
      sock,
      jid,
      `🦇 Group status message:
${text}`,
      msg
    );

    return;
      }
  if (
    lower === "setprefix" ||
    lower === "setmenu" ||
    lower === "setmenuimage" ||
    lower === "setmenuaudio" ||
    lower === "botsettings"
  ) {
    if (!isOwner(sender)) {
      await reply(
        sock,
        jid,
        "🦇 Owner only.",
        msg
      );
      return;
    }

    if (lower === "setprefix") {
      const value = args[0] || ".";

      settings.prefix = value;
      saveSettings();

      await reply(
        sock,
        jid,
        `🦇 Prefix changed to: ${value}`,
        msg
      );
      return;
    }

    if (lower === "setmenuimage") {
      settings.menuImage =
        String(args[0]).toLowerCase() !== "off";

      saveSettings();

      await reply(
        sock,
        jid,
        `🦇 Menu image: ${
          settings.menuImage ? "ON" : "OFF"
        }`,
        msg
      );
      return;
    }

    if (lower === "setmenu") {
      settings.menuImage =
        String(args[0]).toLowerCase() !== "off";

      saveSettings();

      await reply(
        sock,
        jid,
        `🦇 Menu image: ${
          settings.menuImage ? "ON" : "OFF"
        }`,
        msg
      );
      return;
    }

    if (lower === "setmenuaudio") {
      await reply(
        sock,
        jid,
        "🦇 Menu audio setting is reserved for the audio file integration.",
        msg
      );
      return;
    }

    await reply(
      sock,
      jid,
      `🦇 BOT SETTINGS

Prefix: ${settings.prefix}
Menu image: ${settings.menuImage ? "ON" : "OFF"}
Welcome: ${settings.welcome ? "ON" : "OFF"}
Goodbye: ${settings.goodbye ? "ON" : "OFF"}`,
      msg
    );

    return;
  }

  if (
    [
      "addxp",
      "addcoins",
      "setrank",
      "userstats"
    ].includes(lower)
  ) {
    if (!isOwner(sender)) {
      await reply(
        sock,
        jid,
        "🦇 Owner only.",
        msg
      );
      return;
    }

    let target =
      getMentionedJids(msg)[0] ||
      getReplyJid(msg);

    if (!target && args[0]) {
      const n = normalizeNumber(args[0]);
      if (n) target = `${n}@s.whatsapp.net`;
    }

    if (!target) {
      target = sender;
    }

    const targetUser =
      getUser(target, "Soul");

    if (lower === "addxp") {
      const amount =
        Number(args[1] || args[0] || 100);

      addXP(
        target,
        Number.isFinite(amount) ? amount : 100,
        targetUser.name
      );

      await reply(
        sock,
        jid,
        `🦇 Added XP to ${targetUser.name}.
⚡ XP: ${targetUser.xp}
📈 Level: ${targetUser.level}`,
        msg
      );
      return;
    }

    if (lower === "addcoins") {
      const amount =
        Number(args[1] || args[0] || 100);

      targetUser.coins +=
        Number.isFinite(amount)
          ? amount
          : 100;

      saveUsers();

      await reply(
        sock,
        jid,
        `🦇 Coins added.
🪙 Balance: ${targetUser.coins}`,
        msg
      );
      return;
    }

    if (lower === "setrank") {
      const rank =
        args.slice(1).join(" ") ||
        args.join(" ");

      if (!rank) {
        await reply(
          sock,
          jid,
          "🦇 Usage: setrank <number> <rank>",
          msg
        );
        return;
      }

      targetUser.rank = rank;
      saveUsers();

      await reply(
        sock,
        jid,
        `🦇 Rank set to: ${rank}`,
        msg
      );
      return;
    }

    await reply(
      sock,
      jid,
      `🦇 USER STATS

Name: ${targetUser.name}
Rank: ${targetUser.rank}
Level: ${targetUser.level}
XP: ${targetUser.xp}
Coins: ${targetUser.coins}
Wins: ${targetUser.wins}
Losses: ${targetUser.losses}`,
      msg
    );

    return;
  }

  if (
    lower === "joke" ||
    lower === "quote" ||
    lower === "8ball" ||
    lower === "compliment" ||
    lower === "roast" ||
    lower === "roastme" ||
    lower === "mood"
  ) {
    const responses = {
      joke: [
        "🦇 Why did the Reaper bring a ladder? To reach the next level.",
        "🦇 Death never gets tired. It has unlimited stamina.",
        "🦇 I told Death a joke. It died laughing."
      ],
      quote: [
        "🦇 I don't chase death. Death knows where to find me.",
        "🦇 Fear the silence before the Reaper speaks.",
        "🦇 Every soul leaves a shadow."
      ],
      compliment: [
        "🦇 Your soul burns brighter than most.",
        "🦇 Even the darkness noticed you.",
        "🦇 You have Reaper energy."
      ],
      roast: [
        "🦇 Even the shadows are embarrassed for you.",
        "🦇 Your enemies don't need weapons. They have you.",
        "🦇 The Reaper checked your stats and left disappointed."
      ],
      roastme: [
        "🦇 You asked the Reaper for a roast. Bold choice.",
        "🦇 Your Wi-Fi has more connection than your plans.",
        "🦇 Even your shadow needs distance."
      ],
      "8ball": [
        "🦇 The darkness says yes.",
        "🦇 The darkness says no.",
        "🦇 Ask again when the moon rises.",
        "🦇 The Reaper refuses to reveal that."
      ],
      mood: [
        "🦇 Current mood: DARK.",
        "🦇 Current mood: REAPING.",
        "🦇 Current mood: UNTOUCHABLE.",
        "🦇 Current mood: CHAOTIC."
      ]
    };

    const pool =
      responses[lower] ||
      responses.joke;

    await reply(
      sock,
      jid,
      random(pool),
      msg
    );

    return;
  }

  if (
    lower === "love" ||
    lower === "ship" ||
    lower === "truth" ||
    lower === "dare" ||
    lower === "hug" ||
    lower === "kiss" ||
    lower === "slap" ||
    lower === "punch" ||
    lower === "pat" ||
    lower === "poke" ||
    lower === "wink" ||
    lower === "dance" ||
    lower === "laugh" ||
    lower === "cry" ||
    lower === "happy" ||
    lower === "angry"
  ) {
    const target =
      getMentionedJids(msg)[0] ||
      getReplyJid(msg) ||
      "someone";

    const name =
      target === "someone"
        ? "someone"
        : `@${target.split("@")[0]}`;

    const actions = {
      love: `❤️ ${name} has been touched by the Reaper's love.`,
      ship: `🦇 ❤️ ${name} and ${user.name} have a mysterious connection.`,
      truth: "🦇 Truth: What is your biggest secret?",
      dare: "🦇 Dare: Challenge someone in this group.",
      hug: `🫂 ${user.name} hugs ${name}.`,
      kiss: `💋 ${user.name} sends a Reaper kiss to ${name}.`,
      slap: `🦇 ${user.name} slaps ${name}.`,
      punch: `🥊 ${user.name} punches ${name}.`,
      pat: `🦇 ${user.name} pats ${name}.`,
      poke: `👉 ${user.name} pokes ${name}.`,
      wink: `😉 ${user.name} winks at ${name}.`,
      dance: `💃 ${user.name} starts dancing.`,
      laugh: `😂 ${user.name} cannot stop laughing.`,
      cry: `😭 ${user.name} enters the darkness.`,
      happy: `😈 ${user.name} is feeling dangerous.`,
      angry: `😡 ${user.name} has awakened the rage.`
    };

    const message =
      actions[lower] ||
      "🦇 The Reaper watches.";

    if (target !== "someone") {
      await sock.sendMessage(
        jid,
        {
          text: message,
          mentions: [target]
        },
        { quoted: msg }
      );
    } else {
      await reply(
        sock,
        jid,
        message,
        msg
      );
    }

    return;
  }

  if (
    lower === "story" ||
    lower === "chapter" ||
    lower === "lore" ||
    lower === "chronicles"
  ) {
    await reply(
      sock,
      jid,
      `🦇 THE REAPER CHRONICLES

Chapter I — The Awakening

The world slept beneath a silent moon.

Then the darkness moved.

No warning.
No footsteps.
No voice.

Only a single message remained:

"I don't chase death. Death knows where to find me."

THE REAPER HAS AWAKENED.`,
      msg
    );

    return;
  }

  if (
    lower === "fight" ||
    lower === "battle" ||
    lower === "attack"
  ) {
    const damage =
      Math.floor(Math.random() * 91) + 10;

    const reward =
      Math.floor(damage * 2);

    user.coins += reward;

    addXP(
      sender,
      Math.floor(damage / 2),
      user.name
    );

    await reply(
      sock,
      jid,
      `⚔️ REAPER BATTLE

💥 Damage: ${damage}
🪙 Reward: ${reward} coins
⚡ XP gained: ${Math.floor(damage / 2)}`,
      msg
    );

    return;
  }

  if (
    lower === "power" ||
    lower === "blood" ||
    lower === "soul" ||
    lower === "shadow" ||
    lower === "ritual" ||
    lower === "summon" ||
    lower === "curse" ||
    lower === "bless"
  ) {
    const power =
      Math.floor(Math.random() * 900) + 100;

    addXP(
      sender,
      20,
      user.name
    );

    await reply(
      sock,
      jid,
      `🦇 ${lower.toUpperCase()}

☠️ Power generated: ${power}
⚡ +20 XP`,
      msg
    );

    return;
  }

  if (
    lower === "mission" ||
    lower === "quest" ||
    lower === "train"
  ) {
    const rewards = [
      "Defeat the shadow lurking beyond the gate.",
      "Collect three forgotten souls.",
      "Survive the Reaper's trial.",
      "Find the hidden artifact.",
      "Challenge the darkness."
    ];

    const mission =
      random(rewards);

    addXP(
      sender,
      15,
      user.name
    );

    await reply(
      sock,
      jid,
      `🦇 ${lower.toUpperCase()}

🎯 ${mission}

⚡ +15 XP`,
      msg
    );

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
    const prompt =
      args.join(" ").trim();

    if (!prompt) {
      await reply(
        sock,
        jid,
        `🦇 Usage: ${lower} <your text>`,
        msg
      );
      return;
    }

    await reply(
      sock,
      jid,
      `🦇 ${BOT_NAME} AI module

Your request was received:

"${prompt}"

⚠️ No external AI API is connected yet.`,
      msg
    );

    return;
  }

  if (
    lower === "play" ||
    lower === "yt" ||
    lower === "ytmp3" ||
    lower === "ytmp4" ||
    lower === "tiktok" ||
    lower === "ig" ||
    lower === "igdl" ||
    lower === "facebook" ||
    lower === "fbdl" ||
    lower === "twitter" ||
    lower === "twitterdl" ||
    lower === "movie" ||
    lower === "music" ||
    lower === "song" ||
    lower === "video" ||
    lower === "media" ||
    lower === "socialdl" ||
    lower === "aio" ||
    lower === "download" ||
    lower === "dload"
  ) {
    await reply(
      sock,
      jid,
      `🦇 Downloader command detected: ${lower}

⚠️ A real downloader API/service must be connected before this command can download media.`,
      msg
    );

    return;
  }

  if (
    lower === "sticker" ||
    lower === "toimage" ||
    lower === "toaudio" ||
    lower === "removebg" ||
    lower === "getpp" ||
    lower === "setpp" ||
    lower === "take" ||
    lower === "viewonce" ||
    lower === "qr" ||
    lower === "wallpaper" ||
    lower === "upload"
  ) {
    await reply(
      sock,
      jid,
      `🦇 Media command: ${lower}

⚠️ This command is registered and ready for its media module.`,
      msg
    );

    return;
  }

  if (lower === "support" || lower === "repo") {
    await reply(
      sock,
      jid,
      `🦇 THE REAPER

Repository:
prosperoifijen-crypto/KHAN-MD

Status: Online
Motto: I don't chase death. Death knows where to find me.`,
      msg
    );

    return;
  }

  if (lower === "random") {
    await reply(
      sock,
      jid,
      random([
        "🦇 A shadow just crossed behind you.",
        "🦇 The Reaper is watching.",
        "🦇 Something is moving in the darkness.",
        "🦇 Your next decision changes everything.",
        "🦇 The moon remembers every soul."
      ]),
      msg
    );

    return;
  }

  if (lower === "restart") {
    if (!isOwner(sender)) {
      await reply(
        sock,
        jid,
        "🦇 Owner only.",
        msg
      );
      return;
    }

    await reply(
      sock,
      jid,
      "🦇 Restarting The Reaper...",
      msg
    );

    setTimeout(
      () => process.exit(0),
      1000
    );

    return;
  }

  if (lower === "shutdown") {
    if (!isOwner(sender)) {
      await reply(
        sock,
        jid,
        "🦇 Owner only.",
        msg
      );
      return;
    }

    await reply(
      sock,
      jid,
      "🦇 The Reaper is shutting down.",
      msg
    );

    setTimeout(
      () => process.exit(0),
      1000
    );

    return;
  }

  if (
    lower === "block" ||
    lower === "unblock"
  ) {
    if (!isOwner(sender)) {
      await reply(
        sock,
        jid,
        "🦇 Owner only.",
        msg
      );
      return;
    }

    const target =
      getMentionedJids(msg)[0] ||
      getReplyJid(msg);

    if (!target) {
      await reply(
        sock,
        jid,
        `🦇 Reply to a user or mention them.\nExample: ${lower} @user`,
        msg
      );
      return;
    }

    try {
      await sock.updateBlockStatus(
        target,
        lower === "block"
          ? "block"
          : "unblock"
      );

      await reply(
        sock,
        jid,
        `🦇 ${lower} completed.`,
        msg
      );
    } catch {
      await reply(
        sock,
        jid,
        "🦇 WhatsApp rejected the request.",
        msg
      );
    }

    return;
  }

  if (lower === "protection") {
    await reply(
      sock,
      jid,
      `🦇 REAPER PROTECTION

Antilink: registered
Antibadword: registered
Antispam: registered
Antiflood: registered
Antibot: registered

⚠️ Protection modules require their individual configuration before automatic enforcement.`,
      msg
    );

    return;
  }

  if (ALL_COMMANDS.has(lower)) {
    await reply(
      sock,
      jid,
      `🦇 Command "${lower}" is registered.

Its full module is not enabled yet.`,
      msg
    );

    return;
  }

  await react(
    sock,
    jid,
    msg.key,
    "❌"
  );

  await reply(
    sock,
    jid,
    `❌ Unknown command: ${cmd}

🦇 Type menu to see all available commands.`,
    msg
  );
}

async function startBot() {
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    "./auth_info"
  );

  let version;

  try {
    const latest =
      await fetchLatestWaWebVersion();

    if (latest?.version) {
      version = latest.version;
      console.log(
        `Using WhatsApp Web version: ${version.join(".")}`
      );
    }
  } catch {
    console.log(
      "Could not fetch latest WhatsApp Web version."
    );
  }

  const sock =
    makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      logger: P({
        level: "silent"
      }),
      browser: [
        "The Reaper",
        "Chrome",
        "1.0.0"
      ],
      generateHighQualityLinkPreview: false
    });

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  sock.ev.on(
    "connection.update",
    async update => {
      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "open") {
        console.log(
          "🦇 THE REAPER HAS AWAKENED."
        );
        console.log(
          "🟢 WhatsApp connection established."
        );
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log(
          `🔴 WhatsApp connection closed. Code: ${statusCode || "unknown"}`
        );

        if (
          statusCode !==
          DisconnectReason.loggedOut
        ) {
          console.log(
            "♻️ Reconnecting..."
          );

          setTimeout(
            startBot,
            3000
          );
        } else {
          console.log(
            "⚠️ Logged out. Delete auth_info and pair again."
          );
        }
      }
    }
  );

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      try {
        const msg =
          messages?.[0];

        if (!msg?.message) {
          return;
        }

        const text =
          getText(msg);

        if (!text) {
          return;
        }

        const sender =
          jidFromMessage(msg);

        const jid =
          msg.key.remoteJid;

        const isGroup =
          jid.endsWith("@g.us");

        const pushName =
          msg.pushName ||
          "Soul";

        const user =
          getUser(
            sender,
            pushName
          );

        const prefix =
          getPrefix();

        let commandText =
          text.trim();

        if (
          commandText.startsWith(prefix)
        ) {
          commandText =
            commandText.slice(
              prefix.length
            ).trim();
        }

        if (!commandText) {
          return;
        }

        const parts =
          commandText.split(/\s+/);

        const cmd =
          parts.shift()?.toLowerCase();

        const args =
          parts;

        if (!cmd) {
          return;
        }

        await runCommand(
          sock,
          msg,
          cmd,
          args,
          user,
          sender,
          isGroup
        );
      } catch (error) {
        console.error(
          "Message handler error:",
          error
        );
      }
    }
  );

  if (
    !state.creds.registered &&
    process.env.PHONE_NUMBER
  ) {
    try {
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            3000
          )
      );

      const phone =
        normalizeNumber(
          process.env.PHONE_NUMBER
        );

      console.log(
        "Requesting WhatsApp pairing code..."
      );

      const code =
        await sock.requestPairingCode(
          phone
        );

      console.log(
        `🦇 PAIRING CODE: ${code}`
      );
      console.log(
        "Open WhatsApp → Linked Devices → Link a Device → Link with phone number instead."
      );
    } catch (error) {
      console.error(
        "Pairing code error:",
        error
      );
    }
  }
}

startBot().catch(
  console.error
);
