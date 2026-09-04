"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import type { SiteLinks } from "@/types/content";
import { NfcClubProvider } from "@/context/NfcClubContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

function isNfcImmersivePath(pathname: string): boolean {
  return pathname === "/nfc/play" || pathname.endsWith("/nfc/play");
}

export function SiteChrome({
  children,
  logoUrl,
  siteLinks,
}: {
  children: ReactNode;
  logoUrl?: string;
  siteLinks: SiteLinks;
}) {
  const pathname = usePathname();
  const immersive = isNfcImmersivePath(pathname);

  return (
    <NfcClubProvider>
      {!immersive && <Header logoUrl={logoUrl} siteLinks={siteLinks} />}
      <main className={immersive ? "contents" : undefined}>{children}</main>
      {!immersive && <Footer />}
    </NfcClubProvider>
  );
}
