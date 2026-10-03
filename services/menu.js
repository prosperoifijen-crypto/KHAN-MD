import fs from "fs";
import path from "path";
import { COMMAND_CATEGORIES, getCommandCount } from "./commands.js";
import { aurelian } from "./config.js";
import { getMode } from "./mode.js";

const ROOT_DIR = path.join(process.cwd());
const BANNER_PATH = path.join(
  ROOT_DIR,
  "assets",
  "THE_REAPER_MD_BOT_BANNER.png"
);

const SYMBOL = "┃𖣔│𓁹";

export function getMenuBanner() {
  return {
    exists: fs.existsSync(BANNER_PATH),
    path: BANNER_PATH
  };
}

export function buildMenu() {
  const lines = [];

  lines.push("╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮");
  lines.push("        𖣔 𓁹 𖣔");
  lines.push(`      ${aurelian.botName}`);
  lines.push(`   ${aurelian.title}`);
  lines.push(`   ${aurelian.alias}`);
  lines.push("╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯");

  lines.push("");
  lines.push("༒══〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗦𝗬𝗦𝗧𝗘𝗠 〕══༒");
  lines.push(`${SYMBOL} Prefix: ${aurelian.prefix}`);
  lines.push(`${SYMBOL} Mode: ${getMode().toUpperCase()}`);
  lines.push(`${SYMBOL} Status: ${aurelian.status}`);
  lines.push(`${SYMBOL} Commands: ${getCommandCount()}`);
  lines.push(`${SYMBOL} Theme: Dark Fantasy • Celestial`);
  lines.push("༒════════════════════════════༒");

  lines.push("");

  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    lines.push(`༒══〔 𖣔 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬 • ${category} 〕══༒`);

    for (const command of commands) {
      lines.push(`${SYMBOL} ${aurelian.prefix}${command}`);
    }

    lines.push("༒════════════════════════════༒");
  }

  lines.push("");
  lines.push("╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮");
  lines.push(`┃ 𖣔 ${aurelian.botName}`);
  lines.push(`┃ 𖣔 ${aurelian.title}`);
  lines.push("┃");
  lines.push(`┃ ☠️ ${aurelian.motto}`);
  lines.push("╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯");

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
