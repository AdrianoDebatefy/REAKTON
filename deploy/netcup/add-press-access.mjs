#!/usr/bin/env node
/**
 * Legt einen Presse-Preview-Code mit bekanntem Klartext auf dem VPS an
 * (z. B. Code steht schon in Pressemitteilungen, Admin zeigt ihn nicht mehr).
 *
 *   cd /var/www/reakton
 *   PRESS_ACCESS_PASSWORD='…' PRESS_ACCESS_DAYS=30 node deploy/netcup/add-press-access.mjs
 *
 * Passwort nicht ins Repo committen. Kein pm2 restart nötig.
 */
import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";

const STORE_VERSION = 2;
const DATA_DIR = path.join(process.cwd(), "data");
const CRED_PATH = path.join(DATA_DIR, "press-preview.local.json");

const password = process.env.PRESS_ACCESS_PASSWORD?.trim();
const expiryDays = Math.min(
  365,
  Math.max(1, Math.round(Number(process.env.PRESS_ACCESS_DAYS ?? 30)))
);

if (!password) {
  console.error(
    "Fehler: PRESS_ACCESS_PASSWORD fehlt.\n\nBeispiel:\n  PRESS_ACCESS_PASSWORD='…' PRESS_ACCESS_DAYS=30 node deploy/netcup/add-press-access.mjs"
  );
  process.exit(1);
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function writeStore(store) {
  ensureDataDir();
  writeFileSync(CRED_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function isLegacySingleFile(raw) {
  return raw && typeof raw === "object" && typeof raw.passwordHash === "string" && !("version" in raw);
}

function readStore() {
  if (!existsSync(CRED_PATH)) {
    return { version: STORE_VERSION, accesses: [] };
  }
  try {
    const raw = JSON.parse(readFileSync(CRED_PATH, "utf-8"));
    if (raw?.version === STORE_VERSION && Array.isArray(raw.accesses)) {
      return raw;
    }
    if (isLegacySingleFile(raw)) {
      const migrated = {
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

const passwordHash = await bcrypt.hash(password, 12);
const now = new Date();
const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
const entry = {
  id: randomUUID(),
  passwordHash,
  expiresAt: expiresAt.toISOString(),
  expiryDays,
  createdAt: now.toISOString(),
};

const store = readStore();
store.accesses.push(entry);
writeStore(store);

const active = store.accesses.filter((a) => Date.now() < new Date(a.expiresAt).getTime());

console.log("OK: Presse-Zugang angelegt.");
console.log("  Datei:", CRED_PATH);
console.log("  id:", entry.id);
console.log("  Laufzeit (Tage):", expiryDays);
console.log("  gültig bis:", entry.expiresAt);
console.log("  Codes gesamt:", store.accesses.length, "· aktiv:", active.length);
