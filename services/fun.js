import { randomItem } from "./utils.js";

/* ═══════════════════════════════════════
   AURELIAN • FUN & SOCIAL SERVICE
   THE PRIMORDIAL LORD
═══════════════════════════════════════ */

const jokes = [
  "Why did the shadow refuse to fight Aurelian? It already knew who would win. ☠️",
  "A mortal asked Aurelian for eternal life. Aurelian asked, 'Are you sure you can handle Monday forever?' 😭",
  "The primordial lord walked into a dark room. The darkness apologized for being there. 🦇",
  "Aurelian does not need a map. Realms arrange themselves around him. 👑",
  "A vampire tried to scare Aurelian. It became his bodyguard instead. 💀"
];

const quotes = [
  "Power does not announce itself. It simply arrives. — Aurelian",
  "The ancient do not fear the darkness. The darkness remembers them. — Aurelian",
  "I do not chase the throne. The throne remembers me. — Aurelian",
  "Creation and destruction are merely two sides of the same eternal blade.",
  "Those who understand silence often understand power."
];

const facts = [
  "Aurelian is known as THE PRIMORDIAL LORD.",
  "His title is THE FIRST ETERNAL.",
  "His power is described as Light • Shadow • Eternity.",
  "His weapon is the Celestial Blade.",
  "His nature is that of a Divine Primordial Being.",
  "His alignment is unknown.",
  "His age is unknown.",
  "His weakness is his own hunger."
];

const truths = [
  "What is one secret you have never told anyone?",
  "Who was the last person you genuinely trusted?",
  "What is your biggest fear?",
  "Have you ever pretended to be okay when you were not?",
  "What is one thing you would change about yourself?",
  "Who do you miss right now?",
  "What is your biggest hidden ambition?"
];

const dares = [
  "Send the last emoji you used 10 times. 😂",
  "Change your WhatsApp status for the next 10 minutes.",
  "Tag someone and call them your eternal rival. ⚔️",
  "Send a voice note saying: 'The Primordial Lord has awakened.'",
  "Let another player choose your next profile status.",
  "Send your funniest selfie to the group.",
  "Write a dramatic royal speech in the group."
];

const roasts = [
  "You have the confidence of a primordial lord and the strategy of a confused mortal. 💀",
  "Even your shadow is trying to distance itself from you. ☠️",
  "Aurelian has encountered ancient civilizations older than your attention span. 😭",
  "Your luck is so weak that even a coin refuses to flip for you.",
  "If confidence were power, you would almost be dangerous. 😂"
];

const compliments = [
  "Your presence has the energy of someone destined for something greater. 👑",
  "Even the darkness would make room for you. 🖤",
  "You carry yourself like someone who refuses to surrender.",
  "There is something genuinely powerful about your determination. ⚡",
  "Your energy is rare. Protect it."
];

const eightBallAnswers = [
  "☠️ The Primordial Lord sees victory in your path.",
  "𖣔 The answer is hidden within the shadows.",
  "👑 The ancient realm says YES.",
  "💀 The ancient realm says NO.",
  "⚡ The outcome is uncertain. Try again.",
  "🦇 The darkness has not revealed its answer.",
  "𓁹 The answer is closer than you think.",
  "༒ Fate says: absolutely."
];

