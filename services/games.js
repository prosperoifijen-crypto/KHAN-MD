import { getUsers, saveUsers } from "./storage.js";

function ensureUser(jid, name = "User") {
  const users = getUsers();

  if (!users[jid]) {
    users[jid] = {
      jid,
      name,
      coins: 1000,
      bank: 0,
      inventory: [],
      wins: 0,
      losses: 0,
      games: 0
    };
  }

  users[jid].name = name || users[jid].name;

  saveUsers(users);
  return users[jid];
}

function saveUser(jid, user) {
  const users = getUsers();
  users[jid] = user;
  saveUsers(users);
}

function reward(user, amount) {
  user.coins += amount;
}

function lose(user, amount) {
  user.coins = Math.max(0, user.coins - amount);
}

function wallet(user) {
  return user.coins.toLocaleString();
}

/* ═══════════════════════════════════════
   PRIMORDIAL GAME UI
═══════════════════════════════════════ */

export function countdownFrame(number, game = "GAME") {
  const frames = {
    3: "༒══〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗖𝗢𝗨𝗡𝗧𝗗𝗢𝗪 〕══༒\n┃𖣔│𓁹 ⚔️ " + game + "\n┃𖣔│𓁹\n┃𖣔│𓁹              ③\n┃𖣔│𓁹\n༒════════════════════༒",
    2: "༒══〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗖𝗢𝗨𝗡𝗧𝗗𝗢𝗪 〕══༒\n┃𖣔│𓁹 ⚔️ " + game + "\n┃𖣔│𓁹\n┃𖣔│𓁹              ②\n┃𖣔│𓁹\n༒════════════════════༒",
    1: "༒══〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗖𝗢𝗨𝗡𝗧𝗗𝗢𝗪 〕══༒\n┃𖣔│𓁹 ⚔️ " + game + "\n┃𖣔│𓁹\n┃𖣔│𓁹              ①\n┃𖣔│𓁹\n༒════════════════════༒",
    0: "༒══〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗖𝗢𝗨𝗡𝗧𝗗𝗢𝗪 〕══༒\n┃𖣔│𓁹 ⚔️ " + game + "\n┃𖣔│𓁹\n┃𖣔│𓁹          ⚡ 𝗕𝗘𝗚𝗜𝗡 ⚡\n┃𖣔│𓁹\n༒════════════════════༒"
  };

  return frames[number] || frames[0];
}

export function getCountdownFrames(game = "GAME") {
  return [3, 2, 1, 0].map(number => countdownFrame(number, game));
}

