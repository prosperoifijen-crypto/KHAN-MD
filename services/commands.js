export const COMMAND_CATEGORIES = {
  "BOT INFO": [
    "menu", "help", "ping", "alive", "owner", "profile", "card",
    "runtime", "uptime", "status", "devices", "sessions"
  ],

  "PRIMORDIAL": [
    "lore", "awakening", "power", "realm", "reign",
    "oracle", "immortal", "origin", "legend", "primordial"
  ],

  "DARKNESS": [
    "darkness", "shadow", "curse", "doom", "void",
    "soul", "fear", "death", "abyss"
  ],

  "AI & CHAT": [
    "ai", "ask", "chat", "translate", "summarize",
    "imagine", "rewrite", "explain", "code",
    "chatbot"
  ],

  "GROUP": [
    "add", "kick", "promote", "demote", "tagall",
    "hidetag", "groupinfo", "link", "revoke", "setname",
    "setdesc", "welcome", "goodbye", "mute", "unmute",
    "join", "hijack", "gcstatus", "gclist"
  ],

  "DOWNLOADERS": [
    "yt", "yta", "ytv", "tiktok", "instagram",
    "facebook", "twitter", "mediafire", "apk", "play"
  ],

  "MEDIA & CONVERTERS": [
    "sticker", "toimg", "tomp3", "tomp4", "gif",
    "take", "resize", "blur", "tts", "qr"
  ],

  "FUN & SOCIAL": [
    "meme", "joke", "quote", "fact", "ship",
    "rate", "truth", "dare", "roast", "compliment", "8ball"
  ],

  "GAMES": [
    "rps", "dice", "coinflip", "guess", "trivia",
    "quiz", "battle", "hunt", "duel", "adventure",
    "rank", "slots", "casino"
  ],

  "ECONOMY": [
    "balance", "daily", "weekly", "work", "crime",
    "rob", "deposit", "withdraw", "shop", "inventory",
    "sell", "leaderboard"
  ],

  "PROTECTION": [
    "antihijack", "antipromote", "antidemote", "antilink",
    "antispam", "antibot", "antitag", "antiraid"
  ],

  "AUTOMATION": [
    "autoread", "autotyping", "autorecording", "autoview",
    "autostatus", "autobio", "autolike"
  ],

  "SETTINGS": [
    "prefix", "mode", "setbio", "setname", "setstatus",
    "setmenu", "timezone"
  ],

  "OWNER": [
    "broadcast", "bcgroup", "eval", "exec", "restart",
    "shutdown", "update", "setpp", "block", "unblock"
  ],

  "NEWSLETTER": [
    "news", "headlines", "technews", "sports"
  ],

  "BUGS & REPORTS": [
    "bug", "report", "request", "suggest"
  ],

  "OTHER": [
    "weather", "time", "calc", "short",
    "github", "google", "wikipedia"
  ]
};

export const ALL_COMMANDS = new Set(
  Object.values(COMMAND_CATEGORIES).flat()
);

export function getCommandCount() {
  return ALL_COMMANDS.size;
}

export function getCategory(command) {
  const lower = command.toLowerCase();

  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    if (commands.includes(lower)) {
      return category;
    }
  }

  return null;
}

export function hasCommand(command) {
  return ALL_COMMANDS.has(command.toLowerCase());
}