function normalizeName(name) {
  return String(name || "Unknown").trim() || "Unknown";
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function seededNumber(text = "") {
  let hash = 0;

  for (const char of String(text)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function box(title, lines = []) {
  return [
    `╭━━━〔 𖣔 ${title} 𖣔 〕━━━╮`,
    ...lines.map(line => `┃𖣔│𓁹 ${line}`),
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  ].join("\n");
}

/* ═══════════════════════════════════════
   MEME
═══════════════════════════════════════ */

export function meme() {
  return box("𝗔𝗨𝗥𝗘𝗟𝗜𝗔𝗡 𝗠𝗘𝗠𝗘", [
    "🦇 When the group gets quiet...",
    "",
    "𖣔 Aurelian: 'Interesting.'",
    "💀 Everyone else: 'We should probably leave.'",
    "",
    "☠️ THE PRIMORDIAL LORD IS WATCHING."
  ]);
}

/* ═══════════════════════════════════════
   JOKE
═══════════════════════════════════════ */

export function joke() {
  return box("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗝𝗢𝗞𝗘", [
    `😂 ${randomItem(jokes)}`
  ]);
}

/* ═══════════════════════════════════════
   QUOTE
═══════════════════════════════════════ */

export function quote() {
  return box("𝗔𝗨𝗥𝗘𝗟𝗜𝗔𝗡 𝗤𝗨𝗢𝗧𝗘", [
    `𖣔 ${randomItem(quotes)}`
  ]);
}

/* ═══════════════════════════════════════
   FACT
═══════════════════════════════════════ */

export function fact() {
  return box("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗙𝗔𝗖𝗧", [
    `𓁹 ${randomItem(facts)}`
  ]);
}

/* ═══════════════════════════════════════
   SHIP
═══════════════════════════════════════ */

export function ship(name1 = "Player One", name2 = "Player Two") {
  const a = normalizeName(name1);
  const b = normalizeName(name2);

  const score = seededNumber(`${a.toLowerCase()}::${b.toLowerCase()}`) % 101;

  let verdict;

  if (score >= 90) {
    verdict = "💍 ETERNAL BOND";
  } else if (score >= 75) {
    verdict = "❤️ VERY STRONG";
  } else if (score >= 55) {
    verdict = "💕 POSSIBLE";
  } else if (score >= 35) {
    verdict = "💔 UNSTABLE";
  } else {
    verdict = "☠️ CHAOS";
  }

  return box("𝗦𝗢𝗨𝗟 𝗦𝗛𝗜𝗣", [
    `👤 ${a}`,
    `👤 ${b}`,
    "",
    `❤️ Compatibility: ${score}%`,
    `𖣔 Verdict: ${verdict}`
  ]);
}

/* ═══════════════════════════════════════
   RATE
═══════════════════════════════════════ */

export function rate(target = "You") {
  const name = normalizeName(target);
  const score = seededNumber(name.toLowerCase()) % 101;

  let title;

  if (score >= 90) {
    title = "👑 PRIMORDIAL LEVEL";
  } else if (score >= 75) {
    title = "⚡ ASCENDED";
  } else if (score >= 50) {
    title = "𖣔 AWAKENED";
  } else {
    title = "💀 MORTAL";
  }

  return box("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗥𝗔𝗧𝗘", [
    `👤 ${name}`,
    "",
    `⚡ Rating: ${score}/100`,
    `𖣔 Level: ${title}`
  ]);
}

/* ═══════════════════════════════════════
   TRUTH
═══════════════════════════════════════ */

export function truth() {
  return box("𝗧𝗥𝗨𝗧𝗛", [
    `🧠 ${randomItem(truths)}`
  ]);
}

/* ═══════════════════════════════════════
   DARE
═══════════════════════════════════════ */

export function dare() {
  return box("𝗗𝗔𝗥𝗘", [
    `⚔️ ${randomItem(dares)}`
  ]);
}

/* ═══════════════════════════════════════
   ROAST
═══════════════════════════════════════ */

export function roast(target = "You") {
  const name = normalizeName(target);

  return box("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝗥𝗢𝗔𝗦𝗧", [
    `🎯 Target: ${name}`,
    "",
    `🔥 ${randomItem(roasts)}`
  ]);
}

/* ═══════════════════════════════════════
   COMPLIMENT
═══════════════════════════════════════ */

export function compliment(target = "You") {
  const name = normalizeName(target);

  return box("𝗗𝗜𝗩𝗜𝗡𝗘 𝗖𝗢𝗠𝗣𝗟𝗜𝗠𝗘𝗡𝗧", [
    `👤 ${name}`,
    "",
    `✨ ${randomItem(compliments)}`
  ]);
}

/* ═══════════════════════════════════════
   8BALL
═══════════════════════════════════════ */

export function eightBall(question = "") {
  const q = String(question || "").trim();

  if (!q) {
    return box("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝟴𝗕𝗔𝗟𝗟", [
      "⚠️ Ask a question.",
      "",
      "Example: !8ball Will I become powerful?"
    ]);
  }

  return box("𝗣𝗥𝗜𝗠𝗢𝗥𝗗𝗜𝗔𝗟 𝟴𝗕𝗔𝗟𝗟", [
    `❓ ${q}`,
    "",
    `𓁹 ${randomItem(eightBallAnswers)}`
  ]);
}

/* ═══════════════════════════════════════
   ALIASES
═══════════════════════════════════════ */

export const eightball = eightBall;

/* ═══════════════════════════════════════
   EXPORTS
═══════════════════════════════════════ */

export default {
  meme,
  joke,
  quote,
  fact,
  ship,
  rate,
  truth,
  dare,
  roast,
  compliment,
  eightBall,
  eightball
};
