import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Rajdhani } from "next/font/google";
import { routing } from "@/i18n/routing";
import { CookieProvider } from "@/context/CookieContext";
import { CookieBanner } from "@/components/CookieBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSiteContent } from "@/lib/content";
import "../globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "REAKTON",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "de" | "en" | "ja")) notFound();

  const messages = await getMessages();
  const content = getSiteContent();

  return (
    <html lang={locale}>
      <body
        className={`${rajdhani.variable} min-h-screen bg-[#050508] font-sans text-[#e8e8ec] antialiased`}
        style={{ fontFamily: "var(--font-rajdhani), system-ui, sans-serif" }}
      >
        <NextIntlClientProvider messages={messages}>
          <CookieProvider>
            <Header
              logoUrl={content.brandLogo}
              siteLinks={content.siteLinks}
              clapToyUrl={content.clapToyUrl}
            />
            <main>{children}</main>
            <Footer />
            <CookieBanner />
          </CookieProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
