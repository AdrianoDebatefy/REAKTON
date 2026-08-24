"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import type { SiteLinks } from "@/types/content";
import { useClientIntl } from "@/components/ClientIntlShell";
import { localeSwitchLabel, nextLocale } from "@/lib/locale";
import { stripLocaleFromPathname } from "@/lib/locale-path";
import type { Locale } from "@/types/content";

interface HeaderProps {
  logoUrl?: string;
  siteLinks: SiteLinks;
  onHomeClick?: () => void;
}

const headerTextClass = "text-[30px] md:text-[21px] uppercase tracking-widest";

const mobileHeaderBtnClass =
  "inline-flex min-h-[2.25rem] min-w-[2.75rem] items-center justify-center rounded border border-white/15 px-2.5 py-1 text-lg uppercase tracking-widest text-white/60 transition hover:border-white/30";

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

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
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

export function Header({ logoUrl, siteLinks, onHomeClick }: HeaderProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { switchLocaleClient } = useClientIntl();

  const switchLocale = () => {
    const next = nextLocale(locale) as Locale;
    const barePath = stripLocaleFromPathname(pathname);
    // Landing + worlds: switch messages/URL without remounting animations.
    if (barePath === "/") {
      void switchLocaleClient(next);
      return;
    }
    router.replace(barePath, { locale: next });
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
    { href: "/toy", label: t("toy"), chip: "toy" },
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
          className="flex shrink-0 origin-left items-center py-3 pl-[50px] opacity-90 transition hover:opacity-100 max-md:scale-[0.7] max-md:translate-x-[20%]"
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

        <div className="flex items-center gap-1.5 py-3 max-md:gap-1 max-md:pr-1">
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
            className={`rounded border border-white/15 px-2.5 py-1 ${headerTextClass} text-white/60 hover:border-white/30 max-md:inline-flex max-md:min-h-[2.25rem] max-md:min-w-[2.75rem] max-md:-translate-x-2 max-md:items-center max-md:justify-center max-md:text-lg`}
            aria-label="Switch language"
          >
            {localeSwitchLabel(locale)}
          </button>

          <details className="relative lg:hidden">
            <summary
              className={`${mobileHeaderBtnClass} max-md:-translate-x-2 cursor-pointer list-none`}
              aria-label={t("menu")}
            >
              <HamburgerIcon className="h-5 w-5" />
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
