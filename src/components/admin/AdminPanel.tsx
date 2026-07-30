"use client";

import { useCallback, useState } from "react";
import type { LocalizedString, SiteContent, SiteLinks, Song, World } from "@/types/content";
import { CONTENT_LOCALES, LOCALE_LABELS, emptyLocalized } from "@/lib/locale";

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload failed");
  const data = (await res.json()) as { url: string };
  return data.url;
}

type MainTab = "welten" | "logo" | "links" | "legal";

const WORLD_TAB_STYLES: Record<
  World["atmosphere"],
  { header: string; tab: string; tabActive: string }
> = {
  cosmos: {
    header: "bg-[#1a3a6e]/90 border-sky-400/30",
    tab: "border-sky-400/25 text-sky-100/70 hover:bg-sky-900/40",
    tabActive: "bg-[#1a3a6e]/80 border-sky-300/50 text-white",
  },
  nano: {
    header: "bg-[#4a5568]/90 border-slate-300/30",
    tab: "border-slate-300/25 text-slate-100/70 hover:bg-slate-700/50",
    tabActive: "bg-[#5a6578]/90 border-slate-200/45 text-white",
  },
  club: {
    header: "bg-[#6b1528]/90 border-red-400/35",
    tab: "border-red-400/30 text-red-100/75 hover:bg-red-950/50",
    tabActive: "bg-[#7a1a32]/90 border-red-300/50 text-white",
  },
};

