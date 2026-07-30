"use client";

import { useCallback, useState } from "react";
import type { SiteContent, SiteLinks, Song, World } from "@/types/content";

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload failed");
  const data = (await res.json()) as { url: string };
  return data.url;
}

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

function SongSlotEditor({
  song,
  index,
  onChange,
}: {
  song: Song;
  index: number;
  onChange: (s: Song) => void;
}) {
  return (
    <div className="rounded border border-white/10 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Slot {index + 1}</p>
      <label className="mb-2 block text-xs text-white/55">
        Titel (unterer Balken)
        <input
          type="text"
          value={song.title}
          onChange={(e) => onChange({ ...song, title: e.target.value })}
          placeholder="Track-Titel"
          className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1 text-sm"
        />
      </label>
      <div className="space-y-2">
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
          Video-Link (YouTube — «Video ansehen» nur wenn gesetzt)
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
    <div className="space-y-4 rounded border border-white/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm uppercase tracking-widest">{world.albumTitle.de}</h2>
        <label className="flex items-center gap-2 text-xs text-white/50" title="Spalte auf der Landingpage klickbar">
          <input
            type="checkbox"
            checked={!world.locked}
            onChange={(e) => onChange({ ...world, locked: !e.target.checked })}
          />
          Spalte freigeschaltet
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <UploadField
          label="Welt-Hintergrund Bild Desktop (16:9, z. B. Erde.jpg / nano.jpg)"
          accept="image/*"
          value={world.backgroundImage}
          onChange={(url) => onChange({ ...world, backgroundImage: url })}
        />
        <UploadField
          label="Welt-Hintergrund Bild Mobile (9:16, optional)"
          accept="image/*"
          value={world.backgroundImageMobile ?? ""}
          onChange={(url) => onChange({ ...world, backgroundImageMobile: url || undefined })}
        />
        <UploadField
          label="Welt-Hintergrund Animation (MP4, optional)"
          accept="video/mp4,video/webm"
          value={world.backgroundVideo ?? ""}
          onChange={(url) => onChange({ ...world, backgroundVideo: url || undefined })}
        />
      </div>

      <button
        type="button"
        onClick={ensureSlots}
        className="text-xs uppercase tracking-widest text-white/50 underline"
      >
        {slotCount} Slots vorbereiten
      </button>

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
    setMessage("Backup heruntergeladen — Bilder/Audio liegen weiterhin in public/uploads/");
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
        Pro Slot: Cover, Titel, optional MP4/Audio/YouTube-Link. Welt: Hintergrundbild + optional MP4.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-white/40">
        Speichern schreibt nach <code className="text-white/55">data/site-content.local.json</code> (bleibt beim
        Git-Update erhalten). Medien in <code className="text-white/55">public/uploads/</code> nicht überschreiben.
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

      <div className="mt-8 rounded border border-white/15 p-4">
        <h2 className="text-sm uppercase tracking-widest">Header-Logo</h2>
        <p className="mt-1 text-xs text-white/45">
          Wird oben links angezeigt (30px Höhe = 50%). WebP mit Transparenz empfohlen.
        </p>
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

      <div className="mt-8 rounded border border-white/15 p-4">
        <h2 className="text-sm uppercase tracking-widest">Links (Header)</h2>
        <p className="mt-1 text-xs text-white/45">
          Merchandise, Presse, YouTube, Instagram, Facebook. Interne Pfade wie /press sind möglich.
        </p>
        <div className="mt-4 max-w-md">
          <SiteLinksEditor
            links={data.siteLinks}
            onChange={(siteLinks) => setData({ ...data, siteLinks })}
          />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {data.worlds.map((world, wi) => (
          <WorldEditor
            key={world.id}
            world={world}
            onChange={(w) => {
              const worlds = [...data.worlds];
              worlds[wi] = w;
              setData({ ...data, worlds });
            }}
          />
        ))}
      </div>

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
