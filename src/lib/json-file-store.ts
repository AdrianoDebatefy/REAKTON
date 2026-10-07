import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import lockfile from "proper-lockfile";

const LOCK_OPTIONS: lockfile.LockOptions = {
  retries: {
    retries: 24,
    minTimeout: 25,
    maxTimeout: 400,
    randomize: true,
  },
  stale: 60_000,
  realpath: false,
};

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function cloneFallback<T>(fallback: T): T {
  return JSON.parse(JSON.stringify(fallback)) as T;
}

function readJsonOrFallback<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return cloneFallback(fallback);
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return cloneFallback(fallback);
  }
}

/** Locked read–mutate–write for small JSON state files (NFC sessions, tap stats). */
export async function mutateJsonFile<T>(
  filePath: string,
  fallback: T,
  mutator: (data: T) => void
): Promise<void> {
  ensureParentDir(filePath);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
  }

  const release = await lockfile.lock(filePath, LOCK_OPTIONS);
  try {
    const data = readJsonOrFallback(filePath, fallback);
    mutator(data);
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } finally {
    await release();
  }
}

/** Locked read with optional write when mutator returns true. */
export async function mutateJsonFileMaybe<T>(
  filePath: string,
  fallback: T,
  mutator: (data: T) => boolean
): Promise<void> {
  ensureParentDir(filePath);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
  }

  const release = await lockfile.lock(filePath, LOCK_OPTIONS);
  try {
    const data = readJsonOrFallback(filePath, fallback);
    const shouldWrite = mutator(data);
    if (shouldWrite) {
      writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    }
  } finally {
    await release();
  }
}
