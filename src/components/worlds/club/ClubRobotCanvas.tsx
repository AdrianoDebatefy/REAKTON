"use client";

import { useEffect, useRef } from "react";
import { CLUB_ROBOT_BG } from "@/lib/club-robot";
import {
  mountClubRobotScene,
  type ClubRobotSceneHandle,
} from "@/components/worlds/club/club-robot-scene";

export function ClubRobotCanvas({
  className = "",
  onReady,
}: {
  className?: string;
  onReady?: (handle: ClubRobotSceneHandle) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { dispose, handle } = mountClubRobotScene(container);
    onReadyRef.current?.(handle);
    return dispose;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${className}`}
      style={{ background: CLUB_ROBOT_BG }}
    />
  );
}
