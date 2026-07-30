"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const captcha = useMemo(() => {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    return { a, b, answer: a + b };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      subject: form.get("subject"),
      message: form.get("message"),
      gdpr: form.get("gdpr") === "on",
      captchaAnswer: Number(form.get("captchaAnswer")),
      captchaExpected: captcha.answer,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) (e.target as HTMLFormElement).reset();
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-24">
      <h1 className="text-2xl font-light tracking-wide">{t("title")}</h1>
      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <label className="block text-xs uppercase tracking-widest text-white/50">
          {t("name")}
          <input
            name="name"
            required
            className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/50">
          {t("email")}
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/50">
          {t("subject")}
          <input name="subject" className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white" />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/50">
          {t("message")}
          <textarea
            name="message"
            required
            rows={5}
            className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs uppercase tracking-widest text-white/50">
          {t("captcha", { a: captcha.a, b: captcha.b })}
          <input
            name="captchaAnswer"
            type="number"
            required
            className="mt-1 w-24 border border-white/15 bg-transparent px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex gap-2 text-xs text-white/55">
          <input name="gdpr" type="checkbox" required className="mt-0.5" />
          <span>
            {t("gdpr")}{" "}
            <Link href="/datenschutz" className="underline">
              Datenschutz
            </Link>
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-white px-6 py-3 text-xs font-medium uppercase tracking-widest text-black disabled:opacity-50"
        >
          {t("submit")}
        </button>
        {status === "success" && <p className="text-sm text-green-400/80">{t("success")}</p>}
        {status === "error" && <p className="text-sm text-red-400/80">{t("error")}</p>}
      </form>
    </div>
  );
}
