"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContactMessage } from "@/lib/contact-messages";

function formatDate(at: string) {
  if (!at) return "—";
  try {
    return new Date(at).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return at;
  }
}

export function ContactMessagesSection() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/messages");
      if (!res.ok) throw new Error("unauthorized");
      const data = (await res.json()) as { messages: ContactMessage[] };
      setMessages(data.messages);
      setSelectedId((prev) => {
        if (prev && data.messages.some((m) => m.id === prev)) return prev;
        return data.messages[0]?.id ?? null;
      });
    } catch {
      setError("Nachrichten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = messages.find((m) => m.id === selectedId);

  async function removeMessage(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete failed");
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      setError("Löschen fehlgeschlagen.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="mt-6 text-sm text-white/50">Lade Nachrichten…</p>;
  }

  if (error && messages.length === 0) {
    return <p className="mt-6 text-sm text-red-300/80">{error}</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        Kontaktformular auf <code className="text-white/55">/contact</code> — Nachrichten werden als
        Text auf dem Server in <code className="text-white/55">data/messages/</code> gespeichert (kein
        E-Mail-Versand).
      </p>

      {messages.length === 0 ? (
        <p className="text-sm text-white/40">Noch keine Nachrichten.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
          <ul className="space-y-1 rounded border border-white/15 p-2">
            {messages.map((msg) => {
              const active = msg.id === selectedId;
              return (
                <li key={msg.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(msg.id)}
                    className={`w-full rounded px-2 py-2 text-left text-xs transition ${
                      active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/85"
                    }`}
                  >
                    <span className="block truncate font-medium">{msg.name || msg.email}</span>
                    <span className="block truncate text-[10px] text-white/40">{formatDate(msg.at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="rounded border border-white/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">
                    {formatDate(selected.at)}
                  </p>
                  <h2 className="mt-1 text-lg font-light">{selected.name}</h2>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm text-white/65 underline hover:text-white"
                  >
                    {selected.email}
                  </a>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void removeMessage(selected.id)}
                  className="text-[10px] uppercase tracking-widest text-white/45 underline hover:text-white/70 disabled:opacity-50"
                >
                  Löschen
                </button>
              </div>

              {selected.subject ? (
                <p className="mt-4 text-sm text-white/75">
                  <span className="text-white/40">Betreff: </span>
                  {selected.subject}
                </p>
              ) : null}

              <div className="mt-4 rounded border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/85 whitespace-pre-wrap">
                {selected.message}
              </div>
            </article>
          ) : (
            <p className="text-sm text-white/40">Nachricht aus der Liste wählen.</p>
          )}
        </div>
      )}

      {error && messages.length > 0 ? (
        <p className="text-sm text-red-300/80">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void load()}
        className="text-[10px] uppercase tracking-widest text-white/45 underline hover:text-white/70"
      >
        Liste aktualisieren
      </button>
    </div>
  );
}
