export function box(title, content = "") {
  return [
    `༒══〔 𖣔 ${title} 〕══༒`,
    content,
    `༒════════════════════༒`
  ].filter(Boolean).join("\n");
}

export function success(title, content = "") {
  return box(`𓁹 ${title}`, `┃𖣔│ ${content}`);
}

export function error(title, content = "") {
  return box(`⚠️ ${title}`, `┃𖣔│ ${content}`);
}

export function info(title, content = "") {
  return box(`𓁹 ${title}`, `┃𖣔│ ${content}`);
}

export function divider() {
  return "༒════════════════════༒";
}
