"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteJobButtonProps = {
  jobId: number;
  clientName: string;
};

export default function DeleteJobButton({
  jobId,
  clientName,
}: DeleteJobButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Seguro que quieres borrar el trabajo de ${clientName}?`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/trabajos/${jobId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo borrar el trabajo.");
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo borrar el trabajo.";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
      >
        {deleting ? "Borrando..." : "Borrar"}
      </button>

      {error ? (
        <p className="max-w-[220px] text-right text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}