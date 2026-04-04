"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type JobActionsProps = {
  jobId: number;
  clientName: string;
  status: string;
};

function normalizeStatus(value: string) {
  return value.trim().toLowerCase();
}

export default function JobActions({
  jobId,
  clientName,
  status,
}: JobActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedStatus = normalizeStatus(status);

  async function updateStatus(nextStatus: string, actionLabel: string) {
    setBusyAction(actionLabel);
    setError(null);

    try {
      const response = await fetch(`/api/trabajos/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo cambiar el estado.");
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado.";
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteJob() {
    const confirmation = window.prompt(
      `Vas a eliminar definitivamente el trabajo de ${clientName}. Para confirmar, escribe "eliminar".`
    );

    if (confirmation === null) return;

    setBusyAction("delete");
    setError(null);

    try {
      const response = await fetch(`/api/trabajos/${jobId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirm_text: confirmation,
        }),
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
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {normalizedStatus === "pendiente" ? (
          <>
            <button
              type="button"
              onClick={() => updateStatus("hecho", "done")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "done" ? "Guardando..." : "Marcar hecho"}
            </button>

            <button
              type="button"
              onClick={() => updateStatus("cancelado", "cancel")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "cancel" ? "Guardando..." : "Cancelar trabajo"}
            </button>
          </>
        ) : null}

        {normalizedStatus === "hecho" ? (
          <>
            <button
              type="button"
              onClick={() => updateStatus("facturado", "invoice")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "invoice" ? "Guardando..." : "Marcar facturado"}
            </button>

            <button
              type="button"
              onClick={() => updateStatus("pendiente", "reopen")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "reopen"
                ? "Guardando..."
                : "Volver a comprometido"}
            </button>
          </>
        ) : null}

        {normalizedStatus === "cancelado" ? (
          <>
            <button
              type="button"
              onClick={() => updateStatus("pendiente", "reactivate")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "reactivate"
                ? "Guardando..."
                : "Reactivar trabajo"}
            </button>

            <button
              type="button"
              onClick={deleteJob}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "delete"
                ? "Borrando..."
                : "Eliminar definitivamente"}
            </button>
          </>
        ) : null}

        {normalizedStatus === "facturado" ? (
          <button
            type="button"
            onClick={() => updateStatus("archivado", "archive")}
            disabled={!!busyAction}
            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {busyAction === "archive" ? "Guardando..." : "Archivar trabajo"}
          </button>
        ) : null}

        {normalizedStatus === "archivado" ? (
          <button
            type="button"
            onClick={deleteJob}
            disabled={!!busyAction}
            className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {busyAction === "delete"
              ? "Borrando..."
              : "Eliminar definitivamente"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="max-w-[280px] text-right text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}