export function gameHeader(title, subtitle = "THE PRIMORDIAL LORD") {
  return [
    `╭━━━〔 𖣔 𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗚𝗔𝗠𝗘𝗦 𖣔 〕━━━╮`,
    `┃ 𖣔 ${title}`,
    `┃ 𖣔 ${subtitle}`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━╯`
  ].join("\n");
}

export function gameResult(title, lines = []) {
  return [
    `╭━━━〔 𖣔 ${title} 𖣔 〕━━━╮`,
    ...lines.map(line => `┃𖣔│𓁹 ${line}`),
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  ].join("\n");
}

/* ═══════════════════════════════════════
   ROCK PAPER SCISSORS
═══════════════════════════════════════ */

export function rps(jid, choice, name = "User") {
  const user = ensureUser(jid, name);

  const choices = ["rock", "paper", "scissors"];

  const aliases = {
    r: "rock",
    rock: "rock",
    p: "paper",
    paper: "paper",
    s: "scissors",
    scissors: "scissors"
  };

  choice = aliases[String(choice || "").toLowerCase()];

  if (!choice) {
    return gameResult("𝗥𝗣𝗦", [
      "⚠️ Invalid choice.",
      "Use: !rps rock | paper | scissors"
    ]);
  }

  const bot = choices[Math.floor(Math.random() * choices.length)];

  let result;
  let resultIcon;

  if (choice === bot) {
    result = "DRAW";
    resultIcon = "⚖️";
  } else if (
    (choice === "rock" && bot === "scissors") ||
    (choice === "paper" && bot === "rock") ||
    (choice === "scissors" && bot === "paper")
  ) {
    result = "VICTORY";
    resultIcon = "🏆";

    user.wins++;
    reward(user, 150);
  } else {
    result = "DEFEAT";
    resultIcon = "💀";

    user.losses++;
    lose(user, 75);
  }

  user.games++;
  saveUser(jid, user);

  return gameResult("𝗥𝗢𝗖𝗞 • 𝗣𝗔𝗣𝗘𝗥 • 𝗦𝗖𝗜𝗦𝗦𝗢𝗥𝗦", [
    `👤 ${user.name}`,
    `🎮 Your Move: ${choice}`,
    `𖣔 Aurelian: ${bot}`,
    "",
    `${resultIcon} ${result}`,
    `🪙 Wallet: ${wallet(user)}`
  ]);
}

/* ═══════════════════════════════════════
   DICE DUEL
═══════════════════════════════════════ */

export function dice(jid, name = "User") {
  const user = ensureUser(jid, name);

  const player = Math.floor(Math.random() * 6) + 1;
  const bot = Math.floor(Math.random() * 6) + 1;

  let result;

  if (player > bot) {
    result = "🏆 VICTORY";
    user.wins++;
    reward(user, 100);
  } else if (player < bot) {
    result = "💀 DEFEAT";
    user.losses++;
    lose(user, 50);
  } else {
    result = "⚖️ DRAW";
  }

  user.games++;
  saveUser(jid, user);

  return gameResult("𝗗𝗜𝗖𝗘 𝗗𝗨𝗘𝗟", [
    `👤 ${user.name}`,
    `🎲 Your Roll: ${player}`,
    `𖣔 Aurelian: ${bot}`,
    "",
    result,
    `🪙 Wallet: ${wallet(user)}`
  ]);
}

/* ═══════════════════════════════════════
   COIN FLIP
═══════════════════════════════════════ */

export function coinflip(jid, choice, name = "User") {
  const user = ensureUser(jid, name);

  const selected = String(choice || "").toLowerCase();

  if (!["heads", "tails", "h", "t"].includes(selected)) {
    return gameResult("𝗖𝗢𝗜𝗡 𝗢𝗙 𝗙𝗔𝗧𝗘", [
      "⚠️ Invalid choice.",
      "Use: !coinflip heads | tails"
    ]);
  }

  const pick = selected.startsWith("h") ? "heads" : "tails";
  const result = Math.random() < 0.5 ? "heads" : "tails";

  const won = pick === result;

  if (won) {
    user.wins++;
    reward(user, 100);
  } else {
    user.losses++;
    lose(user, 50);
  }

  user.games++;
  saveUser(jid, user);

  return gameResult("𝗖𝗢𝗜𝗡 𝗢𝗙 𝗙𝗔𝗧𝗘", [
    `👤 ${user.name}`,
    `🎯 Your Choice: ${pick}`,
    `🪙 The Coin: ${result}`,
    "",
    won ? "🏆 VICTORY" : "💀 DEFEAT",
    `💰 Wallet: ${wallet(user)}`
  ]);
}

/* ═══════════════════════════════════════
   SOUL SLOTS
═══════════════════════════════════════ */

export function slots(jid, name = "User") {
  const user = ensureUser(jid, name);

  const symbols = ["🍒", "🍋", "💎", "👑", "🔥", "☠️"];

  const spin = () =>
    Array.from(
      { length: 3 },
      () => symbols[Math.floor(Math.random() * symbols.length)]
    );

  const result = spin();

  const triple =
    result[0] === result[1] &&
    result[1] === result[2];

  const pair =
    result[0] === result[1] ||
    result[1] === result[2] ||
    result[0] === result[2];

  let rewardAmount = 0;
  let message = "💀 NOTHING MATCHED";

  if (triple) {
    rewardAmount = 500;
    message = "👑 JACKPOT!";
    user.wins++;
  } else if (pair) {
    rewardAmount = 100;
    message = "✨ TWO MATCHED!";
    user.wins++;
  } else {
    user.losses++;
    lose(user, 25);
  }

  reward(user, rewardAmount);
  user.games++;

  saveUser(jid, user);

  return gameResult("𝗦𝗢𝗨𝗟 𝗦𝗟𝗢𝗧𝗦", [
    `🎰 ${result.join(" │ ")}`,
    "",
    message,
    `🪙 Reward: +${rewardAmount}`,
    `💰 Wallet: ${wallet(user)}`
  ]);
}

/* ═══════════════════════════════════════
   PRIMORDIAL BATTLE
═══════════════════════════════════════ */

export function battle(jid, opponent = "Aurelian", name = "User") {
  const user = ensureUser(jid, name);

  const playerPower = Math.floor(Math.random() * 100) + 1;
  const enemyPower = Math.floor(Math.random() * 100) + 1;

  const won = playerPower > enemyPower;

  if (won) {
    user.wins++;
    reward(user, 300);
  } else {
    user.losses++;
    lose(user, 100);
  }

  user.games++;
  saveUser(jid, user);

  return gameResult("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗕𝗔𝗧𝗧𝗟𝗘", [
    `⚔️ ${user.name}`,
    `𖣔 ${opponent}`,
    "",
    `🔥 Your Power: ${playerPower}`,
    `☠️ Enemy Power: ${enemyPower}`,
    "",
    won ? "🏆 VICTORY" : "💀 DEFEAT",
    `🪙 Wallet: ${wallet(user)}`
  ]);
}

/* ═══════════════════════════════════════
   SOUL RANK
═══════════════════════════════════════ */

export function getRank(jid, name = "User") {
  const user = ensureUser(jid, name);

  const total = user.wins + user.losses;

  let rank = "Mortal";

  if (user.wins >= 50) {
    rank = "Primordial Lord";
  } else if (user.wins >= 25) {
    rank = "Eternal";
  } else if (user.wins >= 10) {
    rank = "Ascended";
  } else if (user.wins >= 5) {
    rank = "Awakened";
  }

  return gameResult("𝗦𝗢𝗨𝗟 𝗥𝗔𝗡𝗞", [
    `👤 ${user.name}`,
    `👑 Rank: ${rank}`,
    `🏆 Wins: ${user.wins}`,
    `💀 Losses: ${user.losses}`,
    `🎮 Games: ${total}`,
    `🪙 Wallet: ${wallet(user)}`
  ]);
}

/* ═══════════════════════════════════════
   RANDOM NUMBER
═══════════════════════════════════════ */

export function randomNumber(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

/* ═══════════════════════════════════════
   EXPORTS
═══════════════════════════════════════ */

export default {
  rps,
  dice,
  coinflip,
  slots,
  battle,
  getRank,
  randomNumber,
  countdownFrame,
  getCountdownFrames,
  gameHeader,
  gameResult
};
