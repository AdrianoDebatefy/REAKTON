"use client";

import { useCallback, useState } from "react";
import {
  CLUB_ROBOT_TUNING_DEFAULTS,
  type ClubRobotTuning,
} from "@/lib/club-robot";
import type { ClubRobotSceneHandle } from "@/components/worlds/club/club-robot-scene";

type SliderSpec = {
  key: keyof ClubRobotTuning;
  label: string;
  min: number;
  max: number;
  step: number;
};

const SLIDERS: SliderSpec[] = [
  { key: "modelX", label: "Position X", min: -1.5, max: 1.5, step: 0.01 },
  { key: "modelY", label: "Position Y", min: -1.5, max: 0.5, step: 0.01 },
  { key: "modelZ", label: "Position Z", min: -1, max: 1, step: 0.01 },
  { key: "modelScale", label: "Scale", min: 0.5, max: 2.5, step: 0.01 },
  { key: "modelRotY", label: "Rotation Y", min: -3.14, max: 3.14, step: 0.01 },
  { key: "cameraDistance", label: "Kamera Abstand", min: 0.6, max: 2.5, step: 0.01 },
  { key: "cameraPosY", label: "Kamera Höhe", min: 0.8, max: 2.2, step: 0.01 },
  { key: "cameraLookAtY", label: "Blickpunkt Y", min: 0.8, max: 2.2, step: 0.01 },
  { key: "cameraFov", label: "FOV", min: 18, max: 50, step: 1 },
];

function formatConfig(tuning: ClubRobotTuning) {
  return `// club-robot.ts
export const CLUB_ROBOT_MODEL = {
  position: [${tuning.modelX.toFixed(2)}, ${tuning.modelY.toFixed(2)}, ${tuning.modelZ.toFixed(2)}] as const,
  rotation: [0, ${tuning.modelRotY.toFixed(2)}, 0] as const,
  scale: ${tuning.modelScale.toFixed(2)},
  targetHeight: 2.1,
};

export const CLUB_ROBOT_CAMERA = {
  position: [0, ${tuning.cameraPosY.toFixed(2)}, 1.02] as const,
  fov: ${tuning.cameraFov},
  lookAt: [0, ${tuning.cameraLookAtY.toFixed(2)}, 0] as const,
  distanceMultiplier: ${tuning.cameraDistance.toFixed(2)},
};`;
}

export function ClubRobotTuningPanel({
  handle,
  open,
  onToggle,
}: {
  handle: ClubRobotSceneHandle | null;
  open: boolean;
  onToggle: () => void;
}) {
  const [tuning, setTuning] = useState<ClubRobotTuning>(CLUB_ROBOT_TUNING_DEFAULTS);
  const [copied, setCopied] = useState(false);

  const update = useCallback(
    (key: keyof ClubRobotTuning, value: number) => {
      setTuning((prev) => {
        const next = { ...prev, [key]: value };
        handle?.setTuning({ [key]: value });
        return next;
      });
    },
    [handle]
  );

  const reset = useCallback(() => {
    handle?.resetTuning();
    setTuning(CLUB_ROBOT_TUNING_DEFAULTS);
  }, [handle]);

  const copyConfig = useCallback(async () => {
    const current = handle?.getTuning() ?? tuning;
    const text = formatConfig(current);
    await navigator.clipboard.writeText(text);
    console.info(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [handle, tuning]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-0 top-1/2 z-[200] -translate-y-1/2 rounded-l-md border border-r-0 border-white/35 bg-black/80 px-3 py-4 text-xs font-medium uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur-sm"
      >
        ◀ Tuning
      </button>
    );
  }

  return (
    <aside className="absolute right-0 top-16 z-[200] flex max-h-[calc(100%-5rem)] w-72 flex-col border-l border-white/25 bg-black/85 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">Roboter Tuning</p>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-white/50 hover:text-white/80"
          aria-label="Panel schließen"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {SLIDERS.map((slider) => (
          <label key={slider.key} className="mb-4 block text-xs text-white/70">
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
              disabled={!handle}
              onChange={(e) => update(slider.key, Number(e.target.value))}
              className="w-full accent-white"
            />
          </label>
        ))}
      </div>

      <div className="flex gap-2 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={reset}
          disabled={!handle}
          className="flex-1 rounded border border-white/20 px-2 py-2 text-[10px] uppercase tracking-widest text-white/70 hover:border-white/40 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => void copyConfig()}
          disabled={!handle}
          className="flex-1 rounded border border-white/20 px-2 py-2 text-[10px] uppercase tracking-widest text-white/70 hover:border-white/40 disabled:opacity-40"
        >
          {copied ? "Kopiert" : "Config"}
        </button>
      </div>
    </aside>
  );
}
