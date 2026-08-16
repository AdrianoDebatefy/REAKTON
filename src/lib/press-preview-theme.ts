import type { WorldAtmosphere } from "@/types/content";

export const PRESS_WORLD_ORDER: WorldAtmosphere[] = ["cosmos", "nano", "club"];

export const PRESS_WORLD_THEME: Record<
  WorldAtmosphere,
  {
    labelDe: string;
    labelEn: string;
    labelJa: string;
    button: string;
    glow: string;
    accent: string;
    eq: [string, string];
  }
> = {
  cosmos: {
    labelDe: "Weltall:Erde:Mensch",
    labelEn: "Universe:Earth:Human",
    labelJa: "宇宙:地球:人間",
    button: "bg-[#2a5590] hover:bg-[#3d6ea8] border-[#3d7dd4]/50",
    glow: "shadow-[0_0_40px_rgba(61,125,212,0.35)]",
    accent: "#3d7dd4",
    eq: ["#1a3a6e", "#3d7dd4"],
  },
  nano: {
    labelDe: "Micro:Macro:Nano",
    labelEn: "Micro:Macro:Nano",
    labelJa: "Micro:Macro:Nano",
    button: "bg-[#565f6d] hover:bg-[#6b7280] border-[#c8d0dc]/40",
    glow: "shadow-[0_0_40px_rgba(200,208,220,0.2)]",
    accent: "#c8d0dc",
    eq: ["#4b5563", "#c8d0dc"],
  },
  club: {
    labelDe: "Clip:Clap:Club",
    labelEn: "Clip:Clap:Club",
    labelJa: "Clip:Clap:Club",
    button: "bg-[#6e1830] hover:bg-[#8b2038] border-[#e8324a]/45",
    glow: "shadow-[0_0_40px_rgba(232,50,74,0.28)]",
    accent: "#e8324a",
    eq: ["#6b1528", "#e8324a"],
  },
};

export function pressWorldLabel(atmosphere: WorldAtmosphere, locale: string): string {
  const theme = PRESS_WORLD_THEME[atmosphere];
  if (locale === "ja") return theme.labelJa;
  if (locale === "en") return theme.labelEn;
  return theme.labelDe;
}
