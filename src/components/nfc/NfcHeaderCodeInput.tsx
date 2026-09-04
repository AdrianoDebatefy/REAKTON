"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useNfcClubOptional } from "@/context/NfcClubContext";

const headerTextClass = "text-[30px] md:text-[21px] uppercase tracking-widest";

export function NfcHeaderCodeInput() {
  const nfc = useNfcClubOptional();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!nfc) return null;

  const visible =
    nfc.clubDesktopActive && nfc.entryVisible && !nfc.authenticated && !nfc.fadingOut;

  if (!visible && !nfc.fadingOut) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy || nfc.fadingOut) return;
    setBusy(true);
    const ok = await nfc.pairCode(trimmed);
    setBusy(false);
    if (ok) {
      nfc.setFadingOut(true);
      setCode("");
    }
  };

  return (
    <motion.form
      data-player-ui
      onSubmit={(e) => void handleSubmit(e)}
      className={`${headerTextClass} hidden items-center gap-2 bg-[rgb(72_18_28/0.68)] px-4 py-3 text-red-100/95 lg:inline-flex`}
      initial={{ opacity: 0 }}
      animate={{ opacity: nfc.fadingOut ? 0 : 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (nfc.fadingOut) nfc.setFadingOut(false);
      }}
    >
      <span className="shrink-0">CODE:</span>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={busy || nfc.fadingOut}
        className="w-[min(28vw,18rem)] min-w-[14rem] border-0 border-b border-red-100/35 bg-transparent font-mono text-[30px] uppercase leading-none tracking-widest text-red-50 outline-none placeholder:text-red-100/35 md:text-[21px]"
        autoComplete="off"
        spellCheck={false}
        aria-label="NFC code"
      />
    </motion.form>
  );
}
