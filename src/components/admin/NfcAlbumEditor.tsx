"use client";

import { useCallback, useEffect, useMemo, useState, type ToggleEvent } from "react";
import type { NfcAlbumConfig, NfcAlbumTrack, NfcBulkBatch, NfcCard } from "@/types/content";

type NfcEditorView = "cards" | "tracks";

type TapStatsRow = {
  cardId: string;
  label: string;
  enabled: boolean;
  taps: number;
  lastTapAt: number | null;
};

const NFC_TAP_URL_BASE = "https://reakton.de/nfc/tap?card=";

type BulkExportRow = { cardId: string; url: string; taps: number; lastTapAt: number | null };

function nfcTapUrl(cardId: string): string {
  return `${NFC_TAP_URL_BASE}${encodeURIComponent(cardId.trim())}`;
}

function newCardEditorKey(): string {
  return `nfc-card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newBulkBatchId(): string {
  return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function duplicateCardIds(cards: NfcCard[]): string[] {
  const seen = new Map<string, number>();
  for (const card of cards) {
    const id = card.id.trim().toLowerCase();
    if (!id) continue;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

function randomBulkCardId(existingLower: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 200; attempt++) {
    let suffix = "";
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 10; i++) {
      suffix += alphabet[bytes[i]! % alphabet.length];
    }
    const id = `RK-${suffix}`;
    if (!existingLower.has(id.toLowerCase())) return id;
  }
  return `RK-${Date.now().toString(36).toUpperCase()}`;
}

function formatLastTap(ms: number | null): string {
  if (ms == null) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function bulkExportRows(
  batch: NfcBulkBatch,
  tapByCardId: Map<string, TapStatsRow>
): BulkExportRow[] {
  return batch.cardIds.map((cardId) => {
    const key = cardId.trim().toLowerCase();
    const stat = key ? tapByCardId.get(key) : undefined;
    return {
      cardId,
      url: nfcTapUrl(cardId),
      taps: stat?.taps ?? 0,
      lastTapAt: stat?.lastTapAt ?? null,
    };
  });
}

function sumBatchTaps(batch: NfcBulkBatch, tapByCardId: Map<string, TapStatsRow>): number {
  return batch.cardIds.reduce((sum, cardId) => {
    const key = cardId.trim().toLowerCase();
    return sum + (key ? (tapByCardId.get(key)?.taps ?? 0) : 0);
  }, 0);
}

function exportBulkCsv(batch: NfcBulkBatch, rows: BulkExportRow[]) {
  const lines = [
    "card_id,url,taps,last_tap",
    ...rows.map(
      (item) =>
        `"${item.cardId}","${item.url}",${item.taps},"${item.lastTapAt ? formatLastTap(item.lastTapAt) : ""}"`
    ),
  ];
  const stamp = batch.createdAt.slice(0, 19).replace(/[:T]/g, "-");
  downloadTextFile(`reakton-nfc-bulk-${stamp}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
}

