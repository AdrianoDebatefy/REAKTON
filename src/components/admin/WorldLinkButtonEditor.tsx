"use client";

import type { WorldLinkButton } from "@/types/content";
import { CONTENT_LOCALES, LOCALE_LABELS } from "@/lib/locale";
import {
  WORLD_LINK_BUTTON_HEIGHT,
  WORLD_LINK_BUTTON_WIDTH,
  WORLD_LINK_DESIGN_HEIGHT,
  WORLD_LINK_DESIGN_WIDTH,
  defaultWorldLinkButton,
  normalizeWorldLinkButton,
} from "@/lib/world-link-button";

export function WorldLinkButtonEditor({
  value,
  onChange,
  inputClassName = "mt-1 w-full border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white",
}: {
  value?: WorldLinkButton | null;
  onChange: (next: WorldLinkButton) => void;
  inputClassName?: string;
}) {
  const button = normalizeWorldLinkButton(value);

  const update = (patch: Partial<WorldLinkButton>) => {
    onChange({ ...button, ...patch });
  };

  return (
    <div className="space-y-4 rounded border border-white/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs uppercase tracking-widest text-white/60">Link-Button</h3>
        <label className="flex items-center gap-2 text-xs text-white/85">
          <input
            type="checkbox"
            checked={button.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          Ein (ON)
        </label>
      </div>

      <p className="text-[11px] text-white/45">
        Rechteck {WORLD_LINK_BUTTON_WIDTH}×{WORLD_LINK_BUTTON_HEIGHT} px — Position bezogen auf
        Design-Canvas {WORLD_LINK_DESIGN_WIDTH}×{WORLD_LINK_DESIGN_HEIGHT} (Desktop).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-white/75">
          Position X (px)
          <input
            type="number"
            min={0}
            max={WORLD_LINK_DESIGN_WIDTH}
            value={button.x}
            onChange={(e) => update({ x: Number(e.target.value) || 0 })}
            className={inputClassName}
          />
        </label>
        <label className="block text-xs text-white/75">
          Position Y (px)
          <input
            type="number"
            min={0}
            max={WORLD_LINK_DESIGN_HEIGHT}
            value={button.y}
            onChange={(e) => update({ y: Number(e.target.value) || 0 })}
            className={inputClassName}
          />
        </label>
      </div>

      <label className="block text-xs text-white/75">
        Link (URL)
        <input
          type="text"
          value={button.url}
          onChange={(e) => update({ url: e.target.value })}
          placeholder="/merch oder https://…"
          className={inputClassName}
        />
      </label>

      <label className="block text-xs text-white/75">
        Hintergrundfarbe
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            value={button.backgroundColor}
            onChange={(e) => update({ backgroundColor: e.target.value })}
            className="h-10 w-14 cursor-pointer border border-white/20 bg-transparent"
          />
          <input
            type="text"
            value={button.backgroundColor}
            onChange={(e) => update({ backgroundColor: e.target.value })}
            className={inputClassName}
          />
        </div>
      </label>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-white/50">Label-Text</p>
        {CONTENT_LOCALES.map((locale) => (
          <label key={locale} className="block text-xs text-white/75">
            {LOCALE_LABELS[locale]}
            <input
              type="text"
              value={button.label[locale] ?? ""}
              onChange={(e) =>
                update({
                  label: {
                    ...button.label,
                    [locale]: e.target.value,
                  },
                })
              }
              className={inputClassName}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function ensureWorldLinkButton(value?: WorldLinkButton | null): WorldLinkButton {
  return normalizeWorldLinkButton(value ?? defaultWorldLinkButton());
}
