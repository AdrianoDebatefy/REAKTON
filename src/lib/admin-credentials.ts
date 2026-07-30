import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CRED_PATH = path.join(DATA_DIR, "admin.local.json");

interface AdminCredentialsFile {
  passwordHash: string;
  updatedAt: string;
}

function defaultPassword(): string {
  return process.env.ADMIN_PASSWORD || "4Q2a5yMBMsjD*hBWYjubR3^SJ9ncGk";
}

export function hasStoredAdminPassword(): boolean {
  return existsSync(CRED_PATH);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (existsSync(CRED_PATH)) {
    try {
      const { passwordHash } = JSON.parse(readFileSync(CRED_PATH, "utf-8")) as AdminCredentialsFile;
      if (!passwordHash) return false;
      return bcrypt.compare(password, passwordHash);
    } catch {
      return false;
    }
  }
  return password === defaultPassword();
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    CRED_PATH,
    JSON.stringify({ passwordHash, updatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 8) return "Mindestens 8 Zeichen.";
  return null;
}
