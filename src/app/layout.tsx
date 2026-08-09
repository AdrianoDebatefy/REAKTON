import type { Metadata } from "next";
import { Rajdhani } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "REAKTON WEBSITE 2026",
  description: "REAKTON — Robotronic music from Berlin. micro:macro:nano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${rajdhani.variable} min-h-[100dvh] bg-[#050508] font-sans text-[#e8e8ec] antialiased md:min-h-screen`}
        style={{ fontFamily: "var(--font-rajdhani), system-ui, sans-serif" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
