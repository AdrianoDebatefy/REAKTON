"use client";

import type { WorldAtmosphere } from "@/types/content";
import { PRESS_WORLD_THEME } from "@/lib/press-preview-theme";

function starStyle(atmosphere: WorldAtmosphere, filled: boolean): string {
  if (atmosphere === "nano") {
    return filled
      ? "text-white"
      : "text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.55)]";
  }

  if (atmosphere === "club") {
    return filled ? "text-[#e8324a]" : "text-[#e8324a]/25";
  }

  return "";
}

export function StarRating({
  value,
  userStars,
  onVote,
  disabled,
  size = "md",
  atmosphere = "cosmos",
  compact = false,
}: {
  value: { average: number; voteCount: number };
  userStars: number | null;
  onVote: (stars: number) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  atmosphere?: WorldAtmosphere;
  compact?: boolean;
}) {
  const accent = PRESS_WORLD_THEME[atmosphere].accent;
  const starClass = size === "lg" ? "text-2xl md:text-xl" : "text-lg";
  const labelClass =
    size === "lg"
      ? "text-base uppercase tracking-widest text-white/40 md:text-sm"
      : "text-[10px] uppercase tracking-widest text-white/40 md:text-[7px]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5" role="group" aria-label="Bewertung">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (userStars ?? 0) >= star;
          const styleClass = starStyle(atmosphere, filled);
          const colorStyle =
            atmosphere === "cosmos" && filled
              ? { color: accent }
              : atmosphere === "cosmos" && !filled
                ? { color: `${accent}40` }
                : undefined;

          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onVote(star)}
              className={`${starClass} leading-none transition hover:scale-110 disabled:opacity-40 ${styleClass}`}
              style={colorStyle}
              aria-label={`${star} Sterne`}
            >
              ★
            </button>
          );
        })}
      </div>
      {!compact ? (
        <span className={labelClass}>
          {value.voteCount > 0 ? `Ø ${value.average} · ${value.voteCount}` : "—"}
        </span>
      ) : null}
    </div>
  );
}
