import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/types/content";
import { CookieProvider } from "@/context/CookieContext";
import { CookieBanner } from "@/components/CookieBanner";
import { ClientIntlShell } from "@/components/ClientIntlShell";
import { SiteChrome } from "@/components/SiteChrome";
import { PageViewTracker } from "@/components/PageViewTracker";
import { LocaleDocument } from "@/components/LocaleDocument";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { getSiteContent } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

/** Admin edits data/site-content.local.json at runtime — do not bake at build time. */
export const dynamic = "force-dynamic";

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

  setRequestLocale(locale);

  const messages = await getMessages();
  const content = getSiteContent();

  return (
    <ClientIntlShell initialLocale={locale as Locale} initialMessages={messages}>
      <LocaleDocument />
      <SiteJsonLd />
      <CookieProvider>
        <SiteChrome logoUrl={content.brandLogo} siteLinks={content.siteLinks}>
          {children}
        </SiteChrome>
        <CookieBanner />
        <PageViewTracker />
      </CookieProvider>
    </ClientIntlShell>
  );
}
