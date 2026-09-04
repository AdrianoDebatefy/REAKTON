"use client";

import { NFC_PLAYER_ASSETS } from "@/lib/nfc-player-assets";

interface NfcSeekBarProps {
  value: number;
  disabled?: boolean;
  left: number;
  top: number;
  width: number;
  knobSize: number;
  onChange: (ratio: number) => void;
}

export function NfcSeekBar({
  value,
  disabled,
  left,
  top,
  width,
  knobSize,
  onChange,
}: NfcSeekBarProps) {
  const thumbLeft = `calc(${value * 100}% - ${knobSize / 2}px)`;

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width,
        height: knobSize,
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/35" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={NFC_PLAYER_ASSETS.knob}
        alt=""
        width={knobSize}
        height={knobSize}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{ left: thumbLeft }}
        draggable={false}
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
