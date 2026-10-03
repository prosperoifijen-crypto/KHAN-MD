import { permissions } from "./config.js";

export function getRequiredPermission(mode, category) {
  const selectedMode = permissions[mode] || permissions.public;
  return selectedMode[category] ?? false;
}

export function isOwner(isOwnerUser) {
  return Boolean(isOwnerUser);
}

export function canUse({
  mode = "public",
  category = "general",
  isOwnerUser = false,
  isGroupAdmin = false
}) {
  if (isOwnerUser) return true;

  const required = getRequiredPermission(mode, category);

  if (required === true) return true;
  if (required === "admin") return isGroupAdmin;

  return false;
}