function exportBulkXml(batch: NfcBulkBatch, rows: BulkExportRow[]) {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = rows
    .map(
      (item) =>
        `  <card id="${escape(item.cardId)}" url="${escape(item.url)}" taps="${item.taps}" lastTap="${escape(item.lastTapAt ? formatLastTap(item.lastTapAt) : "")}" />`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<bulk id="${escape(batch.id)}" created="${escape(batch.createdAt)}">\n${body}\n</bulk>\n`;
  const stamp = batch.createdAt.slice(0, 19).replace(/[:T]/g, "-");
  downloadTextFile(`reakton-nfc-bulk-${stamp}.xml`, xml, "application/xml;charset=utf-8");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function TapCountCell({ taps, lastTapAt }: { taps: number; lastTapAt: number | null }) {
  return (
    <div>
      <span className="tabular-nums text-white/90">{taps}</span>
      {lastTapAt != null ? (
        <p className="mt-0.5 text-[10px] text-white/40">zuletzt {formatLastTap(lastTapAt)}</p>
      ) : null}
    </div>
  );
}

function BulkBatchPanel({
  batch,
  tapByCardId,
  statsLoading,
  defaultOpen,
  onCopyAll,
}: {
  batch: NfcBulkBatch;
  tapByCardId: Map<string, TapStatsRow>;
  statsLoading: boolean;
  defaultOpen: boolean;
  onCopyAll: (text: string) => void;
}) {
  const rows = bulkExportRows(batch, tapByCardId);
  const totalTaps = sumBatchTaps(batch, tapByCardId);
  const tappedCards = rows.filter((row) => row.taps > 0).length;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <details
      className="group rounded border border-white/10 p-3 open:bg-white/[0.02]"
      open={open}
      onToggle={(event: ToggleEvent<HTMLDetailsElement>) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[10px] uppercase tracking-widest text-white/50">
              Bulk · {batch.cardIds.length} Codes · {new Date(batch.createdAt).toLocaleString("de-DE")}
            </span>
            <span className="text-xs text-white/65">
              Tabzähler gesamt:{" "}
              <span className="tabular-nums font-medium text-white/90">
                {statsLoading ? "…" : totalTaps}
              </span>
              {!statsLoading ? (
                <span className="text-white/45">
                  {" "}
                  ({tappedCards} Karte{tappedCards === 1 ? "" : "n"} mit Taps)
                </span>
              ) : null}
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-widest text-white/40 group-open:hidden"
            aria-hidden
          >
            Aufklappen
          </span>
          <span
            className="hidden text-[10px] uppercase tracking-widest text-white/40 group-open:inline"
            aria-hidden
          >
            Zuklappen
          </span>
        </div>
      </summary>

      <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportBulkCsv(batch, rows)}
            className="rounded border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 hover:border-white/40"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportBulkXml(batch, rows)}
            className="rounded border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 hover:border-white/40"
          >
            XML
          </button>
          <button
            type="button"
            onClick={() => onCopyAll(rows.map((row) => row.url).join("\n"))}
            className="rounded border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 hover:border-white/40"
          >
            Alle Links kopieren
          </button>
        </div>

        <div className="max-h-64 overflow-auto rounded border border-white/10">
          <table className="w-full min-w-[32rem] text-left text-[11px] text-white/75">
            <thead className="sticky top-0 bg-[#1a1a1a]">
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/45">
                <th className="py-2 pl-2 pr-2 font-normal">Karten-ID</th>
                <th className="py-2 pr-2 font-normal text-right">Taps</th>
                <th className="py-2 pr-2 font-normal">Letzter Tap</th>
                <th className="py-2 pr-2 font-normal">Link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cardId} className="border-b border-white/5 align-top">
                  <td className="py-1.5 pl-2 pr-2 font-mono text-white/85">{row.cardId}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{row.taps}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap text-white/50">
                    {formatLastTap(row.lastTapAt)}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-white/60">{row.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

export function NfcAlbumEditor({
  config,
  onChange,
  onUpload,
}: {
  config: NfcAlbumConfig;
  onChange: (config: NfcAlbumConfig) => void;
  onUpload: (file: File) => Promise<string>;
}) {
  const [view, setView] = useState<NfcEditorView>("cards");
  const [tapRows, setTapRows] = useState<TapStatsRow[]>([]);
  const [unknownTaps, setUnknownTaps] = useState<TapStatsRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsResetting, setStatsResetting] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [newestBulkId, setNewestBulkId] = useState<string | null>(null);

  const bulkBatches = config.bulkBatches ?? [];

  const tapByCardId = useMemo(() => {
    const map = new Map<string, TapStatsRow>();
    for (const row of tapRows) {
      const key = row.cardId.trim().toLowerCase();
      if (key) map.set(key, row);
    }
    return map;
  }, [tapRows]);

  const loadTapStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/admin/nfc/tap-stats");
      if (!res.ok) {
        setStatsError(res.status === 401 ? "Nicht angemeldet." : "Tabzähler konnten nicht geladen werden.");
        return;
      }
      const data = (await res.json()) as { cards: TapStatsRow[]; unknown: TapStatsRow[] };
      setTapRows(data.cards ?? []);
      setUnknownTaps(data.unknown ?? []);
    } catch {
      setStatsError("Netzwerkfehler beim Laden der Tabzähler.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "cards") void loadTapStats();
  }, [view, loadTapStats]);

  const resetTapStats = async () => {
    if (
      !window.confirm(
        "Alle Tabzähler auf 0 setzen? (NFC-Karten, Bulks und Sessions bleiben unverändert.)"
      )
    ) {
      return;
    }
    setStatsResetting(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/admin/nfc/tap-stats", { method: "DELETE" });
      if (!res.ok) {
        setStatsError(res.status === 401 ? "Nicht angemeldet." : "Tabzähler konnten nicht zurückgesetzt werden.");
        return;
      }
      await loadTapStats();
      setCopyHint("Tabzähler wurden zurückgesetzt.");
      window.setTimeout(() => setCopyHint(null), 3000);
    } catch {
      setStatsError("Netzwerkfehler beim Zurücksetzen.");
    } finally {
      setStatsResetting(false);
    }
  };

  const addTrack = () => {
    const next: NfcAlbumTrack = {
      id: `nfc-${Date.now()}`,
      title: "",
      artist: "",
      audioUrl: "",
      coverImage: "",
      order: config.tracks.length,
    };
    onChange({ ...config, tracks: [...config.tracks, next] });
  };

  const updateTrack = (id: string, patch: Partial<NfcAlbumTrack>) => {
    onChange({
      ...config,
      tracks: config.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)),
    });
  };

  const removeTrack = (id: string) => {
    onChange({ ...config, tracks: config.tracks.filter((track) => track.id !== id) });
  };

  const addCard = () => {
    const next: NfcCard = {
      editorKey: newCardEditorKey(),
      id: "",
      enabled: true,
    };
    onChange({ ...config, cards: [...config.cards, next] });
  };

  const updateCard = (editorKey: string, patch: Partial<NfcCard>) => {
    onChange({
      ...config,
      cards: config.cards.map((card) =>
        card.editorKey === editorKey ? { ...card, ...patch } : card
      ),
    });
  };

  const removeCard = (editorKey: string) => {
    onChange({ ...config, cards: config.cards.filter((card) => card.editorKey !== editorKey) });
  };

  const runBulkCreate = () => {
    const count = Math.min(500, Math.max(1, Math.floor(bulkCount) || 1));
    setBulkBusy(true);
    try {
      const existingLower = new Set(
        config.cards.map((c) => c.id.trim().toLowerCase()).filter(Boolean)
      );
      const newCards: NfcCard[] = [];
      const cardIds: string[] = [];

      for (let i = 0; i < count; i++) {
        const id = randomBulkCardId(existingLower);
        existingLower.add(id.toLowerCase());
        newCards.push({
          editorKey: newCardEditorKey(),
          id,
          enabled: true,
        });
        cardIds.push(id);
      }

      const batch: NfcBulkBatch = {
        id: newBulkBatchId(),
        createdAt: new Date().toISOString(),
        cardIds,
      };
      setNewestBulkId(batch.id);
      onChange({
        ...config,
        cards: [...config.cards, ...newCards],
        bulkBatches: [batch, ...(config.bulkBatches ?? [])],
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const tracks = [...config.tracks].sort((a, b) => a.order - b.order);
  const dupIds = duplicateCardIds(config.cards);

  return (
    <div className="mt-10 space-y-8 border-t border-white/10 pt-8">
      <div>
        <h2 className="text-sm uppercase tracking-widest text-white/70">NFC Album Player</h2>
        <p className="mt-2 text-sm text-white/50">
          NFC-Karten öffnen den Mobile-Player. Der PC-Code aktiviert 60 Minuten Club-Wiedergabe auf
          Desktop. Neue Bulk-Codes werden immer ergänzt — bestehende Karten bleiben unverändert.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="NFC Admin">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`rounded border px-4 py-2 text-[10px] uppercase tracking-widest ${
              view === "cards"
                ? "border-white/50 bg-white/10 text-white"
                : "border-white/20 text-white/55 hover:border-white/35 hover:text-white/80"
            }`}
          >
            NFC-Karten
          </button>
          <button
            type="button"
            onClick={() => setView("tracks")}
            className={`rounded border px-4 py-2 text-[10px] uppercase tracking-widest ${
              view === "tracks"
                ? "border-white/50 bg-white/10 text-white"
                : "border-white/20 text-white/55 hover:border-white/35 hover:text-white/80"
            }`}
          >
            Album-Tracks
          </button>
        </nav>
      </div>

      {view === "cards" ? (
        <>
          <div className="rounded border border-white/15 p-4">
            <label className="block text-xs text-white/75">
              Session-Dauer (Minuten)
              <input
                type="number"
                min={1}
                max={240}
                value={config.sessionMinutes}
                onChange={(e) =>
                  onChange({ ...config, sessionMinutes: Math.max(1, Number(e.target.value) || 60) })
                }
                className="mt-1 w-28 border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <p className="mt-3 text-xs text-white/45">
              GoToTags / NFC-Link-Format:{" "}
              <code className="text-white/60">{NFC_TAP_URL_BASE}KARTEN-ID</code>
            </p>
          </div>

          <div className="space-y-3 rounded border border-white/15 p-4">
            <h3 className="text-xs uppercase tracking-widest text-white/60">Bulk-Erstellung</h3>
            <p className="text-xs text-white/45">
              Erzeugt neue zufällige Karten-IDs und hängt sie an die bestehende Liste an. Bulks
              bleiben in der Konfiguration gespeichert (nach «Alles speichern» auch über Reload
              hinweg). Tabzähler pro Bulk in der aufgeklappten Liste bzw. als Summe in der
              Überschrift.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-xs text-white/75">
                Anzahl neuer Codes
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-28 border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
                />
              </label>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={runBulkCreate}
                className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50 disabled:opacity-50"
              >
                Bulk erstellen
              </button>
            </div>

            {bulkBatches.length > 0 ? (
              <ul className="mt-4 space-y-3 border-t border-white/10 pt-4">
                {bulkBatches.map((batch) => (
                  <li key={batch.id}>
                    <BulkBatchPanel
                      batch={batch}
                      tapByCardId={tapByCardId}
                      statsLoading={statsLoading}
                      defaultOpen={batch.id === newestBulkId}
                      onCopyAll={async (text) => {
                        const ok = await copyToClipboard(text);
                        setCopyHint(ok ? "Links kopiert." : "Kopieren fehlgeschlagen.");
                        window.setTimeout(() => setCopyHint(null), 2500);
                      }}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-white/40">Noch keine Bulks — oben «Bulk erstellen».</p>
            )}
            {copyHint ? <p className="text-xs text-emerald-200/90">{copyHint}</p> : null}
          </div>

          <div className="space-y-3 rounded border border-white/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-white/60">NFC-Karten</h3>
                <p className="mt-1 text-xs text-white/45">
                  Tabzähler = erfolgreiche Taps. Neue Karten sind standardmäßig aktiv.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadTapStats()}
                  disabled={statsLoading || statsResetting}
                  className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50 disabled:opacity-50"
                >
                  Tabzähler aktualisieren
                </button>
                <button
                  type="button"
                  onClick={() => void resetTapStats()}
                  disabled={statsLoading || statsResetting}
                  className="rounded border border-amber-400/35 px-4 py-2 text-[10px] uppercase tracking-widest text-amber-100/90 hover:border-amber-300/50 disabled:opacity-50"
                >
                  Tabzähler zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={addCard}
                  className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
                >
                  + Karte
                </button>
              </div>
            </div>
            {statsError ? <p className="text-sm text-red-300/90">{statsError}</p> : null}
            {dupIds.length > 0 ? (
              <p className="rounded border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Doppelte Karten-IDs (NFC funktioniert nur für eine davon):{" "}
                <code className="text-amber-50">{dupIds.join(", ")}</code>
              </p>
            ) : null}
            {config.cards.length === 0 ? (
              <p className="text-sm text-white/40">Noch keine Karten registriert.</p>
            ) : (
              <ul className="space-y-3">
                {config.cards.map((card) => {
                  const statKey = card.id.trim().toLowerCase();
                  const stat = statKey ? tapByCardId.get(statKey) : undefined;
                  const taps = stat?.taps ?? 0;
                  const lastTapAt = stat?.lastTapAt ?? null;
                  const url = card.id.trim() ? nfcTapUrl(card.id) : "";

                  return (
                    <li
                      key={card.editorKey ?? card.id}
                      className="space-y-3 rounded border border-white/10 p-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <label className="block text-xs text-white/75">
                          Karten-ID
                          <input
                            type="text"
                            value={card.id}
                            onChange={(e) =>
                              updateCard(card.editorKey!, { id: e.target.value })
                            }
                            placeholder="z. B. RK-ABCDEFGHJK"
                            className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs font-mono"
                          />
                        </label>
                        <div className="text-xs text-white/75">
                          <span className="block">Tabzähler</span>
                          <div className="mt-2 min-w-[5rem]">
                            {statsLoading && !stat && card.id.trim() ? (
                              <span className="text-white/35">…</span>
                            ) : (
                              <TapCountCell taps={taps} lastTapAt={lastTapAt} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-end justify-end gap-2">
                          <label className="flex items-center gap-2 text-xs text-white/75">
                            <input
                              type="checkbox"
                              checked={card.enabled !== false}
                              onChange={(e) =>
                                updateCard(card.editorKey!, { enabled: e.target.checked })
                              }
                            />
                            Aktiv
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCard(card.editorKey!)}
                            className="text-[10px] uppercase tracking-widest text-white/45 underline hover:text-white/70"
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>
                      {url ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={url}
                            className="min-w-0 flex-1 border border-white/15 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white/80"
                            onFocus={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await copyToClipboard(url);
                              setCopyHint(
                                ok ? `Link kopiert (${card.id}).` : "Kopieren fehlgeschlagen."
                              );
                              window.setTimeout(() => setCopyHint(null), 2500);
                            }}
                            className="shrink-0 rounded border border-white/25 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/75 hover:border-white/45"
                          >
                            Kopieren
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {unknownTaps.length > 0 ? (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  Unbekannte IDs (Taps ohne Eintrag in der Kartenliste)
                </p>
                <ul className="space-y-1 text-xs text-white/60">
                  {unknownTaps.map((row) => (
                    <li key={row.cardId} className="flex flex-wrap justify-between gap-2 font-mono">
                      <span>{row.cardId}</span>
                      <span>
                        {row.taps} Tap{row.taps === 1 ? "" : "s"} · {formatLastTap(row.lastTapAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {view === "tracks" ? (
        <div className="space-y-3 rounded border border-white/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs uppercase tracking-widest text-white/60">Album-Tracks</h3>
            <button
              type="button"
              onClick={addTrack}
              className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
            >
              + Track
            </button>
          </div>
          {tracks.length === 0 ? (
            <p className="text-sm text-white/40">Noch keine NFC-Tracks.</p>
          ) : (
            <ul className="space-y-4">
              {tracks.map((track, index) => (
                <li key={track.id} className="space-y-3 rounded border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/45">
                      Track {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTrack(track.id)}
                      className="text-[10px] uppercase tracking-widest text-white/45 underline hover:text-white/70"
                    >
                      Entfernen
                    </button>
                  </div>
                  <label className="block text-xs text-white/75">
                    Titel
                    <input
                      type="text"
                      value={track.title}
                      onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                      className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                    />
                  </label>
                  <label className="block text-xs text-white/75">
                    Artist (optional)
                    <input
                      type="text"
                      value={track.artist ?? ""}
                      onChange={(e) => updateTrack(track.id, { artist: e.target.value })}
                      className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                    />
                  </label>
                  <label className="block text-xs text-white/75">
                    MP3-URL
                    <input
                      type="text"
                      value={track.audioUrl}
                      onChange={(e) => updateTrack(track.id, { audioUrl: e.target.value })}
                      className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-white/75">
                      MP3 hochladen
                      <input
                        type="file"
                        accept="audio/mpeg,audio/mp3,.mp3"
                        className="mt-1 block text-[10px] text-white/50"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const uploadedUrl = await onUpload(file);
                          updateTrack(track.id, { audioUrl: uploadedUrl });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="text-xs text-white/75">
                      Cover hochladen
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1 block text-[10px] text-white/50"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const uploadedUrl = await onUpload(file);
                          updateTrack(track.id, { coverImage: uploadedUrl });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {track.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.coverImage} alt="" className="h-16 w-16 rounded object-cover" />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
