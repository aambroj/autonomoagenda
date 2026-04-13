"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type EditSharedLinkOption = {
  id: string;
  label: string;
  placeholder?: string;
};

type EditSharedLinkAliasFormProps = {
  links: EditSharedLinkOption[];
  initialSelectedLinkId?: string;
};

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized")) {
    return "Debes iniciar sesión para cambiar el nombre de una conexión.";
  }

  if (normalized.includes("not found")) {
    return "No se ha encontrado la conexión que quieres actualizar.";
  }

  if (normalized.includes("alias")) {
    return "Revisa el nombre que quieres guardar e inténtalo de nuevo.";
  }

  return message || "No se pudo guardar el nombre de la conexión.";
}

export default function EditSharedLinkAliasForm({
  links,
  initialSelectedLinkId,
}: EditSharedLinkAliasFormProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [selectedLinkId, setSelectedLinkId] = useState<string>(
    initialSelectedLinkId && links.some((link) => link.id === initialSelectedLinkId)
      ? initialSelectedLinkId
      : links[0]?.id ?? ""
  );
  const [aliasValue, setAliasValue] = useState("");
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
    setAliasValue("");
    setErrorMessage("");
    setSuccessMessage("");
  }, [selectedLinkId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLinkId) {
      setErrorMessage("Selecciona primero una conexión.");
      setSuccessMessage("");
      return;
    }

    const trimmedAlias = aliasValue.trim();

    if (!trimmedAlias) {
      setErrorMessage("Escribe el nombre o alias que quieres guardar.");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/compartir/invitaciones/${selectedLinkId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update_alias",
            alias: trimmedAlias,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean; saved_alias?: string | null }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo guardar el alias.");
      }

      setSuccessMessage("Nombre guardado correctamente.");
      setAliasValue("");

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el alias.";
      setErrorMessage(getFriendlyErrorMessage(message));
    } finally {
      setSubmitting(false);
    }
  }

  if (!links.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm leading-6 text-slate-600">
          Cuando tengas una conexión activa, podrás ponerle aquí un nombre más
          claro para reconocerla mejor.
        </p>
      </div>
    );
  }

  return (
    <form
      id="edit-shared-link-alias-form"
      onSubmit={handleSubmit}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        hasFocusedLink
          ? "border-sky-300 ring-2 ring-sky-100"
          : "border-slate-200"
      }`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Cambiar nombre de una conexión
          </h3>

          {hasFocusedLink ? (
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              Conexión en foco
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-slate-600">
          Pon un nombre corto para reconocer mejor la agenda del otro
          profesional.
        </p>
      </div>

      {selectedLink ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 ${
            hasFocusedLink
              ? "border border-sky-200 bg-sky-50"
              : "border border-slate-200 bg-slate-50"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              hasFocusedLink ? "text-sky-700" : "text-slate-500"
            }`}
          >
            {hasFocusedLink ? "Conexión enfocada" : "Conexión seleccionada"}
          </p>
          <p className="mt-1 break-words text-base font-semibold text-slate-900">
            {selectedLink.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Vas a guardar un nombre visible solo para ti, para reconocer mejor
            esta agenda compartida.
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <label
          htmlFor="edit-shared-link"
          className="block text-sm font-medium text-slate-700"
        >
          Conexión
        </label>

        <select
          id="edit-shared-link"
          value={selectedLinkId}
          onChange={(event) => setSelectedLinkId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={submitting || isRefreshing}
        >
          <option value="">Selecciona una conexión</option>
          {links.map((link) => (
            <option key={link.id} value={link.id}>
              {link.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="shared-link-alias"
            className="block text-sm font-medium text-slate-700"
          >
            Nombre o alias
          </label>

          <span className="text-xs text-slate-500">{aliasValue.length}/80</span>
        </div>

        <input
          id="shared-link-alias"
          type="text"
          value={aliasValue}
          onChange={(event) => setAliasValue(event.target.value)}
          placeholder={selectedLink?.placeholder ?? "Ejemplo: Juan electricista"}
          maxLength={80}
          disabled={submitting || isRefreshing}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />

        <p className="text-xs leading-5 text-slate-500">
          Este nombre te servirá para identificar mejor esa agenda compartida en
          la lista y en el selector de agendas.
        </p>
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
          disabled={submitting || isRefreshing || !selectedLinkId}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Guardando..." : isRefreshing ? "Actualizando..." : "Guardar nombre"}
        </button>
      </div>
    </form>
  );
}
