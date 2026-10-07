import type { NfcAlbumConfig, NfcBulkBatch, NfcCard } from "@/types/content";

export const DEFAULT_NFC_SESSION_MINUTES = 60;

export function defaultNfcAlbumConfig(): NfcAlbumConfig {
  return {
    sessionMinutes: DEFAULT_NFC_SESSION_MINUTES,
    tracks: [],
    cards: [],
  };
}

export function normalizeNfcAlbumConfig(raw?: NfcAlbumConfig | null): NfcAlbumConfig {
  const base = defaultNfcAlbumConfig();
  if (!raw) return base;
  return {
    sessionMinutes: Math.max(1, raw.sessionMinutes ?? base.sessionMinutes),
    tracks: (raw.tracks ?? [])
      .map((track, index) => ({
        id: track.id || `nfc-track-${index}`,
        title: track.title ?? "",
        artist: track.artist ?? "",
        audioUrl: track.audioUrl ?? "",
        coverImage: track.coverImage ?? "",
        order: typeof track.order === "number" ? track.order : index,
      }))
      .sort((a, b) => a.order - b.order),
    cards: (raw.cards ?? []).map((card, index) => ({
      id: (card.id || `card-${index}`).trim(),
      editorKey:
        card.editorKey?.trim() ||
        `legacy-${index}-${(card.id || `card-${index}`).trim().toLowerCase()}`,
      label: card.label ?? "",
      role: card.role === "dj" ? "dj" : "fan",
      enabled: card.enabled !== false,
    })),
    bulkBatches: normalizeNfcBulkBatches(raw.bulkBatches),
  };
}

function normalizeNfcBulkBatches(raw?: NfcBulkBatch[] | null): NfcBulkBatch[] {
  if (!raw?.length) return [];
  return raw
    .map((batch, index) => {
      const cardIds = (batch.cardIds ?? [])
        .map((id) => (typeof id === "string" ? id : "").trim())
        .filter(Boolean);
      return {
        id: batch.id?.trim() || `bulk-legacy-${index}`,
        createdAt: batch.createdAt?.trim() || new Date(0).toISOString(),
        cardIds,
      };
    })
    .filter((batch) => batch.cardIds.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findNfcCard(cardId: string, config: NfcAlbumConfig): NfcCard | undefined {
  const normalized = cardId.trim();
  if (!normalized) return undefined;
  return config.cards.find(
    (card) => card.id.toLowerCase() === normalized.toLowerCase() && card.enabled
  );
}

export function getNfcTracksFromConfig(config: NfcAlbumConfig) {
  return config.tracks.filter((track) => track.audioUrl.trim()).sort((a, b) => a.order - b.order);
}
