type AgendaFiltersProps = {
  initialQuery: string;
  initialStatus: string;
  initialDay: string;
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

export default function AgendaFilters({
  initialQuery,
  initialStatus,
  initialDay,
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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Buscar y filtrar
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Localiza trabajos rápidamente por cliente, estado o día.
          </p>
        </div>
      </div>

      <form method="GET" className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Buscar texto
            </span>
            <input
              type="text"
              name="q"
              defaultValue={initialQuery}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              placeholder="Cliente, teléfono, dirección o nota"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Estado</span>
            <select
              name="status"
              defaultValue={initialStatus}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              {STATUS_OPTIONS.map((option, index) => (
                <option
                  key={`status-${option.value || `all-${index}`}`}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Día</span>
            <select
              name="day"
              defaultValue={initialDay}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Todos los días</option>

              {safeAvailableDays.map((day, index) => (
                <option
                  key={`day-${day.value}-${index}`}
                  value={day.value}
                >
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Filtrar
            </button>

            <a
              href="/"
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </a>
          </div>
        </div>
      </form>
    </section>
  );
}