"use client";

import { useEffect, useRef } from "react";
import type { ResolvedClubRobotConfig } from "@/lib/club-robot";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = configRef.current;
    const { dispose, handle } = mountClubRobotScene(container, {
      modelPath: active?.modelPath,
      backgroundColor: active?.backgroundColor,
      initialTuning: active?.tuning,
    });
    onReadyRef.current?.(handle);
    return dispose;
  }, [config?.modelPath, config?.backgroundColor]);

  const backdropStyle = config?.backgroundImage
    ? {
        backgroundColor: config.backgroundColor,
        backgroundImage: `url(${resolvePublicAssetUrl(config.backgroundImage)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: config?.backgroundColor };

  return <div ref={containerRef} className={`h-full w-full ${className}`} style={backdropStyle} />;
}
