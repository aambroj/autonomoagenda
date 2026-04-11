"use client";

import { useEffect, useMemo, useState } from "react";

export type ActiveLinkOption = {
  id: string;
  label: string;
  aliasPlaceholder?: string;
};

type DeactivateSharedLinkFormProps = {
  links: ActiveLinkOption[];
  initialSelectedLinkId?: string;
};

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized")) {
    return "Debes iniciar sesión para cambiar una conexión.";
  }

  if (normalized.includes("no active shared link found")) {
    return "No se ha encontrado una conexión activa para desactivar.";
  }

  return message || "No se pudo desactivar la conexión.";
}

export default function DeactivateSharedLinkForm({
  links,
  initialSelectedLinkId,
}: DeactivateSharedLinkFormProps) {
  const [selectedLinkId, setSelectedLinkId] = useState<string>(
    initialSelectedLinkId && links.some((link) => link.id === initialSelectedLinkId)
      ? initialSelectedLinkId
      : links[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedLink = useMemo(() => {
    return links.find((link) => link.id === selectedLinkId) ?? null;
  }, [links, selectedLinkId]);

  const hasFocusedLink = Boolean(
    initialSelectedLinkId &&
      links.some((link) => link.id === initialSelectedLinkId)
  );

  useEffect(() => {
    if (!links.length) {
      setSelectedLinkId("");
      return;
    }

    if (
      initialSelectedLinkId &&
      links.some((link) => link.id === initialSelectedLinkId)
    ) {
      setSelectedLinkId(initialSelectedLinkId);
      return;
    }

    setSelectedLinkId((current) => {
      if (current && links.some((link) => link.id === current)) {
        return current;
      }

      return links[0]?.id ?? "";
    });
  }, [initialSelectedLinkId, links]);

  useEffect(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, [selectedLinkId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLinkId) {
      setErrorMessage("Selecciona una conexión activa.");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/compartir/conexiones/desactivar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link_id: selectedLinkId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo desactivar la conexión.");
      }

      setSuccessMessage("Conexión desactivada correctamente.");
      setSelectedLinkId("");
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo desactivar la conexión.";

      setErrorMessage(getFriendlyErrorMessage(message));
    } finally {
      setSubmitting(false);
    }
  }

  if (!links.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm leading-6 text-slate-600">
          Ahora mismo no tienes conexiones activas para desactivar.
        </p>
      </div>
    );
  }

  return (
    <form
      id="deactivate-shared-link-form"
      onSubmit={handleSubmit}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        hasFocusedLink
          ? "border-amber-300 ring-2 ring-amber-100"
          : "border-slate-200"
      }`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Desactivar conexión
          </h3>

          {hasFocusedLink ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              Conexión en foco
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-slate-600">
          Puedes dejar de compartir en cualquier momento. Más adelante podrás
          volver a conectar si lo necesitas.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Aviso
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Al desactivar la conexión, dejaréis de ver la agenda del otro hasta
          que volváis a conectar.
        </p>
      </div>

      {selectedLink ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 ${
            hasFocusedLink
              ? "border border-amber-200 bg-amber-50"
              : "border border-slate-200 bg-slate-50"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              hasFocusedLink ? "text-amber-800" : "text-slate-500"
            }`}
          >
            {hasFocusedLink ? "Conexión enfocada" : "Conexión seleccionada"}
          </p>
          <p className="mt-1 break-words text-base font-semibold text-slate-900">
            {selectedLink.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {selectedLink.aliasPlaceholder ??
              "Esta conexión dejará de estar compartida."}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <label
          htmlFor="deactivate-link"
          className="block text-sm font-medium text-slate-700"
        >
          Conexión activa
        </label>

        <select
          id="deactivate-link"
          value={selectedLinkId}
          onChange={(event) => setSelectedLinkId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={submitting}
        >
          <option value="">Selecciona una conexión</option>
          {links.map((link) => (
            <option key={link.id} value={link.id}>
              {link.label}
            </option>
          ))}
        </select>
      </div>

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

      <div className="mt-4">
        <button
          type="submit"
          disabled={submitting || !selectedLinkId}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Desactivando..." : "Desactivar conexión"}
        </button>
      </div>
    </form>
  );
}
