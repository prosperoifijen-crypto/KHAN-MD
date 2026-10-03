export function formatUptime(seconds) {
  seconds = Math.floor(seconds);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

export function formatNumber(number) {
  return Number(number || 0).toLocaleString("en-US");
}

export function now() {
  return new Date();
}

export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
