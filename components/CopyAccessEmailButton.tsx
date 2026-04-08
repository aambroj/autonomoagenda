"use client";

import { useState } from "react";

type CopyAccessEmailButtonProps = {
  email: string;
};

export default function CopyAccessEmailButton({
  email,
}: CopyAccessEmailButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setError(false);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError(true);

      window.setTimeout(() => {
        setError(false);
      }, 2200);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        {copied ? "Email copiado" : "Copiar email"}
      </button>

      {error ? (
        <span className="text-sm font-medium text-red-700">
          No se pudo copiar automáticamente.
        </span>
      ) : null}
    </div>
  );
}