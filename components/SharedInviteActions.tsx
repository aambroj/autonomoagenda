"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SharedInviteActionsProps = {
  inviteId: string;
  variant: "incoming" | "outgoing";
};

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized")) {
    return "Debes iniciar sesión para gestionar invitaciones.";
  }

  if (normalized.includes("not found") || normalized.includes("no existe")) {
    return "No se ha encontrado la invitación.";
  }

  if (normalized.includes("solo quien la recibe puede aceptar")) {
    return "Solo la persona que la recibe puede aceptarla.";
  }

  if (normalized.includes("solo quien la recibe puede rechazar")) {
    return "Solo la persona que la recibe puede rechazarla.";
  }

  if (normalized.includes("solo quien envió la invitación puede cancelarla")) {
    return "Solo quien la envió puede cancelarla.";
  }

  if (normalized.includes("pending") || normalized.includes("pendiente")) {
    return "La invitación ya no está pendiente o ya fue gestionada.";
  }

  if (normalized.includes("invalid") || normalized.includes("acción no válida")) {
    return "La acción no se pudo completar.";
  }

  return message || "No se pudo actualizar la invitación.";
}

export default function SharedInviteActions({
  inviteId,
  variant,
}: SharedInviteActionsProps) {
  const router = useRouter();
  const [submittingAction, setSubmittingAction] = useState<
    "accept" | "reject" | "cancel" | null
  >(null);
  const [isRefreshing, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  async function submitAction(action: "accept" | "reject" | "cancel") {
    setSubmittingAction(action);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/compartir/invitaciones/${inviteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean; ok?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo actualizar la invitación.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la invitación.";
      setErrorMessage(getFriendlyErrorMessage(message));
    } finally {
      setSubmittingAction(null);
    }
  }

  if (variant === "outgoing") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => submitAction("cancel")}
          disabled={Boolean(submittingAction) || isRefreshing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submittingAction === "cancel"
            ? "Cancelando..."
            : isRefreshing
              ? "Actualizando..."
              : "Cancelar invitación"}
        </button>

        {errorMessage ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => submitAction("accept")}
          disabled={Boolean(submittingAction) || isRefreshing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submittingAction === "accept"
            ? "Aceptando..."
            : isRefreshing
              ? "Actualizando..."
              : "Aceptar"}
        </button>

        <button
          type="button"
          onClick={() => submitAction("reject")}
          disabled={Boolean(submittingAction) || isRefreshing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submittingAction === "reject"
            ? "Rechazando..."
            : isRefreshing
              ? "Actualizando..."
              : "Rechazar"}
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
