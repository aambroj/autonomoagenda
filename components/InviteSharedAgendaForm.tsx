"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid email")) {
    return "Introduce un email válido.";
  }

  if (normalized.includes("obligatorio")) {
    return "Escribe el email del compañero que quieres invitar.";
  }

  if (normalized.includes("tu propio email")) {
    return "No puedes invitarte a ti mismo.";
  }

  if (normalized.includes("already")) {
    return "Ya existe una invitación o una conexión con ese profesional.";
  }

  if (normalized.includes("pending")) {
    return "Ya hay una invitación pendiente con ese profesional.";
  }

  if (normalized.includes("rate limit")) {
    return "Has hecho demasiados intentos. Espera un poco y vuelve a probar.";
  }

  if (normalized.includes("unauthorized")) {
    return "Debes iniciar sesión para enviar invitaciones.";
  }

  return message || "No se pudo enviar la invitación.";
}

export default function InviteSharedAgendaForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage("Escribe el email del compañero que quieres invitar.");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/compartir/invitaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitee_email: trimmedEmail,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo enviar la invitación.");
      }

      setSuccessMessage(`Invitación enviada a ${trimmedEmail}.`);
      setEmail("");

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo enviar la invitación.";
      setErrorMessage(getFriendlyErrorMessage(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Invitar a un compañero
        </h2>

        <p className="text-sm leading-6 text-slate-600">
          Escribe el email con el que entra en AutonomoAgenda.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="invite-shared-email"
          className="block text-sm font-medium text-slate-700"
        >
          Email del compañero
        </label>

        <input
          id="invite-shared-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@correo.com"
          disabled={submitting}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Cuando la acepte, ambos veréis la agenda del otro en solo lectura.
      </p>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs leading-5 text-slate-500">
          {isRefreshing ? (
            <span className="font-medium text-sky-700">
              Actualizando la pantalla...
            </span>
          ) : (
            <span>La pantalla se actualiza sola cuando haya cambios.</span>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || isRefreshing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Enviando..." : "Enviar invitación"}
        </button>
      </div>
    </form>
  );
}
