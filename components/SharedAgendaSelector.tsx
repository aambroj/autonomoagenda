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

  const isViewingOwnAgenda = !selectedUserId;
  const currentLabel = selectedOption?.label ?? "Mi agenda";

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
      <section className="rounded-[1.75rem] border border-white/70 bg-white/82 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-sm">
            Agenda compartida
          </p>
          <p className="mt-1.5 text-base font-semibold text-slate-900 sm:text-lg">
            Todavía no tienes ninguna agenda conectada
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
            Cuando conectes otra cuenta, podrás cambiarla desde aquí.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/82 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700 shadow-sm">
              Cambiar vista
            </span>

            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${
                isViewingOwnAgenda
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {isViewingOwnAgenda ? "Mi agenda" : "Solo lectura"}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Agenda visible
          </h3>

          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            Cambia entre tu agenda y las compartidas sin perder la semana ni los filtros.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <label
              htmlFor="shared-agenda-selector"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Selecciona agenda
            </label>

            <select
              id="shared-agenda-selector"
              value={selectedUserId}
              onChange={(event) => handleChange(event.target.value)}
              disabled={isPending}
              className="min-h-[52px] w-full rounded-2xl border border-slate-300/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
            >
              <option value="">Mi agenda · salir de vista compartida</option>
              {options.map((option) => (
                <option key={option.userId} value={option.userId}>
                  Agenda compartida · {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-[220px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Mostrando ahora
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base">
              {currentLabel}
            </p>
            <div className="mt-2">
              {isPending ? (
                <span className="inline-flex w-fit items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 shadow-sm">
                  Cambiando...
                </span>
              ) : (
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
                    selectedOption
                      ? "border border-sky-200 bg-sky-50 text-sky-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {selectedOption ? "Solo lectura" : "Editable"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
