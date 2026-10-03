import { loadJSON, saveJSON } from "./config.js";

export function getUsers() {
  return loadJSON("data/users.json");
}

export function saveUsers(data) {
  saveJSON("data/users.json", data);
}

export function getGroups() {
  return loadJSON("data/groups.json");
}

export function saveGroups(data) {
  saveJSON("data/groups.json", data);
}

export function getSessions() {
  return loadJSON("data/sessions.json");
}

export function saveSessions(data) {
  saveJSON("data/sessions.json", data);
}
