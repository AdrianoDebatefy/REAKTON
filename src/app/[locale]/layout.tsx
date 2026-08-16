import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/types/content";
import { CookieProvider } from "@/context/CookieContext";
import { CookieBanner } from "@/components/CookieBanner";
import { ClientIntlShell } from "@/components/ClientIntlShell";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";
import { LocaleDocument } from "@/components/LocaleDocument";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { getSiteContent } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

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
    ...buildPageMetadata({
      locale: locale as Locale,
      path: "/",
      title: t("title"),
      description: t("description"),
    }),
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: t("title"),
      template: "%s | REAKTON",
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
  if (!routing.locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const content = getSiteContent();

  return (
    <ClientIntlShell initialLocale={locale as Locale} initialMessages={messages}>
      <LocaleDocument />
      <SiteJsonLd />
      <CookieProvider>
        <Header logoUrl={content.brandLogo} siteLinks={content.siteLinks} />
        <main>{children}</main>
        <Footer />
        <CookieBanner />
        <PageViewTracker />
      </CookieProvider>
    </ClientIntlShell>
  );
}
