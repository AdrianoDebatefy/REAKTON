import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

export interface AnalyticsData {
  total: number;
  byPath: Record<string, number>;
  byReferrer: Record<string, number>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ANALYTICS_PATH = path.join(DATA_DIR, "analytics.json");

function emptyAnalytics(): AnalyticsData {
  return { total: 0, byPath: {}, byReferrer: {} };
}

export function readAnalytics(): AnalyticsData {
  if (!existsSync(ANALYTICS_PATH)) return emptyAnalytics();
  try {
    const parsed = JSON.parse(readFileSync(ANALYTICS_PATH, "utf-8")) as AnalyticsData;
    return {
      total: parsed.total ?? 0,
      byPath: parsed.byPath ?? {},
      byReferrer: parsed.byReferrer ?? {},
    };
  } catch {
    return emptyAnalytics();
  }
}

function normalizeReferrer(referrer: string): string {
  const trimmed = referrer.trim();
  if (!trimmed) return "direct";
  try {
    const host = new URL(trimmed).hostname.replace(/^www\./, "");
    return host || "direct";
  } catch {
    return "direct";
  }
}

export function recordPageView(path: string, referrer: string): AnalyticsData {
  const data = readAnalytics();
  const safePath = path.trim() || "/";
  data.total += 1;
  data.byPath[safePath] = (data.byPath[safePath] ?? 0) + 1;
  const source = normalizeReferrer(referrer);
  data.byReferrer[source] = (data.byReferrer[source] ?? 0) + 1;

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(ANALYTICS_PATH, JSON.stringify(data, null, 2), "utf-8");
  return data;
}
