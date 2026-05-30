import crypto from "crypto";

export function generateProjectKey() {
  return `andi_${crypto.randomBytes(32).toString("hex")}`;
}

export function hashProjectKey(key) {
  return crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");
}
