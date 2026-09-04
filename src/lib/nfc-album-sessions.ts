import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getSiteContent } from "@/lib/content";
import {
  DEFAULT_NFC_SESSION_MINUTES,
  findNfcCard,
  getNfcTracksFromConfig,
  normalizeNfcAlbumConfig,
} from "@/lib/nfc-album-config";

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

function readSessionsFile(): NfcSessionsFile {
  if (!existsSync(SESSIONS_PATH)) return emptySessionsFile();
  try {
    const parsed = JSON.parse(readFileSync(SESSIONS_PATH, "utf-8")) as NfcSessionsFile;
    return {
      sessions: parsed.sessions ?? {},
      pcCodes: parsed.pcCodes ?? {},
    };
  } catch {
    return emptySessionsFile();
  }
}

function writeSessionsFile(data: NfcSessionsFile): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SESSIONS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function normalizePcCode(code: string): string {
  return code.trim().toUpperCase();
}

function pickCodeWord(): string {
  return CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]!;
}

export function generatePcCode(): string {
  return `${pickCodeWord()}:${pickCodeWord()}:${pickCodeWord()}`;
}

function purgeExpiredSessions(data: NfcSessionsFile, now = Date.now()): void {
  for (const [sessionId, session] of Object.entries(data.sessions)) {
    if (session.expiresAt <= now) {
      delete data.sessions[sessionId];
      delete data.pcCodes[normalizePcCode(session.pcCode)];
    }
  }
}

function revokeSessionsForCard(data: NfcSessionsFile, cardId: string): void {
  for (const [sessionId, session] of Object.entries(data.sessions)) {
    if (session.cardId.toLowerCase() === cardId.toLowerCase()) {
      delete data.sessions[sessionId];
      delete data.pcCodes[normalizePcCode(session.pcCode)];
    }
  }
}

export function getNfcSession(sessionId: string): NfcSessionRecord | null {
  const data = readSessionsFile();
  purgeExpiredSessions(data);
  const session = data.sessions[sessionId];
  if (!session) {
    writeSessionsFile(data);
    return null;
  }
  if (session.expiresAt <= Date.now()) {
    delete data.sessions[sessionId];
    delete data.pcCodes[normalizePcCode(session.pcCode)];
    writeSessionsFile(data);
    return null;
  }
  writeSessionsFile(data);
  return session;
}

export function createNfcSession(cardId: string): NfcSessionRecord {
  const config = getNfcAlbumConfig();
  const minutes = config.sessionMinutes || DEFAULT_NFC_SESSION_MINUTES;
  const now = Date.now();
  const data = readSessionsFile();
  purgeExpiredSessions(data, now);
  revokeSessionsForCard(data, cardId);

  let pcCode = generatePcCode();
  while (data.pcCodes[normalizePcCode(pcCode)]) {
    pcCode = generatePcCode();
  }

  const session: NfcSessionRecord = {
    sessionId: randomUUID(),
    cardId,
    pcCode,
    createdAt: now,
    expiresAt: now + minutes * 60_000,
  };

  data.sessions[session.sessionId] = session;
  data.pcCodes[normalizePcCode(pcCode)] = session.sessionId;
  writeSessionsFile(data);
  return session;
}

export function pairNfcSessionByCode(code: string): NfcSessionRecord | null {
  const normalized = normalizePcCode(code);
  if (!normalized) return null;

  const data = readSessionsFile();
  purgeExpiredSessions(data);
  const sessionId = data.pcCodes[normalized];
  if (!sessionId) {
    writeSessionsFile(data);
    return null;
  }

  const session = data.sessions[sessionId];
  if (!session || session.expiresAt <= Date.now()) {
    delete data.sessions[sessionId];
    delete data.pcCodes[normalized];
    writeSessionsFile(data);
    return null;
  }

  writeSessionsFile(data);
  return session;
}

export function sessionRemainingMs(session: NfcSessionRecord, now = Date.now()): number {
  return Math.max(0, session.expiresAt - now);
}
