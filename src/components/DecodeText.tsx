"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "01アイウエオカキクケコABCDEFGHIJKLMNOPQRSTUVWXYZ:<>#%&";

export type DecodeMode = "static" | "in" | "out";

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "X";
}

function scrambleChar(char: string) {
  if (char === " ") return " ";
  if (char === ":") return ":";
  return randomGlyph();
}

function scrambleAll(text: string) {
  return Array.from(text).map(scrambleChar).join("");
}

function decodeIn(text: string, progress: number) {
  return Array.from(text)
    .map((char, i) => {
      if (char === " " || char === ":") return char;
      const lockAt = (i + 1) / Math.max(text.length, 1);
      return progress >= lockAt ? char : scrambleChar(char);
    })
    .join("");
}

function decodeOut(text: string, progress: number) {
  return Array.from(text)
    .map((char, i) => {
      if (char === " " || char === ":") return char;
      const scrambleAt = i / Math.max(text.length - 1, 1);
      return progress >= scrambleAt ? scrambleChar(char) : char;
    })
    .join("");
}

type DecodeTag = "h1" | "h2" | "p" | "span";

export function DecodeText({
  text,
  mode = "static",
  className,
  style,
  as: Tag = "span",
  duration = 720,
  onComplete,
}: {
  text: string;
  mode?: DecodeMode;
  className?: string;
  style?: React.CSSProperties;
  as?: DecodeTag;
  duration?: number;
  onComplete?: () => void;
}) {
  const [display, setDisplay] = useState(mode === "in" ? scrambleAll(text) : text);
  const [opacity, setOpacity] = useState(mode === "in" ? 0.35 : 1);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (mode === "static") {
      setDisplay(text);
      setOpacity(1);
      return;
    }

    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / duration);

      if (mode === "in") {
        setDisplay(decodeIn(text, t));
        setOpacity(0.35 + t * 0.65);
      } else {
        setDisplay(decodeOut(text, t));
        setOpacity(1 - t * 0.9);
      }

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(mode === "in" ? text : scrambleAll(text));
        setOpacity(mode === "in" ? 1 : 0);
        onCompleteRef.current?.();
      }
    };

    if (mode === "in") {
      setDisplay(scrambleAll(text));
      setOpacity(0.35);
    } else {
      setDisplay(text);
      setOpacity(1);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, mode, duration]);

  return (
    <Tag className={className} style={{ ...style, opacity }} aria-label={text}>
      {display}
    </Tag>
  );
}
