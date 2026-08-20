"use client";

import type { ClubRobotConfig, ClubRobotTuning } from "@/types/content";
import { CLUB_ROBOT_MODEL_PATH, CLUB_ROBOT_TUNING_DEFAULTS, defaultClubRobotConfig } from "@/lib/club-robot";
import { CLUB_ROBOT_TUNING_SLIDERS } from "@/lib/club-robot-tuning-fields";
import { resolvePublicAssetUrl } from "@/lib/asset-url";

type UploadFieldProps = {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  inputClassName?: string;
};

function AdminImageUploadField({
  label,
  accept,
  value,
  onChange,
  onUpload,
  inputClassName = "min-w-0 flex-1 border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white",
}: UploadFieldProps) {
  const uploadId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="block text-xs text-white/75">
      <span className="mb-1 block uppercase tracking-widest text-white/50">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
        <label
          htmlFor={uploadId}
          className="cursor-pointer rounded border border-white/25 bg-white/10 px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-white hover:border-white/45"
        >
          Datei waehlen
        </label>
        <input
          id={uploadId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void onUpload(file).then(onChange);
            e.target.value = "";
          }}
        />
      </div>
      {value ? (
        <img
          src={resolvePublicAssetUrl(value)}
          alt=""
          className="mt-2 max-h-32 rounded border border-white/15 object-cover"
        />
      ) : null}
    </div>
  );
}

function AdminModelUploadField({
  value,
  onChange,
  onUpload,
  inputClassName = "min-w-0 flex-1 border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white",
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  inputClassName?: string;
}) {
  const isGlb = value.toLowerCase().includes(".glb") || value.toLowerCase().includes(".gltf");

  return (
    <div className="block text-xs text-white/75">
      <span className="mb-1 block uppercase tracking-widest text-white/50">Roboter-Modell (GLB)</span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/uploads/…"
          className={inputClassName}
        />
        <label
          htmlFor="club-robot-glb-upload"
          className="cursor-pointer rounded border border-amber-300/40 bg-amber-300/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-amber-100 hover:border-amber-200/60"
        >
          GLB hochladen
        </label>
        <input
          id="club-robot-glb-upload"
          type="file"
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void onUpload(file).then(onChange);
            e.target.value = "";
          }}
        />
      </div>
      {value ? (
        <p className="mt-2 text-[11px] text-white/45">
          {isGlb ? "Modell: " : "Pfad: "}
          <code className="text-white/65">{value}</code>
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-white/40">
          GLB-Datei hochladen (z. B. reakton_hires_Robot_Modell.glb). Nach Upload: Alles speichern.
        </p>
      )}
    </div>
  );
}

export function ClubRobotAdminEditor({
  config,
  onChange,
  onUpload,
}: {
  config: ClubRobotConfig;
  onChange: (config: ClubRobotConfig) => void;
  onUpload: (file: File) => Promise<string>;
}) {
  const tuning = config.tuning ?? CLUB_ROBOT_TUNING_DEFAULTS;

  const updateTuning = (key: keyof ClubRobotTuning, value: number) => {
    onChange({
      ...config,
      tuning: { ...tuning, [key]: value },
    });
  };

  const resetTuning = () => {
    onChange({
      ...config,
      tuning: { ...CLUB_ROBOT_TUNING_DEFAULTS },
    });
  };

  return (
    <div className="mt-6 space-y-8">
      <div>
        <h2 className="text-sm uppercase tracking-widest text-white/70">Clip:Clap:Club — 3D Roboter</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Desktop auf der Startseite, wenn die Club-Welt geoeffnet ist. Roboter-Modell per Upload
          hochladen — kein SCP oder Server-Zugriff noetig.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-white/85">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
        />
        3D-Roboter auf der Startseite aktivieren (nur Desktop)
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="block text-xs text-white/75">
          <span className="mb-1 block uppercase tracking-widest text-white/50">Hintergrundfarbe</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.backgroundColor || "#9e1d23"}
              onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
              className="h-10 w-14 cursor-pointer border border-white/20 bg-transparent"
            />
            <input
              type="text"
              value={config.backgroundColor || "#9e1d23"}
              onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
              className="min-w-0 flex-1 border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
            />
          </div>
        </label>

        <label className="block text-xs text-white/75">
          <span className="mb-1 block uppercase tracking-widest text-white/50">Bild-Fade (Sekunden)</span>
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={config.imageFadeS ?? 1.4}
            onChange={(e) => onChange({ ...config, imageFadeS: Number(e.target.value) || 1.4 })}
            className="mt-1 w-full border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white"
          />
        </label>
      </div>

      <AdminImageUploadField
        label="Hintergrundfoto hinter Roboter (optional)"
        accept="image/*"
        value={config.backgroundImage ?? ""}
        onChange={(url) => onChange({ ...config, backgroundImage: url || undefined })}
        onUpload={onUpload}
      />

      <AdminModelUploadField
        value={config.modelPath ?? CLUB_ROBOT_MODEL_PATH}
        onChange={(url) => onChange({ ...config, modelPath: url || undefined })}
        onUpload={onUpload}
      />

      <div className="rounded border border-white/15 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs uppercase tracking-widest text-white/60">Roboter-Position &amp; Kamera</h3>
          <button
            type="button"
            onClick={resetTuning}
            className="text-[10px] uppercase tracking-widest text-white/55 underline hover:text-white/80"
          >
            Auf Standard zuruecksetzen
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CLUB_ROBOT_TUNING_SLIDERS.map((slider) => (
            <label key={slider.key} className="block text-xs text-white/70">
              <div className="mb-1 flex justify-between gap-2">
                <span>{slider.label}</span>
                <span className="font-mono text-white/45">{tuning[slider.key].toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={tuning[slider.key]}
                onChange={(e) => updateTuning(slider.key, Number(e.target.value))}
                className="w-full accent-white"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ensureClubRobotConfig(config?: ClubRobotConfig): ClubRobotConfig {
  return {
    ...defaultClubRobotConfig(),
    ...config,
    tuning: {
      ...defaultClubRobotConfig().tuning,
      ...config?.tuning,
    },
  };
}
