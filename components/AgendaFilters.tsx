import Link from "next/link";

type AgendaFiltersProps = {
  initialQuery: string;
  initialStatus: string;
  initialDay: string;
  initialWeek?: string;
  initialShared?: string;
  availableDays: Array<{
    value: string;
    label: string;
  }>;
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Comprometido" },
  { value: "hecho", label: "Hecho" },
  { value: "facturado", label: "Facturado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "archivado", label: "Archivado" },
];

function buildClearHref(params: {
  initialWeek?: string;
  initialShared?: string;
}) {
  const search = new URLSearchParams();

  if (params.initialWeek?.trim()) {
    search.set("week", params.initialWeek.trim());
    search.set("date", params.initialWeek.trim());
  }

  if (params.initialShared?.trim()) {
    search.set("shared", params.initialShared.trim());
  }

  const queryString = search.toString();
  return queryString ? `/agenda?${queryString}` : "/agenda";
}

export default function AgendaFilters({
  initialQuery,
  initialStatus,
  initialDay,
  initialWeek = "",
  initialShared = "",
  availableDays,
}: AgendaFiltersProps) {
  const safeAvailableDays = availableDays
    .filter((day): day is { value: string; label: string } => {
      return Boolean(day && typeof day.value === "string" && day.value.trim());
    })
    .filter(
      (day, index, array) =>
        array.findIndex((item) => item.value === day.value) === index
    );

  const selectedDayExists = safeAvailableDays.some(
    (day) => day.value === initialDay
  );

  const safeDayOptions =
    initialDay && !selectedDayExists
      ? [
          {
            value: initialDay,
            label: initialDay,
          },
          ...safeAvailableDays,
        ]
      : safeAvailableDays;

  const hasActiveFilters = Boolean(
    initialQuery.trim() || initialStatus.trim() || initialDay.trim()
  );

  const clearHref = buildClearHref({
    initialWeek,
    initialShared,
  });

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
            Filtros
          </h2>

          <p className="mt-1.5 text-sm leading-6 text-slate-600 sm:text-base">
            Busca por texto, estado o día.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {initialShared ? (
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
              Agenda compartida
            </span>
          ) : null}

          {hasActiveFilters ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Filtros activos
            </span>
          ) : null}
        </div>
      </div>

      <form method="GET" action="/agenda" className="mt-5 grid gap-4">
        {initialWeek ? (
          <>
            <input type="hidden" name="week" value={initialWeek} />
            <input type="hidden" name="date" value={initialWeek} />
          </>
        ) : null}

        {initialShared ? (
          <input type="hidden" name="shared" value={initialShared} />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr_1fr_auto] xl:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Buscar
            </span>
            <input
              type="text"
              name="q"
              defaultValue={initialQuery}
              className="min-h-[52px] rounded-2xl border border-slate-300/90 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:text-base"
              placeholder="Cliente, teléfono, dirección o nota"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Estado</span>
            <select
              name="status"
              defaultValue={initialStatus}
              className="min-h-[52px] rounded-2xl border border-slate-300/90 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:text-base"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={`status-${option.value || "all"}`}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Día</span>
            <select
              name="day"
              defaultValue={initialDay}
              className="min-h-[52px] rounded-2xl border border-slate-300/90 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:text-base"
            >
              <option value="">Todos los días</option>

              {safeDayOptions.map((day) => (
                <option key={`day-${day.value}`} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[220px] xl:grid-cols-1">
            <button
              type="submit"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Aplicar
            </button>

            {hasActiveFilters ? (
              <Link
                href={clearHref}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-slate-300/90 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}
