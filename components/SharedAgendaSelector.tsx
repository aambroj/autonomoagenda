"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SharedAgendaOption = {
  userId: string;
  label: string;
};

type SharedAgendaSelectorProps = {
  options: SharedAgendaOption[];
  selectedUserId: string;
};

function buildNextUrl(params: URLSearchParams, pathname: string) {
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export default function SharedAgendaSelector({
  options,
  selectedUserId,
}: SharedAgendaSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasOptions = options.length > 0;

  const selectedOption = useMemo(() => {
    return options.find((option) => option.userId === selectedUserId) ?? null;
  }, [options, selectedUserId]);

  const currentLabel = selectedOption?.label ?? "Agenda compartida";

  function handleChange(nextUserId: string) {
    if (nextUserId === selectedUserId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (!nextUserId) {
      params.delete("shared");
    } else {
      params.set("shared", nextUserId);
    }

    params.delete("edit");
    params.delete("quick");
    params.delete("time");
    params.delete("duration");

    const nextUrl = buildNextUrl(params, pathname);

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  if (!hasOptions) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Agenda compartida
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Todavía no tienes ninguna agenda conectada
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Sin conexiones activas
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Agenda compartida
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Cambiar agenda compartida
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Puedes elegir qué agenda compartida quieres ver. La agenda ajena es
            solo lectura y se mantiene la semana y los filtros que ya tengas
            aplicados.
          </p>
        </div>

        <div className="w-full sm:max-w-sm">
          <label
            htmlFor="shared-agenda-selector"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Agenda visible
          </label>

          <select
            id="shared-agenda-selector"
            value={selectedUserId}
            onChange={(event) => handleChange(event.target.value)}
            disabled={isPending}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {options.map((option) => (
              <option key={option.userId} value={option.userId}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-500">
              Mostrando:{" "}
              <span className="font-semibold text-slate-700">
                {currentLabel}
              </span>
            </p>

            {isPending ? (
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                Cambiando...
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}