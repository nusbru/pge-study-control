import { compare, hash } from "bcryptjs";
import { createHash } from "node:crypto";

function digestPassword(password: string) {
  return createHash("sha256").update(password, "utf8").digest("base64");
}

export const hashPassword = (password: string) => hash(digestPassword(password), 12);
export const verifyPassword = (password: string, passwordHash: string) => (
  compare(digestPassword(password), passwordHash)
);
