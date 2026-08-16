"use client";

export function StarRating({
  value,
  userStars,
  onVote,
  disabled,
}: {
  value: { average: number; voteCount: number };
  userStars: number | null;
  onVote: (stars: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5" role="group" aria-label="Bewertung">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (userStars ?? Math.round(value.average)) >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onVote(star)}
              className={`text-lg transition hover:scale-110 disabled:opacity-40 ${
                filled ? "text-amber-300" : "text-white/20"
              }`}
              aria-label={`${star} Sterne`}
            >
              ★
            </button>
          );
        })}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/40 md:text-[7px]">
        {value.voteCount > 0 ? `Ø ${value.average} · ${value.voteCount}` : "—"}
      </span>
    </div>
  );
}
