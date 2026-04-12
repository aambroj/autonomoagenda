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

  if (normalized.includes("not found")) {
    return "No se ha encontrado la invitación.";
  }

  if (normalized.includes("invalid")) {
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
      const formData = new FormData();
      formData.append("action", action);

      const response = await fetch(`/api/compartir/invitaciones/${inviteId}`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
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

  const isBusy = Boolean(submittingAction) || isRefreshing;

  if (variant === "outgoing") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => submitAction("cancel")}
          disabled={isBusy}
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
          disabled={isBusy}
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
          disabled={isBusy}
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
