"use client";

import { useState } from "react";

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Neues Passwort und Bestätigung stimmen nicht überein.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Neues Passwort: mindestens 8 Zeichen.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (data?.error === "wrong_password") {
          setError("Aktuelles Passwort ist falsch.");
        } else if (data?.error) {
          setError(data.error);
        } else {
          setError("Passwort konnte nicht geändert werden.");
        }
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Passwort geändert — gespeichert in data/admin.local.json");
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        Neues Passwort wird in{" "}
        <code className="text-white/55">data/admin.local.json</code> gespeichert (bleibt beim
        Repo-Update erhalten). Ohne Datei gilt <code className="text-white/55">ADMIN_PASSWORD</code>{" "}
        aus der Server-Umgebung.
      </p>

      <label className="block text-xs text-white/55">
        Aktuelles Passwort
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="mt-1 w-full max-w-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
        />
      </label>

      <label className="block text-xs text-white/55">
        Neues Passwort
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 w-full max-w-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
        />
      </label>

      <label className="block text-xs text-white/55">
        Neues Passwort bestätigen
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 w-full max-w-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="rounded border border-white/25 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:border-white/50 disabled:opacity-50"
      >
        {busy ? "Speichern…" : "Passwort ändern"}
      </button>

      {message && <p className="text-sm text-green-400/80">{message}</p>}
      {error && <p className="text-sm text-red-400/80">{error}</p>}
    </form>
  );
}
