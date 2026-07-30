import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REAKTON WEBSITE 2026",
  description: "REAKTON — Robotronic music from Berlin. micro:macro:nano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
