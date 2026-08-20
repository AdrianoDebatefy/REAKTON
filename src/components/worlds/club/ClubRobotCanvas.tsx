"use client";

import { useEffect, useRef } from "react";
import type { ResolvedClubRobotConfig } from "@/lib/club-robot";
import {
  mountClubRobotScene,
  type ClubRobotSceneHandle,
} from "@/components/worlds/club/club-robot-scene";

export function ClubRobotCanvas({
  className = "",
  onReady,
  config,
}: {
  className?: string;
  onReady?: (handle: ClubRobotSceneHandle) => void;
  config?: ResolvedClubRobotConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const configRef = useRef(config);
  configRef.current = config;

  const hasPhotoBackground = Boolean(config?.backgroundImage);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = configRef.current;
    const { dispose, handle } = mountClubRobotScene(container, {
      modelPath: active?.modelPath,
      backgroundColor: active?.backgroundColor,
      initialTuning: active?.tuning,
      transparentBackground: Boolean(active?.backgroundImage),
    });
    onReadyRef.current?.(handle);
    return dispose;
  }, [config?.modelPath, config?.backgroundColor, config?.backgroundImage]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full ${className}`}
      style={hasPhotoBackground ? { background: "transparent" } : { background: config?.backgroundColor }}
    />
  );
}
