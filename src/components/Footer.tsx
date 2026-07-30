"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function Footer() {
  const t = useTranslations("nav");

  return (
    <footer className="border-t border-white/5 px-4 py-6 text-center text-[10px] uppercase tracking-widest text-white/35">
      <nav className="flex justify-center gap-6" aria-label="Legal">
        <Link href="/impressum" className="hover:text-white/60">
          {t("impressum")}
        </Link>
        <Link href="/datenschutz" className="hover:text-white/60">
          {t("datenschutz")}
        </Link>
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} REAKTON</p>
    </footer>
  );
}
