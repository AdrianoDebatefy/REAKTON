import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getNfcAlbumConfig } from "@/lib/nfc-album-sessions";
import { getNfcTapStatsByCardId, type NfcTapStatEntry } from "@/lib/nfc-tap-stats";

export interface NfcTapStatsCardRow {
  cardId: string;
  label: string;
  enabled: boolean;
  taps: number;
  lastTapAt: number | null;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = getNfcAlbumConfig();
  const byCardId = getNfcTapStatsByCardId();
  const knownKeys = new Set<string>();

  const cards: NfcTapStatsCardRow[] = config.cards.map((card) => {
    const key = card.id.trim().toLowerCase();
    if (key) knownKeys.add(key);
    const stat: NfcTapStatEntry = key ? (byCardId[key] ?? { taps: 0, lastTapAt: null }) : { taps: 0, lastTapAt: null };
    return {
      cardId: card.id,
      label: card.label ?? "",
      enabled: card.enabled,
      taps: stat.taps,
      lastTapAt: stat.lastTapAt,
    };
  });

  const unknown: NfcTapStatsCardRow[] = Object.entries(byCardId)
    .filter(([key]) => !knownKeys.has(key))
    .map(([key, stat]) => ({
      cardId: key,
      label: "",
      enabled: false,
      taps: stat.taps,
      lastTapAt: stat.lastTapAt,
    }))
    .sort((a, b) => b.taps - a.taps);

  return NextResponse.json({ cards, unknown });
}
