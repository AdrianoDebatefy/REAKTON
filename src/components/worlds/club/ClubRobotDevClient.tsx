"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CLUB_ROBOT_BG } from "@/lib/club-robot";

const ClubRobotCanvas = dynamic(
  () =>
    import("@/components/worlds/club/ClubRobotCanvas").then((mod) => mod.ClubRobotCanvas),
  { ssr: false }
);

export function ClubRobotDevClient() {
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
        <ClubRobotCanvas className="absolute inset-0" />
      </div>

      <footer className="relative z-10 border-t border-white/10 px-6 py-3 text-xs text-white/50">
        Modell:{" "}
        <code className="text-white/70">public/worlds/humanoid robot 3d model.glb</code>
      </footer>
    </div>
  );
}
