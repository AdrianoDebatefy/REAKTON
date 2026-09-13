import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STATS_PATH = path.join(DATA_DIR, "nfc-tap-stats.json");

export interface NfcTapStatEntry {
  taps: number;
  lastTapAt: number | null;
}

interface NfcTapStatsFile {
  byCardId: Record<string, NfcTapStatEntry>;
}

function normalizeCardKey(cardId: string): string {
  return cardId.trim().toLowerCase();
}

function emptyStatsFile(): NfcTapStatsFile {
  return { byCardId: {} };
}

function readStatsFile(): NfcTapStatsFile {
  if (!existsSync(STATS_PATH)) return emptyStatsFile();
  try {
    const parsed = JSON.parse(readFileSync(STATS_PATH, "utf-8")) as NfcTapStatsFile;
    return { byCardId: parsed.byCardId ?? {} };
  } catch {
    return emptyStatsFile();
  }
}

function writeStatsFile(data: NfcTapStatsFile): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STATS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** Count one successful NFC tap (valid card, session created). */
export function recordNfcTap(cardId: string): void {
  const key = normalizeCardKey(cardId);
  if (!key) return;

  const data = readStatsFile();
  const prev = data.byCardId[key] ?? { taps: 0, lastTapAt: null };
  data.byCardId[key] = {
    taps: prev.taps + 1,
    lastTapAt: Date.now(),
  };
  writeStatsFile(data);
}

export function getNfcTapStatsByCardId(): Record<string, NfcTapStatEntry> {
  return readStatsFile().byCardId;
}
