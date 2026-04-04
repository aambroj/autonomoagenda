"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SharedInviteActionsProps = {
  inviteId: string;
  variant: "received" | "sent";
};

export default function SharedInviteActions({
  inviteId,
  variant,
}: SharedInviteActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: "accept" | "reject" | "cancel") {
    setBusyAction(action);
    setError(null);

    try {
      const response = await fetch(`/api/compartir/invitaciones/${inviteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo actualizar la invitación.");
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la invitación.";
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {variant === "received" ? (
          <>
            <button
              type="button"
              onClick={() => runAction("accept")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "accept" ? "Guardando..." : "Aceptar"}
            </button>

            <button
              type="button"
              onClick={() => runAction("reject")}
              disabled={!!busyAction}
              className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {busyAction === "reject" ? "Guardando..." : "Rechazar"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => runAction("cancel")}
            disabled={!!busyAction}
            className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {busyAction === "cancel" ? "Guardando..." : "Cancelar invitación"}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}