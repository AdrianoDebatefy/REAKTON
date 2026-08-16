"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "@/types/content";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { notifyContentUpdated } from "@/lib/content-events";
import { SITE_BUILD_LABEL } from "@/lib/site-build";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [message, setMessage] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setLoggedIn(true);
      await loadContent();
    } else {
      setMessage("Login fehlgeschlagen");
    }
  }

  async function loadContent(): Promise<boolean> {
    const res = await fetch("/api/admin/content");
    if (!res.ok) return false;
    setContent((await res.json()) as SiteContent);
    return true;
  }

  useEffect(() => {
    void loadContent().then((ok) => {
      if (ok) setLoggedIn(true);
    });
  }, []);

  async function save(data: SiteContent) {
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("save failed");
    const payload = (await res.json()) as { content?: SiteContent };
    notifyContentUpdated();
    if (payload.content) {
      setContent(payload.content);
    } else {
      await loadContent();
    }
  }

  if (!loggedIn || !content) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-32">
        <h1 className="text-xl font-light uppercase tracking-widest">REAKTON Admin</h1>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          Cover-Slots befüllen, Hintergründe hochladen. Gespeichert wird in{" "}
          <code className="text-white/60">data/site-content.local.json</code> (bleibt beim Update erhalten).
        </p>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full border border-white/20 bg-transparent px-3 py-2"
          />
          <button type="submit" className="w-full bg-white py-2 text-black">
            Login
          </button>
        </form>
        <p className="mt-4 text-xs text-white/35">
          Passwort vom Hosting (ADMIN_PASSWORD) oder nach Login unter «Zugang» ändern.
        </p>
        {message && <p className="mt-4 text-sm text-red-400">{message}</p>}
        <p className="mt-8 text-[10px] uppercase tracking-widest text-white/25">
          Build: {SITE_BUILD_LABEL}
        </p>
      </div>
    );
  }

  return <AdminPanel content={content} onSave={save} />;
}
