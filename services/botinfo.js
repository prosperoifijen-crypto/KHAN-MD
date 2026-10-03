import os from "os";
import { aurelian, services } from "./config.js";
import { getMode } from "./mode.js";
import { getCommandCount } from "./commands.js";
import { formatUptime } from "./utils.js";

const startedAt = Date.now();

export function getBotInfo() {
  return {
    name: aurelian.botName,
    title: aurelian.title,
    alias: aurelian.alias,
    status: aurelian.status,
    prefix: aurelian.prefix,
    mode: getMode(),
    commands: getCommandCount(),
    platform: process.platform,
    node: process.version
  };
}

export function getStatus() {
  const memory = process.memoryUsage();

  return `༒══〔 𖣔 𝗦𝗧𝗔𝗧𝗨𝗦 〕══༒
┃𖣔│𓁹 Bot: ${aurelian.botName}
┃𖣔│𓁹 Title: ${aurelian.title}
┃𖣔│𓁹 Status: ${aurelian.status}
┃𖣔│𓁹 Mode: ${getMode().toUpperCase()}
┃𖣔│𓁹 Commands: ${getCommandCount()}
┃𖣔│𓁹 Node: ${process.version}
┃𖣔│𓁹 Platform: ${process.platform}
┃𖣔│𓁹 RAM: ${Math.round(memory.rss / 1024 / 1024)} MB
༒════════════════════༒`;
}

export function getRuntime() {
  return `༒══〔 𖣔 𝗥𝗨𝗡𝗧𝗜𝗠𝗘 〕══༒
┃𖣔│𓁹 Uptime: ${formatUptime(process.uptime())}
┃𖣔│𓁹 Node: ${process.version}
┃𖣔│𓁹 Platform: ${process.platform}
┃𖣔│𓁹 Architecture: ${process.arch}
┃𖣔│𓁹 Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB
༒════════════════════༒`;
}

export function getUptime() {
  return `༒══〔 𖣔 𝗨𝗣𝗧𝗜𝗠𝗘 〕══༒
┃𖣔│𓁹 ${formatUptime(process.uptime())}
༒════════════════════༒`;
}

export function getAlive() {
  return `༒══〔 𖣔 𝗔𝗟𝗜𝗩𝗘 〕══༒
┃𖣔│𓁹 ☠️ ${aurelian.botName} IS AWAKE
┃𖣔│𓁹 ${aurelian.title}
┃𖣔│𓁹 Status: ${aurelian.status}
┃𖣔│𓁹 Uptime: ${formatUptime(process.uptime())}
༒════════════════════༒`;
}

export function getPingStart() {
  return process.hrtime.bigint();
}

export function getPing(start) {
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;

  return `༒══〔 𖣔 𝗣𝗜𝗡𝗚 〕══༒
┃𖣔│𓁹 Response: ${elapsed.toFixed(2)} ms
┃𖣔│𓁹 Status: ONLINE
༒════════════════════༒`;
}

export function getSystemInfo() {
  return {
    hostname: os.hostname(),
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    cpus: os.cpus().length,
    memory: os.totalmem()
  };
}

export function getServicesStatus() {
  return {
    ai: services.ai?.enabled ?? false,
    news: services.news?.enabled ?? false,
    weather: services.weather?.enabled ?? false,
    youtube: services.youtube?.enabled ?? false,
    tiktok: services.tiktok?.enabled ?? false,
    instagram: services.instagram?.enabled ?? false,
    facebook: services.facebook?.enabled ?? false,
    media: services.media?.enabled ?? false,
    pairing: services.pairing?.enabled ?? false,
    multiSession: services.pairing?.multiSession ?? false
  };
}

export default {
  getBotInfo,
  getStatus,
  getRuntime,
  getUptime,
  getAlive,
  getPingStart,
  getPing,
  getSystemInfo,
  getServicesStatus
};
