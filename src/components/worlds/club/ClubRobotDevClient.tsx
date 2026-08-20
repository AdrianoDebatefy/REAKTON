"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { CLUB_ROBOT_BG } from "@/lib/club-robot";
import { ClubRobotTuningPanel } from "@/components/worlds/club/ClubRobotTuningPanel";
import type { ClubRobotSceneHandle } from "@/components/worlds/club/club-robot-scene";

const ClubRobotCanvas = dynamic(
  () =>
    import("@/components/worlds/club/ClubRobotCanvas").then((mod) => mod.ClubRobotCanvas),
  { ssr: false }
);

export function ClubRobotDevClient() {
  const [handle, setHandle] = useState<ClubRobotSceneHandle | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const onReady = useCallback((sceneHandle: ClubRobotSceneHandle) => {
    setHandle(sceneHandle);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: CLUB_ROBOT_BG }}>
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-white/15 px-6 py-4 text-white/80">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">Lokaler Test</p>
          <h1 className="text-lg font-light tracking-wide">Clip:Clap:Club — 3D Roboter</h1>
        </div>
        <Link
          href="/"
          className="rounded border border-white/20 px-3 py-1.5 text-xs uppercase tracking-widest text-white/70 transition hover:border-white/40"
        >
          Zur Startseite
        </Link>
      </header>

      <div className="relative min-h-0 flex-1">
        <ClubRobotCanvas className="absolute inset-0" onReady={onReady} />
        <ClubRobotTuningPanel
          handle={handle}
          open={panelOpen}
          onToggle={() => setPanelOpen((v) => !v)}
        />
      </div>

      <footer className="relative z-10 border-t border-white/10 px-6 py-3 text-xs text-white/50">
        Slider rechts → Werte justieren → „Config“ kopiert Code für{" "}
        <code className="text-white/70">club-robot.ts</code>
      </footer>
    </div>
  );
}
