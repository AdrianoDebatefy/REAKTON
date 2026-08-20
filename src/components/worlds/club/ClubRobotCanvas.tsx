"use client";

import { useEffect, useRef } from "react";
import { CLUB_ROBOT_BG } from "@/lib/club-robot";
import { mountClubRobotScene } from "@/components/worlds/club/club-robot-scene";

export function ClubRobotCanvas({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return mountClubRobotScene(container);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${className}`}
      style={{ background: CLUB_ROBOT_BG }}
    />
  );
}
