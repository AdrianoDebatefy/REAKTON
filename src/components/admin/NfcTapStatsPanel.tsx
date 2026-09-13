"use client";

import { useCallback, useEffect, useState } from "react";

type TapStatsRow = {
  cardId: string;
  label: string;
  enabled: boolean;
  taps: number;
  lastTapAt: number | null;
};

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

export function NfcTapStatsPanel() {
  const [rows, setRows] = useState<TapStatsRow[]>([]);
  const [unknown, setUnknown] = useState<TapStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/nfc/tap-stats");
      if (!res.ok) {
        setError(res.status === 401 ? "Nicht angemeldet." : "Statistik konnte nicht geladen werden.");
        return;
      }
      const data = (await res.json()) as { cards: TapStatsRow[]; unknown: TapStatsRow[] };
      setRows(data.cards ?? []);
      setUnknown(data.unknown ?? []);
    } catch {
      setError("Netzwerkfehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalTaps = [...rows, ...unknown].reduce((sum, row) => sum + row.taps, 0);

  return (
    <div className="space-y-4 rounded border border-white/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-white/60">Tap-Statistik</h3>
          <p className="mt-1 text-xs text-white/45">
            Zählt erfolgreiche NFC-Taps (gültige Karte, Session erstellt). Gesamt:{" "}
            <span className="text-white/70">{totalTaps}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50 disabled:opacity-50"
        >
          Aktualisieren
        </button>
      </div>

      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
      {loading && rows.length === 0 ? (
        <p className="text-sm text-white/40">Lade …</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-xs text-white/75">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/45">
                <th className="py-2 pr-3 font-normal">Karten-ID</th>
                <th className="py-2 pr-3 font-normal">Label</th>
                <th className="py-2 pr-3 font-normal text-right">Taps</th>
                <th className="py-2 font-normal">Letzter Tap</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-white/40">Keine Karten in der Konfiguration.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.cardId || row.label} className="border-b border-white/5">
                    <td className="py-2 pr-3 font-mono text-white/85">
                      {row.cardId || <span className="text-white/35">(leer)</span>}
                      {!row.enabled && row.cardId ? (
                        <span className="ml-2 text-[10px] uppercase text-amber-200/80">inaktiv</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">{row.label || "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-white/90">{row.taps}</td>
                    <td className="py-2 text-white/55">{formatLastTap(row.lastTapAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {unknown.length > 0 ? (
        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45">
            Unbekannte IDs (nicht mehr in der Kartenliste)
          </p>
          <ul className="space-y-1 text-xs text-white/60">
            {unknown.map((row) => (
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
  );
}
