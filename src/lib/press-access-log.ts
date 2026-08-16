import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { WorldAtmosphere } from "@/types/content";

export interface PressAccessLogEntry {
  email: string;
  world: WorldAtmosphere;
  at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_PATH = path.join(DATA_DIR, "press-access-log.json");

function readLog(): PressAccessLogEntry[] {
  if (!existsSync(LOG_PATH)) return [];
  try {
    return JSON.parse(readFileSync(LOG_PATH, "utf-8")) as PressAccessLogEntry[];
  } catch {
    return [];
  }
}

export function recordPressAccess(email: string, world: WorldAtmosphere): void {
  const entry: PressAccessLogEntry = {
    email: email.trim().toLowerCase(),
    world,
    at: new Date().toISOString(),
  };
  const log = [...readLog(), entry];
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
}

export function readPressAccessLog(limit = 100): PressAccessLogEntry[] {
  return readLog()
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
