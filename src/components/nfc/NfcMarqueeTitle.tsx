"use client";

import { useEffect, useRef, useState } from "react";

export function NfcMarqueeTitle({
  title,
  className,
  style,
}: {
  title: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    setShouldScroll(text.scrollWidth > container.clientWidth + 2);
  }, [title]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className ?? ""}`} style={style}>
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${shouldScroll ? "nfc-marquee-title" : ""}`}
      >
        {title}
      </span>
    </div>
  );
}
