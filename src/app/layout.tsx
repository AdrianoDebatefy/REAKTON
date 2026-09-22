import type { Metadata } from "next";
import { headers } from "next/headers";
import { Rajdhani } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "REAKTON — Robotronic Music",
  description:
    "REAKTON — Elektro-Duo aus Berlin. Robotronic Music — Elektronik in der Tradition von Kraftwerk und deutscher Synthpop-Kultur.",
  icons: {
    icon: "/brand/reakton-logo.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const locale = headerStore.get("x-reakton-locale") || "de";

  return (
    <html lang={locale} suppressHydrationWarning className={rajdhani.variable}>
      <body
        className="min-h-screen bg-[#050508] font-sans text-[#e8e8ec] antialiased"
        style={{ fontFamily: "var(--font-rajdhani), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
