"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveVideo, LocalizedString, PressEntry, PressPreviewTrack, SiteContent, SiteLinks, Song, World, WorldAtmosphere } from "@/types/content";
import type { AnalyticsData } from "@/lib/analytics";
import { CONTENT_LOCALES, LOCALE_LABELS, emptyLocalized } from "@/lib/locale";
import { PasswordChangeForm } from "@/components/admin/PasswordChangeForm";
import { ContactMessagesSection } from "@/components/admin/ContactMessagesSection";
import { SITE_BUILD_LABEL } from "@/lib/site-build";

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload failed");
  const data = (await res.json()) as { url: string };
  return data.url;
}

type SectionTab = "content" | "header" | "live" | "press" | "kontakt" | "analytics" | "account";

const WORLD_THEME: Record<
  World["atmosphere"],
  {
    albumTabActive: string;
    albumTabInactive: string;
    contentPanel: string;
    slotTabActive: string;
    inputBg: string;
  }
> = {
  cosmos: {
    albumTabActive: "bg-[#3d6ea8] text-white border-transparent",
    albumTabInactive: "bg-black text-white border-white hover:border-white/80",
    contentPanel: "bg-[#3d6ea8]",
    slotTabActive: "bg-[#2a5590] text-white",
    inputBg: "bg-[#2a5590]/60 border-white/40 text-white placeholder:text-white/50",
  },
  nano: {
    albumTabActive: "bg-[#6b7280] text-white border-transparent",
    albumTabInactive: "bg-black text-white border-white hover:border-white/80",
    contentPanel: "bg-[#6b7280]",
    slotTabActive: "bg-[#565f6d] text-white",
    inputBg: "bg-[#565f6d]/60 border-white/40 text-white placeholder:text-white/50",
  },
  club: {
    albumTabActive: "bg-[#8b2038] text-white border-transparent",
    albumTabInactive: "bg-black text-white border-white hover:border-white/80",
    contentPanel: "bg-[#8b2038]",
    slotTabActive: "bg-[#6e1830] text-white",
    inputBg: "bg-[#6e1830]/60 border-white/40 text-white placeholder:text-white/50",
  },
};

function UploadField({
  label,
  accept,
  value,
  onChange,
  inputClassName = "min-w-0 flex-1 border border-white/15 bg-black/40 px-2 py-1.5 text-xs",
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  inputClassName?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <label className="block text-xs text-white/75">
      {label}
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
          placeholder="/uploads/..."
        />
        <input
          type="file"
          accept={accept}
          className="max-w-[8rem] text-[10px] text-white/80"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await uploadFile(f));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </label>
  );
}

