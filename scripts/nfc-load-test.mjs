#!/usr/bin/env node
/**
 * NFC tap load test — simulates many users tapping different cards.
 *
 * Examples:
 *   node scripts/nfc-load-test.mjs --base http://localhost:3010 --from-content --total 150 --concurrency 30
 *   node scripts/nfc-load-test.mjs --base https://reakton.de --cards-file ./bulk-karten-ids.txt --total 200 --concurrency 40
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

function usage() {
  console.log(`
NFC Load Test (REAKTON)

  --base URL              e.g. http://localhost:3010 or https://reakton.de
  --total N               number of tap requests (default: 100)
  --concurrency N         parallel workers (default: 25)
  --cards-file PATH       one card ID per line (from Bulk CSV column Karten-ID)
  --from-content          use enabled card IDs from data/site-content.local.json or site-content.json
  --warmup N              ignored requests before measuring (default: 5)

Success = HTTP 302 redirect to /nfc/play after tap.
`);
}

function parseArgs(argv) {
  const opts = {
    base: "http://localhost:3010",
    total: 100,
    concurrency: 25,
    cardsFile: "",
    fromContent: false,
    warmup: 5,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--from-content") opts.fromContent = true;
    else if (arg === "--base") opts.base = argv[++i]?.replace(/\/$/, "") ?? opts.base;
    else if (arg === "--total") opts.total = Math.max(1, Number(argv[++i]) || opts.total);
    else if (arg === "--concurrency") opts.concurrency = Math.max(1, Number(argv[++i]) || opts.concurrency);
    else if (arg === "--cards-file") opts.cardsFile = argv[++i] ?? "";
    else if (arg === "--warmup") opts.warmup = Math.max(0, Number(argv[++i]) ?? opts.warmup);
  }
  return opts;
}

function loadCardsFromContent() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "data/site-content.local.json"),
    path.join(root, "data/site-content.json"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    const cards = raw?.nfcAlbum?.cards ?? [];
    const ids = cards
      .filter((c) => c.enabled !== false && String(c.id ?? "").trim())
      .map((c) => String(c.id).trim());
    if (ids.length > 0) return ids;
  }
  return [];
}

function loadCardsFromFile(filePath) {
  return readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^"|"$/g, ""))
    .filter((line) => line && !line.startsWith("Karten-ID") && !line.startsWith("card_id"));
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function tapOnce(base, cardId) {
  const url = `${base}/nfc/tap?card=${encodeURIComponent(cardId)}`;
  const start = performance.now();
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ms = performance.now() - start;
    const ok = res.status === 302 || res.status === 307;
    return { ok, status: res.status, ms, cardId, error: null };
  } catch (error) {
    const ms = performance.now() - start;
    return {
      ok: false,
      status: 0,
      ms,
      cardId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPool(tasks, concurrency) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const opts = parseArgs(process.argv);

let cardIds = [];
if (opts.cardsFile) {
  cardIds = loadCardsFromFile(opts.cardsFile);
} else if (opts.fromContent) {
  cardIds = loadCardsFromContent();
}

if (cardIds.length === 0) {
  console.error("FEHLER: Keine Karten-IDs. Nutze --cards-file oder --from-content (NFC-Karten in site-content).");
  process.exit(1);
}

const tasks = [];
for (let i = 0; i < opts.total + opts.warmup; i++) {
  const cardId = cardIds[i % cardIds.length];
  tasks.push(() => tapOnce(opts.base, cardId));
}

console.log(`Base: ${opts.base}`);
console.log(`Karten im Pool: ${cardIds.length} · Total: ${opts.total} (+ ${opts.warmup} Warmup) · Concurrency: ${opts.concurrency}`);
console.log("Start…\n");

const started = performance.now();
const allResults = await runPool(tasks, opts.concurrency);
const elapsedSec = (performance.now() - started) / 1000;

const measured = allResults.slice(opts.warmup);
const ok = measured.filter((r) => r.ok);
const fail = measured.filter((r) => !r.ok);
const latencies = ok.map((r) => r.ms).sort((a, b) => a - b);

console.log("—— Ergebnis ——");
console.log(`Dauer: ${elapsedSec.toFixed(2)} s`);
console.log(`Erfolg (302): ${ok.length}/${measured.length}`);
console.log(`Fehler: ${fail.length}`);
if (ok.length > 0) {
  console.log(`Latenz ms — min: ${latencies[0].toFixed(0)} · p50: ${percentile(latencies, 50).toFixed(0)} · p95: ${percentile(latencies, 95).toFixed(0)} · p99: ${percentile(latencies, 99).toFixed(0)} · max: ${latencies[latencies.length - 1].toFixed(0)}`);
  console.log(`Durchsatz: ${(ok.length / elapsedSec).toFixed(1)} erfolgreiche Taps/s`);
}

if (fail.length > 0) {
  const byStatus = new Map();
  for (const row of fail) {
    const key = row.error ? `ERR ${row.error}` : `HTTP ${row.status}`;
    byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
  }
  console.log("\nFehler-Aufschlüsselung:");
  for (const [key, count] of byStatus) console.log(`  ${count}× ${key}`);
}

console.log("\nTipp VPS: danach `jq '.sessions | length' data/nfc-sessions.json` (aktive Sessions können abweichen wegen Ablauf).");
process.exit(fail.length > measured.length * 0.05 ? 1 : 0);
