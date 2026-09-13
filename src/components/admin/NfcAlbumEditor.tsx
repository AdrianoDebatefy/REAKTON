"use client";

import type { NfcAlbumConfig, NfcAlbumTrack, NfcCard } from "@/types/content";

function newCardEditorKey(): string {
  return `nfc-card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

export function NfcAlbumEditor({
  config,
  onChange,
  onUpload,
}: {
  config: NfcAlbumConfig;
  onChange: (config: NfcAlbumConfig) => void;
  onUpload: (file: File) => Promise<string>;
}) {
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
      label: "",
      role: "fan",
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

  const tracks = [...config.tracks].sort((a, b) => a.order - b.order);
  const dupIds = duplicateCardIds(config.cards);

  return (
    <div className="mt-10 space-y-8 border-t border-white/10 pt-8">
      <div>
        <h2 className="text-sm uppercase tracking-widest text-white/70">NFC Album Player</h2>
        <p className="mt-2 text-sm text-white/50">
          NFC-Karten öffnen den Mobile-Player. Der PC-Code aktiviert 60 Minuten Club-Wiedergabe auf
          Desktop.
        </p>
      </div>

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
          Tap-URL pro Karte:{" "}
          <code className="text-white/60">https://reakton.de/nfc/tap?card=KARTEN-ID</code>
        </p>
      </div>

      <div className="space-y-3 rounded border border-white/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs uppercase tracking-widest text-white/60">NFC-Karten</h3>
          <button
            type="button"
            onClick={addCard}
            className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
          >
            + Karte
          </button>
        </div>
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
            {config.cards.map((card) => (
              <li
                key={card.editorKey ?? card.id}
                className="grid gap-3 rounded border border-white/10 p-3 md:grid-cols-4"
              >
                <label className="block text-xs text-white/75">
                  Karten-ID
                  <input
                    type="text"
                    value={card.id}
                    onChange={(e) =>
                      updateCard(card.editorKey!, { id: e.target.value })
                    }
                    placeholder="z. B. TEST-001"
                    className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                  />
                </label>
                <label className="block text-xs text-white/75">
                  Label
                  <input
                    type="text"
                    value={card.label ?? ""}
                    onChange={(e) => updateCard(card.editorKey!, { label: e.target.value })}
                    className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                  />
                </label>
                <label className="block text-xs text-white/75">
                  Rolle
                  <select
                    value={card.role ?? "fan"}
                    onChange={(e) =>
                      updateCard(card.editorKey!, {
                        role: e.target.value === "dj" ? "dj" : "fan",
                      })
                    }
                    className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                  >
                    <option value="fan">Fan</option>
                    <option value="dj">DJ</option>
                  </select>
                </label>
                <div className="flex items-end justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-white/75">
                    <input
                      type="checkbox"
                      checked={card.enabled}
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
              </li>
            ))}
          </ul>
        )}
      </div>

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
                        const url = await onUpload(file);
                        updateTrack(track.id, { audioUrl: url });
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
                        const url = await onUpload(file);
                        updateTrack(track.id, { coverImage: url });
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
    </div>
  );
}
