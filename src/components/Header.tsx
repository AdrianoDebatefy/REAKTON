"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import type { SiteLinks } from "@/types/content";
import { useClientIntl } from "@/components/ClientIntlShell";
import { localeSwitchLabel, nextLocale } from "@/lib/locale";
import type { Locale } from "@/types/content";

interface HeaderProps {
  logoUrl?: string;
  siteLinks: SiteLinks;
  clapToyUrl: string;
  onHomeClick?: () => void;
}

const headerTextClass = "text-[30px] uppercase tracking-widest";

type NavChipId = "live" | "merch" | "press" | "toy" | "contact";

const navChipStyles: Record<NavChipId, { bg: string; text: string; hover: string }> = {
  live: {
    bg: "bg-[rgb(38_48_62/0.78)]",
    text: "text-white/90",
    hover: "hover:bg-[rgb(48_58_74/0.88)]",
  },
  merch: {
    bg: "bg-[rgb(168_184_198/0.52)]",
    text: "text-white/92",
    hover: "hover:bg-[rgb(178_194_208/0.62)]",
  },
  press: {
    bg: "bg-[rgb(88_128_128/0.5)]",
    text: "text-white/90",
    hover: "hover:bg-[rgb(98_138_138/0.6)]",
  },
  toy: {
    bg: "bg-[rgb(28_42_72/0.72)]",
    text: "text-sky-200/95",
    hover: "hover:bg-[rgb(38_52_82/0.82)]",
  },
  contact: {
    bg: "bg-[rgb(72_18_28/0.68)]",
    text: "text-red-100/95",
    hover: "hover:bg-[rgb(82_24_34/0.78)]",
  },
};

function navChipClass(chip: NavChipId) {
  const style = navChipStyles[chip];
  return `${headerTextClass} ${style.bg} ${style.text} ${style.hover} inline-flex items-center px-4 py-3 transition`;
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function NavHref({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function Header({ logoUrl, siteLinks, clapToyUrl, onHomeClick }: HeaderProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { switchLocaleClient } = useClientIntl();

  const switchLocale = () => {
    const next = nextLocale(locale) as Locale;
    if (pathname === "/" || pathname === "") {
      void switchLocaleClient(next);
      return;
    }
    router.replace(pathname, { locale: next });
  };

  const merchHref = siteLinks.merchandise.trim() || "/merch";
  const pressHref = siteLinks.press.trim() || "/press";

  const navItems: { href: string; label: string; external?: boolean; chip: NavChipId }[] = [
    { href: "/live", label: t("live"), chip: "live" },
    {
      href: isExternalUrl(merchHref) ? merchHref : "/merch",
      label: t("merch"),
      external: isExternalUrl(merchHref),
      chip: "merch",
    },
    {
      href: isExternalUrl(pressHref) ? pressHref : "/press",
      label: t("press"),
      external: isExternalUrl(pressHref),
      chip: "press",
    },
    { href: clapToyUrl, label: t("toy"), external: true, chip: "toy" },
    { href: "/contact", label: t("contact"), chip: "contact" },
  ];

  const socialItems = [
    { id: "youtube", label: "YT", url: siteLinks.youtube },
    { id: "instagram", label: "IG", url: siteLinks.instagram },
    { id: "facebook", label: "FB", url: siteLinks.facebook },
  ].filter((item) => item.url.trim());

  const logoSrc = logoUrl?.trim() || "/brand/reakton-logo.webp";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="flex items-stretch justify-between gap-4 pr-4 md:pr-6">
        <Link
          href="/"
          onClick={onHomeClick}
          className="flex shrink-0 items-center py-3 pl-[50px] opacity-90 transition hover:opacity-100"
        >
          <img
            src={logoSrc}
            alt="REAKTON"
            width={240}
            height={30}
            className="h-[30px] w-auto"
            decoding="async"
          />
        </Link>

        <nav className="hidden flex-1 items-stretch justify-center lg:flex" aria-label="Main">
          {navItems.map((item) => (
            <NavHref
              key={item.chip}
              href={item.href}
              external={item.external}
              className={navChipClass(item.chip)}
            >
              {item.label}
            </NavHref>
          ))}
        </nav>

        <div className="flex items-center gap-3 py-3">
          <div className="hidden items-center gap-2 sm:flex">
            {socialItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${headerTextClass} tracking-wider text-white/40 hover:text-white/70`}
                title={item.id}
              >
                {item.label}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={switchLocale}
            className={`rounded border border-white/15 px-2.5 py-1 ${headerTextClass} text-white/60 hover:border-white/30`}
            aria-label="Switch language"
          >
            {localeSwitchLabel(locale)}
          </button>

          <details className="relative lg:hidden">
            <summary className={`cursor-pointer list-none ${headerTextClass} text-white/70`}>
              Menu
            </summary>
            <nav className="absolute right-0 mt-2 min-w-[10rem] rounded border border-white/10 bg-black/95 p-2">
              {navItems.map((item) => (
                <NavHref
                  key={item.chip}
                  href={item.href}
                  external={item.external}
                  className={`block ${navChipClass(item.chip)} my-0.5`}
                >
                  {item.label}
                </NavHref>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