function UploadField({
  label,
  accept,
  value,
  onChange,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <label className="block text-xs text-white/55">
      {label}
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
          placeholder="/uploads/..."
        />
        <input
          type="file"
          accept={accept}
          className="max-w-[8rem] text-[10px]"
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
}: {
  label: string;
  value: LocalizedString;
  onChange: (v: LocalizedString) => void;
  multiline?: boolean;
}) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-3">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-white/45">{label}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {CONTENT_LOCALES.map((locale) => (
          <label key={locale} className="block text-xs text-white/55">
            {LOCALE_LABELS[locale]}
            {multiline ? (
              <textarea
                rows={4}
                value={value[locale] ?? ""}
                onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
                className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-sm leading-relaxed"
              />
            ) : (
              <input
                type="text"
                value={value[locale] ?? ""}
                onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
                className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
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
  index,
  onChange,
}: {
  song: Song;
  index: number;
  onChange: (s: Song) => void;
}) {
  const infoText = song.infoText ?? emptyLocalized();

  return (
    <div className="rounded border border-white/10 bg-black/25 p-3">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-white/40">Cover Slot {index + 1}</p>

      <label className="mb-3 block text-xs text-white/55">
        Titel (unterer Balken)
        <input
          type="text"
          value={song.title}
          onChange={(e) => onChange({ ...song, title: e.target.value })}
          placeholder="Track-Titel"
          className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1 text-sm"
        />
      </label>

      <LocalizedFields
        label="Song-Info (Sidepanel beim Info-Button)"
        value={infoText}
        onChange={(infoText) => onChange({ ...song, infoText })}
        multiline
      />

      <div className="mt-3 space-y-2">
        <UploadField
          label="Bild (Cover)"
          accept="image/*"
          value={song.coverImage}
          onChange={(url) => onChange({ ...song, coverImage: url })}
        />
        <UploadField
          label="Animation (MP4, optional)"
          accept="video/mp4,video/webm"
          value={song.videoSnippet ?? ""}
          onChange={(url) => onChange({ ...song, videoSnippet: url || undefined })}
        />
        <UploadField
          label="Audio-Loop (MP3, optional)"
          accept="audio/mpeg,audio/mp3,audio/wav"
          value={song.audioSnippet ?? ""}
          onChange={(url) => onChange({ ...song, audioSnippet: url || undefined })}
        />
        <label className="block text-xs text-white/55">
          Video-Link (YouTube)
          <input
            type="url"
            value={song.videoUrl ?? ""}
            onChange={(e) => onChange({ ...song, videoUrl: e.target.value || undefined })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
          />
        </label>
      </div>
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

function WorldEditor({
  world,
  onChange,
}: {
  world: World;
  onChange: (w: World) => void;
}) {
  const slotCount = defaultSlotCount(world);
  const styles = WORLD_TAB_STYLES[world.atmosphere];

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
    <div className="overflow-hidden rounded border border-white/15">
      <div className={`border-b px-4 py-3 ${styles.header}`}>
        <h2 className="text-sm uppercase tracking-widest text-white/95">{world.albumTitle.de}</h2>
        <p className="mt-1 text-xs text-white/60">
          Spalten-Label: {world.columnLabel.de} · {slotCount} Cover-Slots
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={!world.locked}
              onChange={(e) => onChange({ ...world, locked: !e.target.checked })}
            />
            Spalte auf Landingpage freigeschaltet
          </label>
          <button
            type="button"
            onClick={ensureSlots}
            className="text-xs uppercase tracking-widest text-white/50 underline"
          >
            {slotCount} Slots vorbereiten
          </button>
        </div>

        <LocalizedFields
          label="Spalten-Label (Landing, unten)"
          value={world.columnLabel}
          onChange={(columnLabel) => onChange({ ...world, columnLabel })}
        />
        <LocalizedFields
          label="Welt-Titel (welcome to …)"
          value={world.albumTitle}
          onChange={(albumTitle) => onChange({ ...world, albumTitle })}
        />
        <LocalizedFields
          label="Themen-Beschreibung"
          value={world.themeDescription}
          onChange={(themeDescription) => onChange({ ...world, themeDescription })}
          multiline
        />

        <div className="grid gap-3 md:grid-cols-2">
          <UploadField
            label="Hintergrund Desktop (16:9)"
            accept="image/*"
            value={world.backgroundImage}
            onChange={(url) => onChange({ ...world, backgroundImage: url })}
          />
          <UploadField
            label="Hintergrund Mobile (9:16, optional)"
            accept="image/*"
            value={world.backgroundImageMobile ?? ""}
            onChange={(url) => onChange({ ...world, backgroundImageMobile: url || undefined })}
          />
          <UploadField
            label="Hintergrund Animation (MP4, optional)"
            accept="video/mp4,video/webm"
            value={world.backgroundVideo ?? ""}
            onChange={(url) => onChange({ ...world, backgroundVideo: url || undefined })}
          />
        </div>

        <div>
          <p className="mb-3 text-[10px] uppercase tracking-widest text-white/40">Cover-Slots</p>
          <div className="grid gap-3 md:grid-cols-2">
            {world.songs.slice(0, slotCount).map((song, i) => (
              <SongSlotEditor
                key={song.id}
                index={i}
                song={song}
                onChange={(s) => {
                  const songs = [...world.songs];
                  songs[i] = s;
                  onChange({ ...world, songs });
                }}
              />
            ))}
          </div>
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

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "welten", label: "Spalten & Welten" },
  { id: "logo", label: "Header-Logo" },
  { id: "links", label: "Links" },
  { id: "legal", label: "Rechtstexte" },
];

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
  const [mainTab, setMainTab] = useState<MainTab>("welten");
  const [worldTab, setWorldTab] = useState(0);

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

  const activeWorld = data.worlds[worldTab];
  const worldStyles = activeWorld ? WORLD_TAB_STYLES[activeWorld.atmosphere] : WORLD_TAB_STYLES.cosmos;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24">
      <h1 className="text-xl font-light uppercase tracking-widest">REAKTON Admin</h1>
      <p className="mt-2 text-xs text-white/50">
        REAKTON WEBSITE 2026 — Inhalte nach Tabs sortiert. Lokale Datei:{" "}
        <code className="text-white/55">data/site-content.local.json</code>
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

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-1" aria-label="Admin-Bereiche">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMainTab(tab.id)}
            className={`px-4 py-2 text-[11px] uppercase tracking-widest transition ${
              mainTab === tab.id
                ? "border-b-2 border-white text-white"
                : "text-white/45 hover:text-white/75"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {mainTab === "welten" && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {data.worlds.map((world, wi) => {
              const styles = WORLD_TAB_STYLES[world.atmosphere];
              return (
                <button
                  key={world.id}
                  type="button"
                  onClick={() => setWorldTab(wi)}
                  className={`rounded border px-3 py-2 text-[10px] uppercase tracking-widest transition ${
                    worldTab === wi ? styles.tabActive : styles.tab
                  }`}
                >
                  Welt {wi + 1}: {world.columnLabel.de}
                </button>
              );
            })}
          </div>

          {activeWorld && (
            <div className={`mt-4 rounded-t-lg border border-white/15 ${worldStyles.header} px-4 py-2`}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                Content · Welt {worldTab + 1}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {activeWorld && (
              <WorldEditor
                world={activeWorld}
                onChange={(w) => {
                  const worlds = [...data.worlds];
                  worlds[worldTab] = w;
                  setData({ ...data, worlds });
                }}
              />
            )}
          </div>
        </div>
      )}

      {mainTab === "logo" && (
        <div className="mt-6 rounded border border-white/15 p-4">
          <h2 className="text-sm uppercase tracking-widest">Header-Logo</h2>
          <p className="mt-1 text-xs text-white/45">WebP mit Transparenz, 30px Höhe im Header.</p>
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
      )}

      {mainTab === "links" && (
        <div className="mt-6 rounded border border-white/15 p-4">
          <h2 className="text-sm uppercase tracking-widest">Links (Header)</h2>
          <div className="mt-4 max-w-md">
            <SiteLinksEditor
              links={data.siteLinks}
              onChange={(siteLinks) => setData({ ...data, siteLinks })}
            />
          </div>
        </div>
      )}

      {mainTab === "legal" && (
        <div className="mt-6 space-y-4 rounded border border-white/15 p-4">
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
