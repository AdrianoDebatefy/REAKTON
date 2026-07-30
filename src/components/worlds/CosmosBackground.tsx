"use client";

import { useCallback, useEffect, useState } from "react";

interface CosmosBackgroundProps {
  src: string;
}

export function CosmosBackground({ src }: CosmosBackgroundProps) {
  const [earthSrc, setEarthSrc] = useState(src);

  useEffect(() => {
    setEarthSrc(src);
  }, [src]);

  const handleEarthError = useCallback(() => {
    const fallbacks = ["/worlds/Erde.jpg", "/worlds/earth-night.jpg", "/worlds/earth-night.svg"];
    const idx = fallbacks.indexOf(earthSrc);
    const next = fallbacks[idx + 1];
    if (next) setEarthSrc(next);
  }, [earthSrc]);

  return (
    <div className="cosmos-bg-root" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={earthSrc}
        alt=""
        className="cosmos-earth-layer"
        onError={handleEarthError}
      />
    </div>
  );
}
