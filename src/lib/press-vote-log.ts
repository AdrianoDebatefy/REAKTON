import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export interface PressVoteLogEntry {
  email: string;
  trackId: string;
  trackTitle: string;
  stars: number;
  sessionId: string;
  at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_PATH = path.join(DATA_DIR, "press-vote-log.json");

function readLog(): PressVoteLogEntry[] {
  if (!existsSync(LOG_PATH)) return [];
  try {
    return JSON.parse(readFileSync(LOG_PATH, "utf-8")) as PressVoteLogEntry[];
  } catch {
    return [];
  }
}

export function upsertPressVoteLogEntry(entry: Omit<PressVoteLogEntry, "at"> & { at?: string }) {
  const log = readLog();
  const at = entry.at ?? new Date().toISOString();
  const idx = log.findIndex(
    (row) => row.sessionId === entry.sessionId && row.trackId === entry.trackId
  );
  const row: PressVoteLogEntry = { ...entry, at };
  if (idx >= 0) log[idx] = row;
  else log.push(row);

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
}

export function readPressVoteLog(): PressVoteLogEntry[] {
  return readLog().sort((a, b) => b.at.localeCompare(a.at));
}

export function formatPressVoteLogTxt(): string {
  const header = "email / Trackname / Sternevergabe";
  const lines = readPressVoteLog().map(
    (row) => `${row.email} / ${row.trackTitle} / ${row.stars}`
  );
  return [header, ...lines].join("\n");
}