function LocalizedFields({
  label,
  value,
  onChange,
  multiline,
  inputClassName,
}: {
  label: string;
  value: LocalizedString;
  onChange: (v: LocalizedString) => void;
  multiline?: boolean;
  inputClassName?: string;
}) {
  const fieldClass =
    inputClassName ??
    "mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white";

  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-widest text-white/60">{label}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {CONTENT_LOCALES.map((locale) => (
          <label key={locale} className="block text-xs text-white/75">
            {LOCALE_LABELS[locale]}
            {multiline ? (
              <textarea
                rows={4}
                value={value[locale] ?? ""}
                onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
                className={`${fieldClass} leading-relaxed`}
              />
            ) : (
              <input
                type="text"
                value={value[locale] ?? ""}
                onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
                className={fieldClass}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function SongSlotEditor({
  song,
  onChange,
  theme,
}: {
  song: Song;
  onChange: (s: Song) => void;
  theme: typeof WORLD_THEME.cosmos;
}) {
  const infoText = song.infoText ?? emptyLocalized();
  const inputClass = `mt-1 w-full border px-2 py-1.5 text-sm ${theme.inputBg}`;

  return (
    <div className="space-y-4">
      <label className="block text-xs text-white/85">
        Titel (unterer Balken)
        <input
          type="text"
          value={song.title}
          onChange={(e) => onChange({ ...song, title: e.target.value })}
          placeholder="Track-Titel"
          className={inputClass}
        />
      </label>

      <LocalizedFields
        label="Song-Info (Sidepanel)"
        value={infoText}
        onChange={(infoText) => onChange({ ...song, infoText })}
        multiline
        inputClassName={inputClass}
      />

      <UploadField
        label="Bild (Cover)"
        accept="image/*"
        value={song.coverImage}
        onChange={(url) => onChange({ ...song, coverImage: url })}
        inputClassName={`min-w-0 flex-1 border px-2 py-1.5 text-xs ${theme.inputBg}`}
      />
      <UploadField
        label="Animation (MP4, optional)"
        accept="video/mp4,video/webm"
        value={song.videoSnippet ?? ""}
        onChange={(url) => onChange({ ...song, videoSnippet: url || undefined })}
        inputClassName={`min-w-0 flex-1 border px-2 py-1.5 text-xs ${theme.inputBg}`}
      />
      <UploadField
        label="Audio-Loop (MP3, optional)"
        accept="audio/mpeg,audio/mp3,audio/wav"
        value={song.audioSnippet ?? ""}
        onChange={(url) => onChange({ ...song, audioSnippet: url || undefined })}
        inputClassName={`min-w-0 flex-1 border px-2 py-1.5 text-xs ${theme.inputBg}`}
      />
      <label className="block text-xs text-white/85">
        Video-Link (YouTube)
        <input
          type="url"
          value={song.videoUrl ?? ""}
          onChange={(e) => onChange({ ...song, videoUrl: e.target.value || undefined })}
          placeholder="https://www.youtube.com/watch?v=..."
          className={inputClass}
        />
      </label>
    </div>
  );
}

function defaultSlotCount(world: World) {
  if (world.slotCount) return world.slotCount;
  if (world.atmosphere === "cosmos") return 12;
  if (world.atmosphere === "nano") return 13;
  if (world.atmosphere === "club") return 14;
  return 11;
}

function WorldMetaEditor({
  world,
  onChange,
  theme,
}: {
  world: World;
  onChange: (w: World) => void;
  theme: typeof WORLD_THEME.cosmos;
}) {
  const slotCount = defaultSlotCount(world);
  const inputClass = `mt-1 w-full border px-2 py-1.5 text-sm ${theme.inputBg}`;

  const ensureSlots = useCallback(() => {
    const songs = [...world.songs];
    while (songs.length < slotCount) {
      songs.push({
        id: `${world.id}-slot-${songs.length + 1}`,
        title: `Track ${songs.length + 1}`,
        coverImage: "/covers/placeholder.svg",
      });
    }
    onChange({ ...world, songs: songs.slice(0, slotCount), slotCount });
  }, [world, slotCount, onChange]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-white/85">
          <input type="checkbox" checked={!world.locked} onChange={(e) => onChange({ ...world, locked: !e.target.checked })} />
          Spalte auf Landingpage freigeschaltet
        </label>
        <button type="button" onClick={ensureSlots} className="text-[10px] uppercase tracking-widest text-white/70 underline">
          {slotCount} Cover-Slots vorbereiten
        </button>
      </div>

      <LocalizedFields
        label="Spalten-Label (Landing)"
        value={world.columnLabel}
        onChange={(columnLabel) => onChange({ ...world, columnLabel })}
        inputClassName={inputClass}
      />
      <LocalizedFields
        label="Welt-Titel (nach «Willkommen bei»)"
        value={world.albumTitle}
        onChange={(albumTitle) => onChange({ ...world, albumTitle })}
        inputClassName={inputClass}
      />
      <LocalizedFields
        label="Themen-Beschreibung"
        value={world.themeDescription}
        onChange={(themeDescription) => onChange({ ...world, themeDescription })}
        multiline
        inputClassName={inputClass}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <UploadField
          label="Hintergrund Desktop (16:9)"
          accept="image/*"
          value={world.backgroundImage}
          onChange={(url) => onChange({ ...world, backgroundImage: url })}
          inputClassName={`min-w-0 flex-1 border px-2 py-1.5 text-xs ${theme.inputBg}`}
        />
        <UploadField
          label="Hintergrund Mobile (9:16)"
          accept="image/*"
          value={world.backgroundImageMobile ?? ""}
          onChange={(url) => onChange({ ...world, backgroundImageMobile: url || undefined })}
          inputClassName={`min-w-0 flex-1 border px-2 py-1.5 text-xs ${theme.inputBg}`}
        />
        <UploadField
          label="Soundloop (MP3, Welt)"
          accept="audio/mpeg,audio/mp3,audio/wav"
          value={world.backgroundAudio ?? ""}
          onChange={(url) => onChange({ ...world, backgroundAudio: url || undefined })}
          inputClassName={`min-w-0 flex-1 border px-2 py-1.5 text-xs ${theme.inputBg}`}
        />
      </div>
    </div>
  );
}

function ContentSection({
  worlds,
  onWorldsChange,
}: {
  worlds: World[];
  onWorldsChange: (worlds: World[]) => void;
}) {
  const [worldIndex, setWorldIndex] = useState(0);
  const [slotTab, setSlotTab] = useState<"welt" | number>("welt");

  const world = worlds[worldIndex];
  const theme = world ? WORLD_THEME[world.atmosphere] : WORLD_THEME.cosmos;
  const slotCount = world ? defaultSlotCount(world) : 0;

  useEffect(() => {
    setSlotTab("welt");
  }, [worldIndex]);

  if (!world) return null;

  const updateWorld = (w: World) => {
    const next = [...worlds];
    next[worldIndex] = w;
    onWorldsChange(next);
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        {worlds.map((w, wi) => {
          const t = WORLD_THEME[w.atmosphere];
          const active = worldIndex === wi;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setWorldIndex(wi)}
              className={`border px-4 py-2 text-[11px] uppercase tracking-widest transition ${
                active ? t.albumTabActive : t.albumTabInactive
              }`}
            >
              {w.columnLabel.de}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        {(["welt", ...Array.from({ length: slotCount }, (_, i) => i + 1)] as const).map((tab) => {
          const isWelt = tab === "welt";
          const active = slotTab === tab;
          return (
            <button
              key={String(tab)}
              type="button"
              onClick={() => setSlotTab(tab)}
              className={`min-w-[1.5rem] px-1 py-0.5 text-sm uppercase tracking-widest transition ${
                active ? `${theme.slotTabActive} rounded px-2` : "text-white/75 hover:text-white"
              }`}
            >
              {isWelt ? "Welt" : tab}
            </button>
          );
        })}
      </div>

      <div className={`mt-2 min-h-[320px] rounded-sm p-5 md:p-6 ${theme.contentPanel}`}>
        {slotTab === "welt" ? (
          <WorldMetaEditor world={world} onChange={updateWorld} theme={theme} />
        ) : (
          <SongSlotEditor
            song={world.songs[slotTab - 1] ?? { id: `${world.id}-slot-${slotTab}`, title: "", coverImage: "/covers/placeholder.svg" }}
            onChange={(s) => {
              const songs = [...world.songs];
              songs[slotTab - 1] = s;
              updateWorld({ ...world, songs });
            }}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}

function LiveEditor({
  videos,
  onChange,
}: {
  videos: LiveVideo[];
  onChange: (videos: LiveVideo[]) => void;
}) {
  const addVideo = () => {
    onChange([
      ...videos,
      { id: `live-${Date.now()}`, youtubeUrl: "" },
    ]);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          YouTube-Links für die Live-Seite — werden untereinander angezeigt.
        </p>
        <button
          type="button"
          onClick={addVideo}
          className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
        >
          + Link
        </button>
      </div>

      {videos.length === 0 ? (
        <p className="text-sm text-white/40">Noch keine Links — «+ Link» hinzufügen.</p>
      ) : (
        <ul className="space-y-3">
          {videos.map((video, index) => (
            <li key={video.id} className="flex flex-wrap items-center gap-3 rounded border border-white/15 p-3">
              <span className="text-xs text-white/40">{index + 1}.</span>
              <input
                type="url"
                value={video.youtubeUrl}
                onChange={(e) => {
                  const next = [...videos];
                  next[index] = { ...video, youtubeUrl: e.target.value };
                  onChange(next);
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                className="min-w-0 flex-1 border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => onChange(videos.filter((v) => v.id !== video.id))}
                className="text-[10px] uppercase tracking-widest text-white/45 underline hover:text-white/70"
              >
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PressEditor({
  entries,
  onChange,
}: {
  entries: PressEntry[];
  onChange: (entries: PressEntry[]) => void;
}) {
  const addEntry = () => {
    onChange([
      ...entries,
      {
        id: `press-${Date.now()}`,
        url: "",
        image: "",
        outlet: "",
        title: emptyLocalized(),
        date: "",
      },
    ]);
  };

  const updateEntry = (index: number, patch: Partial<PressEntry>) => {
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          Presse-Einträge für <code className="text-white/50">/press</code> — Link und Bild (JPG).
        </p>
        <button
          type="button"
          onClick={addEntry}
          className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
        >
          + Eintrag
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-white/40">Noch keine Einträge — «+ Eintrag» hinzufügen.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry, index) => (
            <li key={entry.id} className="space-y-3 rounded border border-white/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-white/45">
                  Eintrag {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}
                  className="text-[10px] uppercase tracking-widest text-white/45 underline hover:text-white/70"
                >
                  Entfernen
                </button>
              </div>

              <label className="block text-xs text-white/75">
                Link
                <input
                  type="url"
                  value={entry.url}
                  onChange={(e) => updateEntry(index, { url: e.target.value })}
                  placeholder="https://…"
                  className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                />
              </label>

              <UploadField
                label="Bild (JPG)"
                accept="image/jpeg,image/png,image/webp"
                value={entry.image ?? ""}
                onChange={(url) => updateEntry(index, { image: url || undefined })}
              />

              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.image}
                  alt=""
                  className="max-h-32 w-auto rounded border border-white/10 object-contain"
                />
              ) : null}

              <label className="block text-xs text-white/55">
                Outlet / Quelle (optional)
                <input
                  type="text"
                  value={entry.outlet ?? ""}
                  onChange={(e) => updateEntry(index, { outlet: e.target.value || undefined })}
                  placeholder="z. B. Out of Line Music"
                  className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                />
              </label>

              <LocalizedFields
                label="Titel (optional)"
                value={entry.title ?? emptyLocalized()}
                onChange={(title) => updateEntry(index, { title })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PressPreviewEditor({
  config,
  onChange,
}: {
  config: NonNullable<SiteContent["pressPreview"]>;
  onChange: (config: NonNullable<SiteContent["pressPreview"]>) => void;
}) {
  const [passwordStatus, setPasswordStatus] = useState<{
    configured: boolean;
    expiresAt?: string;
    expired?: boolean;
    expiryDays?: number;
  } | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accessLog, setAccessLog] = useState<{ email: string; world: string; at: string }[]>([]);
  const [voteSummary, setVoteSummary] = useState<Record<string, { average: number; voteCount: number }>>({});

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/admin/press-preview");
    if (!res.ok) return;
    const data = (await res.json()) as {
      password: {
        configured: boolean;
        expiresAt?: string;
        expired?: boolean;
        expiryDays?: number;
      };
      accessLog: { email: string; world: string; at: string }[];
      votes: Record<string, { average: number; voteCount: number }>;
    };
    setPasswordStatus(data.password);
    setAccessLog(data.accessLog);
    setVoteSummary(data.votes);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const addTrack = (world: WorldAtmosphere) => {
    const next: PressPreviewTrack = {
      id: `preview-${Date.now()}`,
      world,
      title: "",
      artist: "",
      audioUrl: "",
      coverImage: "",
      order: config.tracks.filter((t) => t.world === world).length,
    };
    onChange({ ...config, tracks: [...config.tracks, next] });
  };

  const updateTrack = (id: string, patch: Partial<PressPreviewTrack>) => {
    onChange({
      ...config,
      tracks: config.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)),
    });
  };

  const removeTrack = (id: string) => {
    onChange({ ...config, tracks: config.tracks.filter((track) => track.id !== id) });
  };

  const generatePassword = async () => {
    setBusy(true);
    setGeneratedPassword(null);
    try {
      const res = await fetch("/api/admin/press-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryDays: config.expiryDays, regenerate: true }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { password: string };
      setGeneratedPassword(data.password);
      await loadMeta();
    } finally {
      setBusy(false);
    }
  };

  const worlds: { id: WorldAtmosphere; label: string }[] = [
    { id: "cosmos", label: "Weltall:Erde:Mensch" },
    { id: "nano", label: "Micro:Macro:Nano" },
    { id: "club", label: "Clip:Clap:Club" },
  ];

  return (
    <div className="mt-10 space-y-8 border-t border-white/10 pt-8">
      <div>
        <h2 className="text-sm uppercase tracking-widest text-white/70">Album Preview Player</h2>
        <p className="mt-2 text-sm text-white/50">
          Tracks für den Presse-Preview-Player auf <code className="text-white/55">/press</code>.
          Pro Welt eigene Preview-Tracks — nur ein Track spielt gleichzeitig.
        </p>
      </div>

      <div className="rounded border border-white/15 p-4">
        <h3 className="text-xs uppercase tracking-widest text-white/60">Presse-Zugang</h3>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="block text-xs text-white/75">
            Passwort läuft ab nach (Tage)
            <input
              type="number"
              min={1}
              max={365}
              value={config.expiryDays}
              onChange={(e) =>
                onChange({ ...config, expiryDays: Math.max(1, Number(e.target.value) || 14) })
              }
              className="mt-1 w-28 border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void generatePassword()}
            className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50 disabled:opacity-50"
          >
            Zufalls-Passwort erzeugen
          </button>
        </div>
        {passwordStatus?.configured ? (
          <p className="mt-3 text-xs text-white/45">
            Aktuell gültig bis{" "}
            <span className={passwordStatus.expired ? "text-red-300" : "text-white/70"}>
              {passwordStatus.expiresAt
                ? new Date(passwordStatus.expiresAt).toLocaleString("de-DE")
                : "—"}
            </span>
            {passwordStatus.expired ? " (abgelaufen)" : ""}
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-200/80">Noch kein Presse-Passwort erzeugt.</p>
        )}
        {generatedPassword ? (
          <p className="mt-3 rounded border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Neues Passwort (einmalig anzeigen):{" "}
            <code className="font-mono text-base">{generatedPassword}</code>
          </p>
        ) : null}
      </div>

      {worlds.map((world) => {
        const tracks = config.tracks
          .filter((track) => track.world === world.id)
          .sort((a, b) => a.order - b.order);
        return (
          <div key={world.id} className="space-y-3 rounded border border-white/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs uppercase tracking-widest text-white/60">{world.label}</h3>
              <button
                type="button"
                onClick={() => addTrack(world.id)}
                className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
              >
                + Track
              </button>
            </div>
            {tracks.length === 0 ? (
              <p className="text-sm text-white/40">Noch keine Preview-Tracks.</p>
            ) : (
              <ul className="space-y-4">
                {tracks.map((track, index) => (
                  <li key={track.id} className="space-y-3 rounded border border-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/45">
                        Track {index + 1}
                        {voteSummary[track.id]?.voteCount
                          ? ` · Ø ${voteSummary[track.id]!.average} (${voteSummary[track.id]!.voteCount})`
                          : ""}
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
                    <UploadField
                      label="Audio (MP3)"
                      accept="audio/mpeg,audio/mp3,audio/wav"
                      value={track.audioUrl}
                      onChange={(url) => updateTrack(track.id, { audioUrl: url })}
                    />
                    <UploadField
                      label="Cover (optional)"
                      accept="image/jpeg,image/png,image/webp"
                      value={track.coverImage ?? ""}
                      onChange={(url) => updateTrack(track.id, { coverImage: url || undefined })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {accessLog.length > 0 ? (
        <div className="rounded border border-white/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs uppercase tracking-widest text-white/60">Letzte Logins</h3>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/admin/press-preview/vote-export";
              }}
              className="rounded border border-white/25 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
            >
              Sterne als TXT exportieren
            </button>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-white/45">
            {accessLog.slice(0, 10).map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                {new Date(entry.at).toLocaleString("de-DE")} — {entry.email} ({entry.world})
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded border border-white/15 p-4">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/admin/press-preview/vote-export";
            }}
            className="inline-block rounded border border-white/25 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50"
          >
            Sterne als TXT exportieren
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection() {
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error("unauthorized");
        const data = (await res.json()) as AnalyticsData;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError("Analytics konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="mt-6 text-sm text-white/50">Lade Analytics…</p>;
  if (error) return <p className="mt-6 text-sm text-red-300/80">{error}</p>;
  if (!stats) return null;

  const topPaths = Object.entries(stats.byPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  const topReferrers = Object.entries(stats.byReferrer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return (
    <div className="mt-6 space-y-8">
      <p className="text-xs text-white/45">
        Einfache Zählung pro Seitenaufruf (Pfad + Referrer-Domain). Keine Geo-Daten — für detaillierte
        Herkunft z. B. Vercel Analytics oder Plausible.
      </p>

      <div className="rounded border border-white/15 p-5">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Gesamt</p>
        <p className="mt-2 text-3xl font-light tabular-nums">{stats.total}</p>
        <p className="mt-1 text-xs text-white/40">Page Impressions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border border-white/15 p-4">
          <h2 className="text-sm uppercase tracking-widest text-white/70">Seiten</h2>
          {topPaths.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">Noch keine Daten.</p>
          ) : (
            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="text-white/45">
                  <th className="pb-2">Pfad</th>
                  <th className="pb-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map(([path, count]) => (
                  <tr key={path} className="border-t border-white/10">
                    <td className="py-2 font-mono text-white/75">{path}</td>
                    <td className="py-2 text-right tabular-nums text-white/90">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded border border-white/15 p-4">
          <h2 className="text-sm uppercase tracking-widest text-white/70">Herkunft (Referrer)</h2>
          {topReferrers.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">Noch keine Daten.</p>
          ) : (
            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="text-white/45">
                  <th className="pb-2">Quelle</th>
                  <th className="pb-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map(([source, count]) => (
                  <tr key={source} className="border-t border-white/10">
                    <td className="py-2 text-white/75">{source}</td>
                    <td className="py-2 text-right tabular-nums text-white/90">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteLinksEditor({
  links,
  onChange,
}: {
  links: SiteLinks;
  onChange: (links: SiteLinks) => void;
}) {
  const fields: { key: keyof SiteLinks; label: string; placeholder: string }[] = [
    { key: "merchandise", label: "Merchandise", placeholder: "https://shop.example.com" },
    { key: "press", label: "Presse", placeholder: "/press oder https://…" },
    { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/…" },
    { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/…" },
    { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/…" },
  ];

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <label key={field.key} className="block text-xs text-white/55">
          {field.label}
          <input
            type="url"
            value={links[field.key]}
            onChange={(e) => onChange({ ...links, [field.key]: e.target.value })}
            placeholder={field.placeholder}
            className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
          />
        </label>
      ))}
    </div>
  );
}

export function AdminPanel({
  content,
  onSave,
}: {
  content: SiteContent;
  onSave: (c: SiteContent) => Promise<void>;
}) {
  const [data, setData] = useState(content);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sectionTab, setSectionTab] = useState<SectionTab>("content");

  async function save() {
    setSaving(true);
    try {
      await onSave(data);
      setMessage("Gespeichert in data/site-content.local.json — bleibt beim Repo-Update erhalten.");
    } catch {
      setMessage("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reakton-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Backup heruntergeladen.");
  }

  async function importBackup(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as SiteContent;
      if (!parsed.worlds?.length) throw new Error("invalid");
      setData(parsed);
      setMessage("Backup geladen — bitte «Alles speichern» klicken.");
    } catch {
      setMessage("Import fehlgeschlagen — ungültige JSON-Datei");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24">
      <h1 className="text-xl font-light uppercase tracking-widest">REAKTON Admin</h1>
      <p className="mt-2 text-xs text-white/50">
        Lokale Datei: <code className="text-white/55">data/site-content.local.json</code>
        <span className="ml-3 text-white/30">· Build {SITE_BUILD_LABEL}</span>
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportBackup}
          className="rounded border border-white/20 px-4 py-2 text-[10px] uppercase tracking-widest text-white/60 hover:border-white/40"
        >
          Backup exportieren
        </button>
        <label className="cursor-pointer rounded border border-white/20 px-4 py-2 text-[10px] uppercase tracking-widest text-white/60 hover:border-white/40">
          Backup importieren
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importBackup(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <nav className="mt-8 flex gap-8 border-b border-white/10" aria-label="Admin-Bereiche">
        <button
          type="button"
          onClick={() => setSectionTab("content")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "content"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Content
        </button>
        <button
          type="button"
          onClick={() => setSectionTab("header")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "header"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Header
        </button>
        <button
          type="button"
          onClick={() => setSectionTab("live")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "live"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => setSectionTab("press")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "press"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Presse
        </button>
        <button
          type="button"
          onClick={() => setSectionTab("kontakt")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "kontakt"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Kontakt
        </button>
        <button
          type="button"
          onClick={() => setSectionTab("analytics")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "analytics"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() => setSectionTab("account")}
          className={`pb-2 text-sm uppercase tracking-[0.35em] transition ${
            sectionTab === "account"
              ? "border-b-2 border-white text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Zugang
        </button>
      </nav>

      {sectionTab === "content" && (
        <ContentSection
          worlds={data.worlds}
          onWorldsChange={(worlds) => setData({ ...data, worlds })}
        />
      )}

      {sectionTab === "live" && (
        <LiveEditor
          videos={data.liveVideos}
          onChange={(liveVideos) => setData({ ...data, liveVideos })}
        />
      )}

      {sectionTab === "press" && (
        <>
          <PressEditor
            entries={data.press}
            onChange={(press) => setData({ ...data, press })}
          />
          <PressPreviewEditor
            config={data.pressPreview ?? { expiryDays: 14, tracks: [] }}
            onChange={(pressPreview) => setData({ ...data, pressPreview })}
          />
        </>
      )}

      {sectionTab === "kontakt" && <ContactMessagesSection />}

      {sectionTab === "analytics" && <AnalyticsSection />}

      {sectionTab === "account" && (
        <div className="mt-6 rounded border border-white/15 p-5">
          <h2 className="text-sm uppercase tracking-widest text-white/70">Passwort ändern</h2>
          <div className="mt-4 max-w-md">
            <PasswordChangeForm />
          </div>
        </div>
      )}

      {sectionTab === "header" && (
        <div className="mt-6 space-y-8">
          <div className="rounded border border-white/15 p-4">
            <h2 className="text-sm uppercase tracking-widest">Logo</h2>
            <div className="mt-4 max-w-md">
              <UploadField
                label="REAKTON-Logo"
                accept="image/*"
                value={data.brandLogo ?? "/brand/reakton-logo.webp"}
                onChange={(url) => setData({ ...data, brandLogo: url })}
              />
            </div>
            <img
              src={data.brandLogo ?? "/brand/reakton-logo.webp"}
              alt="Logo-Vorschau"
              className="mt-4 h-[30px] w-auto"
            />
          </div>

          <div className="rounded border border-white/15 p-4">
            <h2 className="text-sm uppercase tracking-widest">Links</h2>
            <div className="mt-4 max-w-md">
              <SiteLinksEditor
                links={data.siteLinks}
                onChange={(siteLinks) => setData({ ...data, siteLinks })}
              />
            </div>
          </div>

          <div className="space-y-4 rounded border border-white/15 p-4">
            <h2 className="text-sm uppercase tracking-widest">Rechtstexte</h2>
            <LocalizedFields
              label="Impressum"
              value={data.impressum}
              onChange={(impressum) => setData({ ...data, impressum })}
              multiline
            />
            <LocalizedFields
              label="Datenschutz"
              value={data.datenschutz}
              onChange={(datenschutz) => setData({ ...data, datenschutz })}
              multiline
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-8 rounded bg-white px-8 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
      >
        {saving ? "Speichern…" : "Alles speichern"}
      </button>
      {message && <p className="mt-4 text-sm text-white/60">{message}</p>}
    </div>
  );
}
