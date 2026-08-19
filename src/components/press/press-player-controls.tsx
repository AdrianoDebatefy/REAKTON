"use client";

export function formatTimeExtended(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00:00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:00`;
}

export function ProgressBar({
  value,
  accent,
  disabled,
  onChange,
  touch = false,
  touchCompact = false,
}: {
  value: number;
  accent: string;
  disabled?: boolean;
  onChange: (ratio: number) => void;
  touch?: boolean;
  /** ~70% of `touch` sizing for compact mobile layouts */
  touchCompact?: boolean;
}) {
  const thumbOffset = touchCompact ? 6 : touch ? 8 : 5;
  const thumbLeft = `calc(${value * 100}% - ${thumbOffset}px)`;
  const heightClass = touchCompact ? "h-7" : touch ? "h-10" : "h-3";
  const thumbClass = touchCompact ? "h-2.5 w-2.5" : touch ? "h-4 w-4" : "h-2.5 w-2.5";

  return (
    <div className={`relative w-full ${heightClass}`}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/35" />
      <div
        className={`pointer-events-none absolute top-1/2 ${thumbClass} -translate-y-1/2 rounded-full border-2 border-white bg-black/20`}
        style={{ left: thumbLeft, boxShadow: `0 0 0 1px ${accent}55` }}
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        aria-label="Position"
      />
    </div>
  );
}

export function GlassTransportButton({
  isPlaying,
  label,
  onClick,
  large = false,
  largeCompact = false,
}: {
  isPlaying: boolean;
  label: string;
  onClick: () => void;
  large?: boolean;
  /** ~70% of `large` sizing for compact mobile layouts */
  largeCompact?: boolean;
}) {
  const isLarge = large || largeCompact;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        largeCompact
          ? "group relative h-[2.1rem] w-full max-w-[8.4rem] shrink-0 overflow-hidden rounded-md border border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.22)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_3px_8px_rgba(0,0,0,0.35)] transition active:scale-[0.98]"
          : large
            ? "group relative h-12 w-full max-w-[12rem] shrink-0 overflow-hidden rounded-lg border border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.22)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.35)] transition active:scale-[0.98]"
            : "group relative h-5 w-[5.52rem] shrink-0 overflow-hidden rounded-md border border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.22)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(255,255,255,0.08),0_3px_10px_rgba(0,0,0,0.35)] transition hover:border-white/45"
      }
      aria-label={label}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_35%,rgba(255,255,255,0.34)_48%,rgba(255,255,255,0.08)_58%,transparent_72%)]"
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute inset-[1px] border border-white/10 ${
          largeCompact ? "rounded-[5px]" : isLarge ? "rounded-[7px]" : "rounded-[5px]"
        }`}
        aria-hidden
      />
      <span
        className={`relative z-10 flex h-full items-center justify-center gap-1.5 uppercase tracking-[0.22em] text-white/90 ${
          largeCompact ? "px-3 text-[0.7rem]" : isLarge ? "px-4 text-sm" : "px-2 text-[10px]"
        }`}
      >
        <span
          className={
            largeCompact ? "text-[0.525rem] leading-none" : isLarge ? "text-xs leading-none" : "text-[9px] leading-none"
          }
        >
          {isPlaying ? "⏹" : "▶"}
        </span>
        <span>{label}</span>
      </span>
    </button>
  );
}

/** Glass sheen only — no backdrop-blur (that softens the EQ canvas underneath). */
export function GlassEqOverlay({ rounded = "md" }: { rounded?: "md" | "lg" }) {
  const radius = rounded === "lg" ? "rounded-lg" : "rounded-md";
  const innerRadius = rounded === "lg" ? "rounded-[7px]" : "rounded-[5px]";

  return (
    <>
      <span
        className={`pointer-events-none absolute inset-0 ${radius} border border-white/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.03)_40%,rgba(0,0,0,0.15)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.06)]`}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute inset-[1px] ${innerRadius} border border-white/10`}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute inset-0 ${radius} bg-[linear-gradient(125deg,transparent_38%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.05)_60%,transparent_74%)]`}
        aria-hidden
      />
    </>
  );
}

export function HorizontalVolume({
  volume,
  accent,
  label,
  onChange,
  compact = false,
}: {
  volume: number;
  accent: string;
  label: string;
  onChange: (value: number) => void;
  /** ~70% sizing for compact mobile layouts */
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center uppercase tracking-widest text-white/50 ${
        compact ? "gap-2 text-[7px]" : "gap-3 text-[10px]"
      }`}
    >
      <span className="shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`min-w-0 flex-1 cursor-pointer touch-manipulation ${compact ? "h-7" : "h-10"}`}
        style={{ accentColor: accent }}
        aria-label={label}
      />
    </label>
  );
}
