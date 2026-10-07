import path from "path";
import { randomUUID } from "crypto";
import { getSiteContent } from "@/lib/content";
import {
  DEFAULT_NFC_SESSION_MINUTES,
  findNfcCard,
  getNfcTracksFromConfig,
  normalizeNfcAlbumConfig,
} from "@/lib/nfc-album-config";
import { mutateJsonFile, mutateJsonFileMaybe } from "@/lib/json-file-store";
import { recordNfcTap } from "@/lib/nfc-tap-stats";

const CODE_WORDS = [
  "Clip",
  "Clap",
  "Club",
  "Beat",
  "Bass",
  "Drop",
  "Rave",
  "Glow",
  "Flux",
  "Pulse",
  "Echo",
  "Wave",
  "Neon",
  "Vibe",
  "Loop",
];

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_PATH = path.join(DATA_DIR, "nfc-sessions.json");

export interface NfcSessionRecord {
  sessionId: string;
  cardId: string;
  pcCode: string;
  createdAt: number;
  expiresAt: number;
}

interface NfcSessionsFile {
  sessions: Record<string, NfcSessionRecord>;
  pcCodes: Record<string, string>;
}

export function getNfcAlbumConfig() {
  return normalizeNfcAlbumConfig(getSiteContent().nfcAlbum);
}

export function getNfcTracks() {
  return getNfcTracksFromConfig(getNfcAlbumConfig());
}

export function findRegisteredNfcCard(cardId: string) {
  return findNfcCard(cardId, getNfcAlbumConfig());
}

function emptySessionsFile(): NfcSessionsFile {
  return { sessions: {}, pcCodes: {} };
}

function normalizePcCode(code: string): string {
  return code.trim().toUpperCase();
}

function pickCodeWord(): string {
  return CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]!;
}

/** Four words → 15^4 = 50 625 combinations (safer for many concurrent sessions). */
export function generatePcCode(): string {
  return `${pickCodeWord()}:${pickCodeWord()}:${pickCodeWord()}:${pickCodeWord()}`;
}

function purgeExpiredSessions(data: NfcSessionsFile, now = Date.now()): boolean {
  let changed = false;
  for (const [sessionId, session] of Object.entries(data.sessions)) {
    if (session.expiresAt <= now) {
      delete data.sessions[sessionId];
      delete data.pcCodes[normalizePcCode(session.pcCode)];
      changed = true;
    }
  }
  return changed;
}

function revokeSessionsForCard(data: NfcSessionsFile, cardId: string): void {
  for (const [sessionId, session] of Object.entries(data.sessions)) {
    if (session.cardId.toLowerCase() === cardId.toLowerCase()) {
      delete data.sessions[sessionId];
      delete data.pcCodes[normalizePcCode(session.pcCode)];
    }
  }
}

export async function getNfcSession(sessionId: string): Promise<NfcSessionRecord | null> {
  let found: NfcSessionRecord | null = null;

  await mutateJsonFileMaybe(SESSIONS_PATH, emptySessionsFile(), (data) => {
    const purged = purgeExpiredSessions(data);
    const session = data.sessions[sessionId];
    if (!session) {
      found = null;
      return purged;
    }
    if (session.expiresAt <= Date.now()) {
      delete data.sessions[sessionId];
      delete data.pcCodes[normalizePcCode(session.pcCode)];
      found = null;
      return true;
    }
    found = session;
    return purged;
  });

  return found;
}

export async function createNfcSession(cardId: string): Promise<NfcSessionRecord> {
  const config = getNfcAlbumConfig();
  const minutes = config.sessionMinutes || DEFAULT_NFC_SESSION_MINUTES;
  const now = Date.now();
  let created!: NfcSessionRecord;

  await mutateJsonFile(SESSIONS_PATH, emptySessionsFile(), (data) => {
    purgeExpiredSessions(data, now);
    revokeSessionsForCard(data, cardId);

    let pcCode = generatePcCode();
    while (data.pcCodes[normalizePcCode(pcCode)]) {
      pcCode = generatePcCode();
    }

    created = {
      sessionId: randomUUID(),
      cardId,
      pcCode,
      createdAt: now,
      expiresAt: now + minutes * 60_000,
    };

    data.sessions[created.sessionId] = created;
    data.pcCodes[normalizePcCode(pcCode)] = created.sessionId;
  });

  await recordNfcTap(cardId);
  return created;
}

export async function pairNfcSessionByCode(code: string): Promise<NfcSessionRecord | null> {
  const normalized = normalizePcCode(code);
  if (!normalized) return null;

  let found: NfcSessionRecord | null = null;

  await mutateJsonFileMaybe(SESSIONS_PATH, emptySessionsFile(), (data) => {
    const purged = purgeExpiredSessions(data);
    const sessionId = data.pcCodes[normalized];
    if (!sessionId) {
      found = null;
      return purged;
    }

    const session = data.sessions[sessionId];
    if (!session || session.expiresAt <= Date.now()) {
      delete data.sessions[sessionId];
      delete data.pcCodes[normalized];
      found = null;
      return true;
    }

    found = session;
    return purged;
  });

  return found;
}

export function sessionRemainingMs(session: NfcSessionRecord, now = Date.now()): number {
  return Math.max(0, session.expiresAt - now);
}

/** Latest active NFC tap session waiting for desktop pairing. */
export async function getActivePairingSession(): Promise<NfcSessionRecord | null> {
  let latest: NfcSessionRecord | null = null;

  await mutateJsonFileMaybe(SESSIONS_PATH, emptySessionsFile(), (data) => {
    const purged = purgeExpiredSessions(data);
    const now = Date.now();
    const sessions = Object.values(data.sessions).filter((session) => session.expiresAt > now);
    latest = sessions.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    return purged;
  });

  return latest;
}

/** Count active sessions (admin / load-test diagnostics). */
export async function countActiveNfcSessions(): Promise<number> {
  let count = 0;
  await mutateJsonFileMaybe(SESSIONS_PATH, emptySessionsFile(), (data) => {
    const purged = purgeExpiredSessions(data);
    const now = Date.now();
    count = Object.values(data.sessions).filter((s) => s.expiresAt > now).length;
    return purged;
  });
  return count;
}
