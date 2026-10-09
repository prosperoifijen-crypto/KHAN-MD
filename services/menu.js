import fs from "fs";
import path from "path";
import { COMMAND_CATEGORIES, getCommandCount } from "./commands.js";
import { aurelian } from "./config.js";
import { getMode } from "./mode.js";

const ROOT_DIR = path.join(process.cwd());
const BANNER_PATH = path.join(
  ROOT_DIR,
  "assets",
  "AURELIAN_BOT_BANNER.png"
);

const SYMBOL = "┃☬│𓁹";

export function getMenuBanner() {
  return {
    exists: fs.existsSync(BANNER_PATH),
    path: BANNER_PATH
  };
}

export function buildMenu() {
  const lines = [];
  const prefix = aurelian.prefix ?? ".";
  const mode = String(getMode() ?? "PUBLIC").toUpperCase();
  const status = aurelian.status ?? "Awakened";
  const commandCount = getCommandCount();

  const section = (title, commands = []) => {
    lines.push(`╔═〔 ☬ ${title} 〕═╗`);

    for (const command of commands) {
      lines.push(`${SYMBOL} ${prefix}${command}`);
    }

    lines.push(`╚═〔 ☬ ${title} 〕═╝`);
    lines.push("");
  };

  // PRIMORDIAL SYSTEM STATUS
  lines.push(`╔═〔 ☬ 𝙿𝚁𝙸𝙼𝙾𝚁𝙳𝙸𝙰𝙻 𝚂𝚈𝚂𝚃𝙴𝙼 〕═╗`);
  lines.push(`${SYMBOL} 𝙿𝚛𝚎𝚏𝚒𝚡 : ${prefix}`);
  lines.push(`${SYMBOL} 𝙼𝚘𝚍𝚎 : ${mode}`);
  lines.push(`${SYMBOL} 𝚂𝚝𝚊𝚝𝚞𝚜 : ${status}`);
  lines.push(`${SYMBOL} 𝙲𝚘𝚖𝚖𝚊𝚗𝚍𝚜 : ${commandCount}`);
  lines.push(`${SYMBOL} 𝚃𝚑𝚎𝚖𝚎 : 𝙳𝚊𝚛𝚔 𝙵𝚊𝚗𝚝𝚊𝚜𝚢 • 𝙲𝚎𝚕𝚎𝚜𝚝𝚒𝚊𝚕`);
  lines.push(`╚═〔 ☬ 𝙿𝚁𝙸𝙼𝙾𝚁𝙳𝙸𝙰𝙻 𝚂𝚈𝚂𝚃𝙴𝙼 〕═╝`);
  lines.push("");

  // BOT INTELLIGENCE — these are displayed only if registered.
  const allCommands = Object.values(COMMAND_CATEGORIES).flat();
  const intelligenceNames = [
    "menu", "help", "ping", "alive", "owner", "profile",
    "card", "runtime", "uptime", "status", "devices", "sessions"
  ];
  const intelligence = intelligenceNames.filter(name =>
    allCommands.some(command =>
      String(command).toLowerCase() === name
    )
  );

  section("𝙱𝙾𝚃 𝙸𝙽𝚃𝙴𝙻𝙻𝙸𝙶𝙴𝙽𝙲𝙴", intelligence);

  // PRIMORDIAL REALM — thematic commands, if registered.
  const realmNames = [
    "lore", "awakening", "power", "realm", "reign",
    "oracle", "immortal", "origin", "legend", "primordial"
  ];
  const realm = realmNames.filter(name =>
    allCommands.some(command => String(command).toLowerCase() === name)
  );

  if (realm.length) section("𝙿𝚁𝙸𝙼𝙾𝚁𝙳𝙸𝙰𝙻 𝚁𝙴𝙰𝙻𝙼", realm);

  // Every remaining category and registered command is preserved.
  const displayed = new Set([...intelligence, ...realm].map(x => x.toLowerCase()));

  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    const remaining = commands.filter(command =>
      !displayed.has(String(command).toLowerCase())
    );

    if (!remaining.length) continue;

    const heading = String(category)
      .replace(/[_-]+/g, " ")
      .toUpperCase();

    section(heading, remaining);
  }

  // AURELIAN SIGNATURE
  lines.push(`╔═〔 ☬ 𓁹 𝙰𝚄𝚁𝙴𝙻𝙸𝙰𝙽 𓁹 ☬ 〕═╗`);
  lines.push(`${SYMBOL} 𝔄𝔫𝔠𝔦𝔢𝔫𝔱 𝔓𝔬𝔴𝔢𝔯 • ℑ𝔪𝔪𝔬𝔯𝔱𝔞𝔩𝔦𝔱𝔶`);
  lines.push(`${SYMBOL} ℜ𝔢𝔟𝔦𝔯𝔱𝔥 • 𝔐𝔶𝔰𝔱𝔢𝔯𝔶`);

  const motto = String(
    aurelian.motto ??
    "I don't chase death. Death knows where to find me."
  );
  lines.push(`${SYMBOL} “${motto}”`);
  lines.push(`╚═〔 ☬ 𝙿𝚁𝙸𝙼𝙾𝚁𝙳𝙸𝙰𝙻 𝙻𝙾𝚁𝙳 〕═╝`);
  lines.push("");
  lines.push("⚡ 𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙿𝚛𝚘𝚜𝚔𝚒");

  return lines.map(line => `> ${line}`).join("\n");
}

export function getMenuMedia() {
  if (!fs.existsSync(BANNER_PATH)) {
    return null;
  }

  return {
    type: "image",
    path: BANNER_PATH
  };
}

export default buildMenu;
