import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const CRED_PATH = path.join(DATA_DIR, "press-preview.local.json");

export interface PressPreviewCredentialsFile {
  passwordHash: string;
  expiresAt: string;
  expiryDays: number;
  createdAt: string;
}

export function hasPressPreviewPassword(): boolean {
  return existsSync(CRED_PATH);
}

export function readPressPreviewCredentials(): PressPreviewCredentialsFile | null {
  if (!existsSync(CRED_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CRED_PATH, "utf-8")) as PressPreviewCredentialsFile;
  } catch {
    return null;
  }
}

export function isPressPreviewPasswordExpired(creds: PressPreviewCredentialsFile): boolean {
  return Date.now() >= new Date(creds.expiresAt).getTime();
}

export async function verifyPressPreviewPassword(password: string): Promise<boolean> {
  const creds = readPressPreviewCredentials();
  if (!creds?.passwordHash) return false;
  if (isPressPreviewPasswordExpired(creds)) return false;
  return bcrypt.compare(password, creds.passwordHash);
}

export function generateRandomPressPassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export async function setPressPreviewPassword(
  password: string,
  expiryDays: number
): Promise<PressPreviewCredentialsFile> {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  const payload: PressPreviewCredentialsFile = {
    passwordHash,
    expiresAt: expiresAt.toISOString(),
    expiryDays,
    createdAt: now.toISOString(),
  };
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CRED_PATH, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export function getPressPreviewPasswordStatus():
  | { configured: false }
  | {
      configured: true;
      expiresAt: string;
      expiryDays: number;
      createdAt: string;
      expired: boolean;
    } {
  const creds = readPressPreviewCredentials();
  if (!creds) return { configured: false };
  return {
    configured: true,
    expiresAt: creds.expiresAt,
    expiryDays: creds.expiryDays,
    createdAt: creds.createdAt,
    expired: isPressPreviewPasswordExpired(creds),
  };
}
