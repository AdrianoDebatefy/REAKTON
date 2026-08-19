"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const COVER_SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };

export function PressSlotCover({
  trackId,
  coverImage,
  accent,
  title,
  className = "",
}: {
  trackId: string;
  coverImage?: string;
  accent: string;
  title: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const layoutId = `press-slot-cover-${trackId}`;

  const open = useCallback(() => setExpanded(true), []);
  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, expanded]);

  if (!coverImage) {
    return (
      <div className={className} style={{ backgroundColor: accent }} aria-hidden />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={expanded}
        className={`${className} block cursor-zoom-in touch-manipulation disabled:cursor-default`}
        aria-label={`${title} — Cover vergrößern`}
        aria-expanded={expanded}
      >
        {!expanded ? (
          <motion.img
            layoutId={layoutId}
            src={coverImage}
            alt=""
            className="h-full w-full object-cover"
            transition={COVER_SPRING}
          />
        ) : (
          <span className="block h-full w-full bg-black/25" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {expanded ? (
          <>
            <motion.div
              key={`${layoutId}-backdrop`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] bg-black/55"
              aria-hidden
            />
            <div
              className="fixed inset-[10%] z-[201] flex items-center justify-center"
              role="dialog"
              aria-modal
              aria-label={title}
            >
              <button
                type="button"
                onClick={close}
                className="max-h-full max-w-full cursor-zoom-out touch-manipulation"
                aria-label={`${title} — Cover verkleinern`}
              >
                <motion.img
                  layoutId={layoutId}
                  src={coverImage}
                  alt=""
                  className="max-h-full max-w-full object-contain shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
                  transition={COVER_SPRING}
                />
              </button>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
