import { getUsers, saveUsers } from "./storage.js";

const STARTING_COINS = 1000;
const DAILY_REWARD = 500;
const WEEKLY_REWARD = 2500;

function ensureUser(jid, name = "User") {
  const users = getUsers();

  if (!users[jid]) {
    users[jid] = {
      jid,
      name,
      coins: STARTING_COINS,
      bank: 0,
      inventory: [],
      wins: 0,
      losses: 0,
      lastDaily: 0,
      lastWeekly: 0,
      createdAt: new Date().toISOString()
    };
  }

  if (!Array.isArray(users[jid].inventory)) {
    users[jid].inventory = [];
  }

  saveUsers(users);
  return users[jid];
}

export function getUser(jid, name = "User") {
  return ensureUser(jid, name);
}

export function getBalance(jid, name = "User") {
  const user = ensureUser(jid, name);

  return `> ╭━━━〔 𖣔 𝗦𝗢𝗨𝗟 𝗪𝗘𝗔𝗟𝗧𝗛 𖣔 〕━━━╮
> ┃𖣔│𓁹 👤 ${user.name}
> ┃𖣔│𓁹 🪙 Wallet: ${user.coins.toLocaleString()}
> ┃𖣔│𓁹 🏦 Bank: ${user.bank.toLocaleString()}
> ┃𖣔│𓁹 💰 Total: ${(user.coins + user.bank).toLocaleString()}
> ╰━━━━━━━━━━━━━━━━━━━━╯
> ☠️ AURELIAN • THE PRIMORDIAL LORD`;
}

export function claimDaily(jid, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (now - user.lastDaily < cooldown) {
    const remaining = cooldown - (now - user.lastDaily);
    const hours = Math.ceil(remaining / (60 * 60 * 1000));

    return `> ⚠️ Daily reward already claimed.\n> 🕒 Return in about ${hours}h.`;
  }

  user.coins += DAILY_REWARD;
  user.lastDaily = now;

  users[jid] = user;
  saveUsers(users);

  return `> ╭━━━〔 𖣔 𝗗𝗔𝗜𝗟𝗬 𝗧𝗥𝗜𝗕𝗨𝗧𝗘 𖣔 〕━━━╮
> ┃𖣔│𓁹 🪙 Reward: +${DAILY_REWARD.toLocaleString()}
> ┃𖣔│𓁹 💰 Wallet: ${user.coins.toLocaleString()}
> ╰━━━━━━━━━━━━━━━━━━━━╯
> ☠️ The Primordial Lord has granted your tribute.`;
}

export function claimWeekly(jid, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);
  const now = Date.now();
  const cooldown = 7 * 24 * 60 * 60 * 1000;

  if (now - user.lastWeekly < cooldown) {
    const remaining = cooldown - (now - user.lastWeekly);
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));

    return `> ⚠️ Weekly reward already claimed.\n> 🕒 Return in about ${days}d.`;
  }

  user.coins += WEEKLY_REWARD;
  user.lastWeekly = now;

  users[jid] = user;
  saveUsers(users);

  return `> ╭━━━〔 𖣔 𝗪𝗘𝗘𝗞𝗟𝗬 𝗧𝗥𝗜𝗕𝗨𝗧𝗘 𖣔 〕━━━╮
> ┃𖣔│𓁹 🪙 Reward: +${WEEKLY_REWARD.toLocaleString()}
> ┃𖣔│𓁹 💰 Wallet: ${user.coins.toLocaleString()}
> ╰━━━━━━━━━━━━━━━━━━━━╯
> ☠️ Aurelian has recognized your devotion.`;
}

export function work(jid, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);

  const jobs = [
    ["🗡️ Reaper Hunt", 150, 500],
    ["🏰 Guard the Realm", 200, 600],
    ["🌑 Harvest Shadows", 250, 700],
    ["⚔️ Primordial Mission", 300, 900]
  ];

  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const reward =
    Math.floor(Math.random() * (job[2] - job[1] + 1)) + job[1];

  user.coins += reward;
  users[jid] = user;
  saveUsers(users);

  return `> ╭━━━〔 𖣔 𝗪𝗢𝗥𝗞 𝗥𝗘𝗪𝗔𝗥𝗗 𖣔 〕━━━╮
> ┃𖣔│𓁹 ${job[0]}
> ┃𖣔│𓁹 🪙 Earned: +${reward.toLocaleString()}
> ┃𖣔│𓁹 💰 Wallet: ${user.coins.toLocaleString()}
> ╰━━━━━━━━━━━━━━━━━━━━╯`;
}

export function deposit(jid, amount, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);

  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "> ⚠️ Enter a valid amount.";
  }

  if (amount > user.coins) {
    return "> ⚠️ You do not have enough coins.";
  }

  user.coins -= amount;
  user.bank += amount;

  users[jid] = user;
  saveUsers(users);

  return `> 🏦 Deposited ${amount.toLocaleString()} coins.\n> 💰 Wallet: ${user.coins.toLocaleString()}\n> 🏦 Bank: ${user.bank.toLocaleString()}`;
}

export function withdraw(jid, amount, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);

  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "> ⚠️ Enter a valid amount.";
  }

  if (amount > user.bank) {
    return "> ⚠️ You do not have enough coins in the bank.";
  }

  user.bank -= amount;
  user.coins += amount;

  users[jid] = user;
  saveUsers(users);

  return `> 🏦 Withdrew ${amount.toLocaleString()} coins.\n> 💰 Wallet: ${user.coins.toLocaleString()}\n> 🏦 Bank: ${user.bank.toLocaleString()}`;
}

export function addCoins(jid, amount, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);

  user.coins += Number(amount) || 0;

  users[jid] = user;
  saveUsers(users);

  return user;
}

export function removeCoins(jid, amount, name = "User") {
  const users = getUsers();
  const user = ensureUser(jid, name);

  user.coins = Math.max(0, user.coins - (Number(amount) || 0));

  users[jid] = user;
  saveUsers(users);

  return user;
}

export function getLeaderboard(limit = 10) {
  const users = getUsers();

  const ranking = Object.values(users)
    .sort((a, b) =>
      (b.coins + b.bank) - (a.coins + a.bank)
    )
    .slice(0, limit);

  if (!ranking.length) {
    return "> ⚠️ No economy users yet.";
  }

  const lines = ranking.map((user, index) =>
    `> ${index + 1}. 👑 ${user.name || "User"} — ${(user.coins + user.bank).toLocaleString()}`
  );

  return `> ╭━━━〔 𖣔 𝗦𝗢𝗨𝗟 𝗟𝗘𝗔𝗗𝗘𝗥𝗕𝗢𝗔𝗥𝗗 𖣔 〕━━━╮
> ┃𖣔│𓁹 The richest souls of the realm
> ╰━━━━━━━━━━━━━━━━━━━━╯
${lines.join("\n")}
>
> ☠️ AURELIAN • THE PRIMORDIAL LORD`;
}

export default {
  getUser,
  getBalance,
  claimDaily,
  claimWeekly,
  work,
  deposit,
  withdraw,
  addCoins,
  removeCoins,
  getLeaderboard
};
