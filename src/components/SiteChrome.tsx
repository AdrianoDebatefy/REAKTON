"use client";

import type { ReactNode } from "react";
import type { SiteLinks } from "@/types/content";
import { NfcClubProvider } from "@/context/NfcClubContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function SiteChrome({
  children,
  logoUrl,
  siteLinks,
}: {
  children: ReactNode;
  logoUrl?: string;
  siteLinks: SiteLinks;
}) {
  return (
    <NfcClubProvider>
      <Header logoUrl={logoUrl} siteLinks={siteLinks} />
      <main>{children}</main>
      <Footer />
    </NfcClubProvider>
  );
}
