import { existsSync, readFileSync } from "fs";
import path from "path";
import { mutateJsonFile } from "@/lib/json-file-store";

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

/** Count one successful NFC tap (valid card, session created). */
export async function recordNfcTap(cardId: string): Promise<void> {
  const key = normalizeCardKey(cardId);
  if (!key) return;

  await mutateJsonFile(STATS_PATH, emptyStatsFile(), (data) => {
    const prev = data.byCardId[key] ?? { taps: 0, lastTapAt: null };
    data.byCardId[key] = {
      taps: prev.taps + 1,
      lastTapAt: Date.now(),
    };
  });
}

export function getNfcTapStatsByCardId(): Record<string, NfcTapStatEntry> {
  if (!existsSync(STATS_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(STATS_PATH, "utf-8")) as NfcTapStatsFile;
    return parsed.byCardId ?? {};
  } catch {
    return {};
  }
}
