import Link from "next/link";
import { supabase } from "@/lib/supabase";
import QuickAddJobForm from "@/components/QuickAddJobForm";
import JobActions from "@/components/JobActions";
import EditJobButton from "@/components/EditJobButton";
import AgendaFilters from "@/components/AgendaFilters";

export const dynamic = "force-dynamic";

type Trabajo = {
  id: number;
  client_name: string;
  phone: string | null;
  address: string | null;
  work_date: string;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
  status: string;
};

type DayItem = {
  date: string;
  label: string;
};

type TimeGap = {
  start: string;
  end: string;
  minutes: number;
};

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    day?: string;
  }>;
};

const DAYS_TO_SHOW = 7;
const MADRID_LOCALE = "es-ES";
const MADRID_TIME_ZONE = "Europe/Madrid";
const WORK_DAY_START = "08:00";
const WORK_DAY_END = "20:00";
const MIN_GAP_MINUTES = 30;

function toDateValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateValueToUtcDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function addDaysToDateValue(dateValue: string, days: number) {
  const date = dateValueToUtcDate(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateValue(date);
}

function getMadridNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? "0"
  );
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0"
  );

  return {
    dateValue: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

function formatDateLabel(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);

  const label = date.toLocaleDateString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function getAgendaStartDateInMadrid() {
  const { dateValue, hour, minute } = getMadridNowParts();
  const currentMinutes = hour * 60 + minute;
  const workEndMinutes = timeToMinutes(WORK_DAY_END);

  if (currentMinutes >= workEndMinutes) {
    return addDaysToDateValue(dateValue, 1);
  }

  return dateValue;
}

function buildNextDays(total: number, startDate: string) {
  const days: DayItem[] = [];

  for (let i = 0; i < total; i += 1) {
    const currentDateValue = addDaysToDateValue(startDate, i);

    days.push({
      date: currentDateValue,
      label: formatDateLabel(currentDateValue),
    });
  }

  return days;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function addMinutes(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + Number(minutes || 0));
}

function formatJobDurationLabel(minutes: number) {
  if (minutes < 90) {
    return `${minutes} min`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} h`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return `${hours} h ${rest} min`;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStatusClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "cancelado") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "facturado") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "archivado") {
    return "border-slate-300 bg-slate-200 text-slate-700";
  }

  if (normalized === "pendiente") {
    return "border-red-600 bg-red-600 text-white shadow-sm";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") return "Comprometido";
  if (normalized === "hecho") return "Hecho";
  if (normalized === "terminado") return "Terminado";
  if (normalized === "cancelado") return "Cancelado";
  if (normalized === "facturado") return "Facturado";
  if (normalized === "archivado") return "Archivado";

  return status;
}

function getMainTimeClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") {
    return "text-[2.1rem] font-black tracking-tight text-red-700 sm:text-[2.45rem]";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "text-[2.1rem] font-black tracking-tight text-emerald-700 sm:text-[2.45rem]";
  }

  if (normalized === "facturado") {
    return "text-[2.1rem] font-black tracking-tight text-sky-700 sm:text-[2.45rem]";
  }

  if (normalized === "archivado") {
    return "text-[2.1rem] font-black tracking-tight text-slate-600 sm:text-[2.45rem]";
  }

  return "text-[2.1rem] font-black tracking-tight text-slate-800 sm:text-[2.45rem]";
}

function getDurationClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") {
    return "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-lg font-bold text-red-700";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-lg font-bold text-emerald-700";
  }

  if (normalized === "facturado") {
    return "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-lg font-bold text-sky-700";
  }

  if (normalized === "archivado") {
    return "inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-lg font-bold text-slate-700";
  }

  return "inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-lg font-bold text-slate-700";
}

function isBlockingStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pendiente" ||
    normalized === "hecho" ||
    normalized === "facturado"
  );
}

function buildGaps(trabajos: Trabajo[]) {
  const dayStart = timeToMinutes(WORK_DAY_START);
  const dayEnd = timeToMinutes(WORK_DAY_END);

  const blockingTrabajos = trabajos
    .filter((trabajo) => isBlockingStatus(trabajo.status))
    .map((trabajo) => {
      const start = timeToMinutes(trabajo.start_time);
      const end = start + Number(trabajo.duration_minutes || 0);

      return {
        start,
        end,
      };
    })
    .sort((a, b) => a.start - b.start);

  if (blockingTrabajos.length === 0) {
    return [
      {
        start: WORK_DAY_START,
        end: WORK_DAY_END,
        minutes: dayEnd - dayStart,
      },
    ] satisfies TimeGap[];
  }

  const gaps: TimeGap[] = [];
  let cursor = dayStart;

  for (const trabajo of blockingTrabajos) {
    const boundedStart = Math.max(dayStart, trabajo.start);
    const boundedEnd = Math.min(dayEnd, trabajo.end);

    if (boundedStart > cursor) {
      const diff = boundedStart - cursor;

      if (diff >= MIN_GAP_MINUTES) {
        gaps.push({
          start: minutesToTime(cursor),
          end: minutesToTime(boundedStart),
          minutes: diff,
        });
      }
    }

    cursor = Math.max(cursor, boundedEnd);
  }

  if (dayEnd > cursor) {
    const diff = dayEnd - cursor;

    if (diff >= MIN_GAP_MINUTES) {
      gaps.push({
        start: minutesToTime(cursor),
        end: minutesToTime(dayEnd),
        minutes: diff,
      });
    }
  }

  return gaps;
}

function formatGapLabel(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} h`;
  }

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours} h ${rest} min`;
  }

  return `${minutes} min`;
}

function matchesQuery(trabajo: Trabajo, query: string) {
  if (!query) return true;

  const haystack = normalizeText(
    [
      trabajo.client_name,
      trabajo.phone,
      trabajo.address,
      trabajo.notes,
      trabajo.work_date,
      trabajo.start_time,
      getStatusLabel(trabajo.status),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return haystack.includes(normalizeText(query));
}

function matchesStatus(trabajo: Trabajo, status: string) {
  if (!status) return true;
  return trabajo.status.trim().toLowerCase() === status.trim().toLowerCase();
}

function matchesDay(trabajo: Trabajo, day: string) {
  if (!day) return true;
  return trabajo.work_date === day;
}

function renderSummaryCard({
  title,
  value,
  subtitle,
  valueClasses,
  cardClasses,
}: {
  title: string;
  value: number;
  subtitle: string;
  valueClasses: string;
  cardClasses: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${cardClasses}`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className={`mt-2 text-4xl font-black leading-none ${valueClasses}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

function renderTrabajoCard(trabajo: Trabajo) {
  const normalizedStatus = trabajo.status.trim().toLowerCase();
  const canEdit = normalizedStatus !== "archivado";
  const showArchivedDate = normalizedStatus === "archivado";

  return (
    <article
      key={trabajo.id}
      className="rounded-3xl border border-slate-200 bg-white px-4 py-1.5 shadow-sm sm:px-4 sm:py-1.5"
    >
      <div className="grid gap-1.5">
        <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {trabajo.client_name}
            </p>

            {showArchivedDate ? (
              <p className="mt-0.5 text-sm font-medium text-slate-500 sm:text-base">
                Fecha del trabajo: {formatDateLabel(trabajo.work_date)}
              </p>
            ) : null}

            <div className="mt-0.5 flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
              <p className={getMainTimeClasses(trabajo.status)}>
                {formatTime(trabajo.start_time)} -{" "}
                {addMinutes(trabajo.start_time, trabajo.duration_minutes)}
              </p>

              <span className={getDurationClasses(trabajo.status)}>
                {formatJobDurationLabel(trabajo.duration_minutes)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 lg:pl-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold sm:text-sm ${getStatusClasses(
                trabajo.status
              )}`}
            >
              {getStatusLabel(trabajo.status)}
            </span>

            {canEdit ? (
              <EditJobButton
                jobId={trabajo.id}
                clientName={trabajo.client_name}
                phone={trabajo.phone}
                address={trabajo.address}
                workDate={trabajo.work_date}
                startTime={trabajo.start_time}
                durationMinutes={trabajo.duration_minutes}
                notes={trabajo.notes}
              />
            ) : null}

            <JobActions
              jobId={trabajo.id}
              clientName={trabajo.client_name}
              status={trabajo.status}
            />
          </div>
        </div>

        <div className="grid gap-1.5 lg:grid-cols-[1.7fr_1fr]">
          <div className="grid gap-1.5 sm:grid-cols-3">
            {trabajo.phone ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Teléfono
                </p>
                <p className="mt-0.5 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
                  {trabajo.phone}
                </p>
              </div>
            ) : null}

            {trabajo.address ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Dirección
                </p>
                <p className="mt-0.5 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
                  {trabajo.address}
                </p>
              </div>
            ) : null}

            {trabajo.notes ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Nota
                </p>
                <p className="mt-0.5 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
                  {trabajo.notes}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-1.5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Resumen rápido
            </p>

            <div className="mt-1 grid grid-cols-3 gap-1.5">
              <div className="rounded-2xl bg-white px-2.5 py-1">
                <p className="text-[0.8rem] font-semibold uppercase tracking-wide text-slate-500">
                  Inicio
                </p>
                <p className="mt-0.5 text-[1.7rem] font-black leading-none text-slate-900 sm:text-[2rem]">
                  {formatTime(trabajo.start_time)}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-2.5 py-1">
                <p className="text-[0.8rem] font-semibold uppercase tracking-wide text-slate-500">
                  Fin
                </p>
                <p className="mt-0.5 text-[1.7rem] font-black leading-none text-slate-900 sm:text-[2rem]">
                  {addMinutes(trabajo.start_time, trabajo.duration_minutes)}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-2.5 py-1">
                <p className="text-[0.8rem] font-semibold uppercase tracking-wide text-slate-500">
                  Tiempo
                </p>
                <p className="mt-0.5 text-[1.7rem] font-black leading-none text-slate-900 sm:text-[2rem]">
                  {formatJobDurationLabel(trabajo.duration_minutes)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = (resolvedSearchParams.q ?? "").trim();
  const status = (resolvedSearchParams.status ?? "").trim().toLowerCase();
  const day = (resolvedSearchParams.day ?? "").trim();
  const hasActiveFilters = Boolean(query || status || day);

  const todayInMadrid = getMadridNowParts().dateValue;
  const agendaStartDateInMadrid = getAgendaStartDateInMadrid();
  const days = buildNextDays(DAYS_TO_SHOW, agendaStartDateInMadrid);

  const { data, error } = await supabase
    .from("trabajos")
    .select("*")
    .order("work_date", { ascending: true })
    .order("start_time", { ascending: true });

  const trabajos = ((data as Trabajo[]) ?? []).filter(Boolean);

  const filteredTrabajos = trabajos.filter((trabajo) => {
    return (
      matchesQuery(trabajo, query) &&
      matchesStatus(trabajo, status) &&
      matchesDay(trabajo, day)
    );
  });

  const activeTrabajos = filteredTrabajos.filter(
    (trabajo) => trabajo.status.trim().toLowerCase() !== "archivado"
  );
  const archivedTrabajos = filteredTrabajos.filter(
    (trabajo) => trabajo.status.trim().toLowerCase() === "archivado"
  );

  const summaryDate = day || agendaStartDateInMadrid;
  const summaryDateLabel = day
    ? formatDateLabel(day)
    : agendaStartDateInMadrid === todayInMadrid
    ? "Hoy"
    : formatDateLabel(agendaStartDateInMadrid);

  const committedCount = filteredTrabajos.filter(
    (trabajo) =>
      trabajo.work_date === summaryDate &&
      trabajo.status.trim().toLowerCase() === "pendiente"
  ).length;

  const doneCount = filteredTrabajos.filter(
    (trabajo) =>
      trabajo.work_date === summaryDate &&
      trabajo.status.trim().toLowerCase() === "hecho"
  ).length;

  const invoicedCount = filteredTrabajos.filter(
    (trabajo) => trabajo.status.trim().toLowerCase() === "facturado"
  ).length;

  const archivedCount = archivedTrabajos.length;

  const daysWithData = days
    .map((dayItem) => {
      const items = activeTrabajos.filter(
        (trabajo) => trabajo.work_date === dayItem.date
      );
      const blockingItems = items.filter((trabajo) =>
        isBlockingStatus(trabajo.status)
      );
      const gaps = buildGaps(items);

      return {
        ...dayItem,
        items,
        blockingItems,
        gaps,
      };
    })
    .filter((dayItem) => {
      if (!hasActiveFilters) return true;
      return dayItem.items.length > 0;
    });

  const hasAnyVisibleWork =
    activeTrabajos.length > 0 || archivedTrabajos.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            HuecoPro
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            La forma rápida de encajar trabajos
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
            Consulta de un vistazo los próximos días y revisa qué huecos libres
            te quedan para encajar trabajos.
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Jornada provisional calculada de {WORK_DAY_START} a {WORK_DAY_END}.
          </p>
        </div>

        <div className="mt-6">
          <QuickAddJobForm />
        </div>

        <div className="mt-6">
          <AgendaFilters
            initialQuery={query}
            initialStatus={status}
            initialDay={day}
            availableDays={days}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {renderSummaryCard({
            title: `${summaryDateLabel} · Comprometidos`,
            value: committedCount,
            subtitle: "Trabajos ya encajados en agenda.",
            valueClasses: "text-red-700",
            cardClasses: "border-red-200 bg-white",
          })}

          {renderSummaryCard({
            title: `${summaryDateLabel} · Hechos`,
            value: doneCount,
            subtitle: "Trabajos realizados pendientes de cerrar.",
            valueClasses: "text-emerald-700",
            cardClasses: "border-emerald-200 bg-white",
          })}

          {renderSummaryCard({
            title: "Facturados",
            value: invoicedCount,
            subtitle: "Pendientes de archivar.",
            valueClasses: "text-sky-700",
            cardClasses: "border-sky-200 bg-white",
          })}

          {renderSummaryCard({
            title: "Archivados",
            value: archivedCount,
            subtitle: "Guardados fuera de producción.",
            valueClasses: "text-slate-700",
            cardClasses: "border-slate-300 bg-white",
          })}
        </div>

        <div className="mt-6">
          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-base text-red-700 shadow-sm">
              Error al cargar trabajos: {error.message}
            </div>
          ) : !hasAnyVisibleWork ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600 shadow-sm">
              No hay trabajos que coincidan con los filtros actuales.
            </div>
          ) : (
            <>
              <div className="grid gap-5">
                {daysWithData.map((dayItem) => (
                  <section
                    key={dayItem.date}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                          {dayItem.label}
                        </h2>
                        <p className="mt-2 text-base text-slate-500 sm:text-lg">
                          {hasActiveFilters
                            ? `${dayItem.items.length} resultado${
                                dayItem.items.length === 1 ? "" : "s"
                              } en este día`
                            : dayItem.blockingItems.length === 0
                            ? "Sin trabajos ocupando agenda"
                            : `${dayItem.blockingItems.length} trabajo${
                                dayItem.blockingItems.length === 1 ? "" : "s"
                              } en agenda`}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-4 py-2 text-base font-bold sm:text-lg ${
                          hasActiveFilters
                            ? "bg-slate-100 text-slate-700"
                            : dayItem.gaps.length > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {hasActiveFilters
                          ? `${dayItem.items.length} resultado${
                              dayItem.items.length === 1 ? "" : "s"
                            }`
                          : dayItem.gaps.length > 0
                          ? "Con huecos"
                          : "Completo"}
                      </span>
                    </div>

                    {!hasActiveFilters ? (
                      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-base font-bold text-slate-800 sm:text-lg">
                            Huecos libres
                          </p>

                          <p className="text-sm text-slate-500">
                            Toca un hueco para preparar el formulario
                          </p>
                        </div>

                        {dayItem.gaps.length === 0 ? (
                          <p className="mt-3 text-lg font-bold text-red-700 sm:text-xl">
                            No quedan huecos de al menos {MIN_GAP_MINUTES} minutos.
                          </p>
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-3">
                            {dayItem.gaps.map((gap) => (
                              <Link
                                key={`${dayItem.date}-${gap.start}-${gap.end}`}
                                href={`/?date=${dayItem.date}&time=${gap.start}#quick-add-job-form`}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-xl font-extrabold leading-none text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 sm:text-2xl"
                              >
                                {gap.start} - {gap.end} ·{" "}
                                {formatGapLabel(gap.minutes)}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {dayItem.items.length === 0 ? (
                      !hasActiveFilters ? (
                        <div className="mt-5 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 px-5 py-4 text-base font-semibold text-emerald-700 sm:text-lg">
                          No tienes nada apuntado este día.
                        </div>
                      ) : null
                    ) : (
                      <div className="mt-5 grid gap-3">
                        {dayItem.items.map((trabajo) =>
                          renderTrabajoCard(trabajo)
                        )}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      Trabajos archivados
                    </h2>
                    <p className="mt-2 text-base text-slate-500 sm:text-lg">
                      Aquí quedan guardados hasta que el autónomo decida
                      eliminarlos definitivamente.
                    </p>
                  </div>

                  <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-base font-bold text-slate-700 sm:text-lg">
                    {archivedTrabajos.length} archivado
                    {archivedTrabajos.length === 1 ? "" : "s"}
                  </span>
                </div>

                {archivedTrabajos.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600 sm:text-lg">
                    No hay trabajos archivados.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {archivedTrabajos.map((trabajo) =>
                      renderTrabajoCard(trabajo)
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}