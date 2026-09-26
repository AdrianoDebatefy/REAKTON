import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes, randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const CRED_PATH = path.join(DATA_DIR, "press-preview.local.json");
const STORE_VERSION = 2 as const;

/** @deprecated Legacy single-password file shape (auto-migrated on read). */
export interface PressPreviewCredentialsFile {
  passwordHash: string;
  expiresAt: string;
  expiryDays: number;
  createdAt: string;
}

export interface PressPreviewAccessEntry {
  id: string;
  passwordHash: string;
  expiresAt: string;
  expiryDays: number;
  createdAt: string;
}

export interface PressPreviewCredentialsStore {
  version: typeof STORE_VERSION;
  accesses: PressPreviewAccessEntry[];
}

export type PressPreviewAccessPublic = {
  id: string;
  expiresAt: string;
  expiryDays: number;
  createdAt: string;
  expired: boolean;
};

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function writeStore(store: PressPreviewCredentialsStore): void {
  ensureDataDir();
  writeFileSync(CRED_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function isLegacySingleFile(raw: unknown): raw is PressPreviewCredentialsFile {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o.passwordHash === "string" && !("version" in o);
}

function readStore(): PressPreviewCredentialsStore {
  if (!existsSync(CRED_PATH)) {
    return { version: STORE_VERSION, accesses: [] };
  }
  try {
    const raw: unknown = JSON.parse(readFileSync(CRED_PATH, "utf-8"));
    if (
      raw &&
      typeof raw === "object" &&
      (raw as PressPreviewCredentialsStore).version === STORE_VERSION &&
      Array.isArray((raw as PressPreviewCredentialsStore).accesses)
    ) {
      return raw as PressPreviewCredentialsStore;
    }
    if (isLegacySingleFile(raw)) {
      const migrated: PressPreviewCredentialsStore = {
        version: STORE_VERSION,
        accesses: [
          {
            id: randomUUID(),
            passwordHash: raw.passwordHash,
            expiresAt: raw.expiresAt,
            expiryDays: raw.expiryDays,
            createdAt: raw.createdAt,
          },
        ],
      };
      writeStore(migrated);
      return migrated;
    }
  } catch {
    /* fall through */
  }
  return { version: STORE_VERSION, accesses: [] };
}

export function hasPressPreviewPassword(): boolean {
  return readStore().accesses.length > 0;
}

export function isPressPreviewAccessExpired(entry: Pick<PressPreviewAccessEntry, "expiresAt">): boolean {
  return Date.now() >= new Date(entry.expiresAt).getTime();
}

function getActiveAccesses(): PressPreviewAccessEntry[] {
  return readStore().accesses.filter((entry) => !isPressPreviewAccessExpired(entry));
}

export function listPressPreviewAccesses(): PressPreviewAccessPublic[] {
  return readStore()
    .accesses.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => ({
      id: entry.id,
      expiresAt: entry.expiresAt,
      expiryDays: entry.expiryDays,
      createdAt: entry.createdAt,
      expired: isPressPreviewAccessExpired(entry),
    }));
}

export function getPressPreviewAccessSummary(): {
  configured: boolean;
  hasActiveAccess: boolean;
  activeCount: number;
  totalCount: number;
  /** Latest expiry among still-active codes, if any. */
  latestActiveExpiresAt: string | null;
} {
  const accesses = readStore().accesses;
  const active = accesses.filter((entry) => !isPressPreviewAccessExpired(entry));
  let latestActiveExpiresAt: string | null = null;
  for (const entry of active) {
    if (!latestActiveExpiresAt || entry.expiresAt > latestActiveExpiresAt) {
      latestActiveExpiresAt = entry.expiresAt;
    }
  }
  return {
    configured: accesses.length > 0,
    hasActiveAccess: active.length > 0,
    activeCount: active.length,
    totalCount: accesses.length,
    latestActiveExpiresAt,
  };
}

/** @deprecated Use getPressPreviewAccessSummary — kept for session API shape. */
export function getPressPreviewPasswordStatus():
  | { configured: false }
  | {
      configured: true;
      expiresAt: string;
      expiryDays: number;
      createdAt: string;
      expired: boolean;
    } {
  const summary = getPressPreviewAccessSummary();
  if (!summary.configured) return { configured: false };
  const listed = listPressPreviewAccesses();
  const newest = listed[0];
  return {
    configured: true,
    expiresAt: summary.latestActiveExpiresAt ?? newest?.expiresAt ?? "",
    expiryDays: newest?.expiryDays ?? 0,
    createdAt: newest?.createdAt ?? "",
    expired: !summary.hasActiveAccess,
  };
}

export async function verifyPressPreviewPassword(password: string): Promise<boolean> {
  const active = getActiveAccesses();
  for (const entry of active) {
    if (await bcrypt.compare(password, entry.passwordHash)) return true;
  }
  return false;
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

/** Adds a new access code; existing codes stay valid until their own expiry. */
export async function addPressPreviewAccess(
  password: string,
  expiryDays: number
): Promise<PressPreviewAccessEntry> {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  const entry: PressPreviewAccessEntry = {
    id: randomUUID(),
    passwordHash,
    expiresAt: expiresAt.toISOString(),
    expiryDays,
    createdAt: now.toISOString(),
  };
  const store = readStore();
  store.accesses.push(entry);
  writeStore(store);
  return entry;
}

/** @deprecated Use addPressPreviewAccess */
export async function setPressPreviewPassword(
  password: string,
  expiryDays: number
): Promise<PressPreviewAccessEntry> {
  return addPressPreviewAccess(password, expiryDays);
}
