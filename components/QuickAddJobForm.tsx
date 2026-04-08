"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AvailabilityResponse = {
  date: string;
  duration_minutes: number;
  slots: string[];
  error?: string;
  is_non_working_day?: boolean;
};

const MADRID_TIME_ZONE = "Europe/Madrid";
const WORK_DAY_END = "20:00";
const AGENDA_PATH = "/agenda";
const MAX_FUTURE_DAYS = 30;
const DURATION_OPTIONS = [
  30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480, 540, 600,
];

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

function formatShortDate(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);

  return date.toLocaleDateString("es-ES", {
    timeZone: MADRID_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatLongDate(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);

  const label = date.toLocaleDateString("es-ES", {
    timeZone: MADRID_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isSundayDate(dateValue: string) {
  if (!dateValue) return false;
  return dateValueToUtcDate(dateValue).getUTCDay() === 0;
}

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  return Number(hourText) * 60 + Number(minuteText);
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

function getAgendaMinDateInMadrid() {
  const { dateValue, hour, minute } = getMadridNowParts();
  const currentMinutes = hour * 60 + minute;
  const workEndMinutes = timeToMinutes(WORK_DAY_END);

  if (currentMinutes >= workEndMinutes) {
    return addDaysToDateValue(dateValue, 1);
  }

  return dateValue;
}

function getAgendaMaxDateInMadrid() {
  const { dateValue } = getMadridNowParts();
  return addDaysToDateValue(dateValue, MAX_FUTURE_DAYS);
}

function formatDurationLabel(minutes: number) {
  if (minutes % 60 === 0) {
    return `${minutes / 60} h`;
  }

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours} h ${rest} min`;
  }

  return `${minutes} min`;
}

function isValidDuration(value: string | null) {
  if (!value) return false;
  const parsed = Number(value);
  return DURATION_OPTIONS.includes(parsed);
}

export default function QuickAddJobForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const agendaMinDate = useMemo(() => getAgendaMinDateInMadrid(), []);
  const agendaMaxDate = useMemo(() => getAgendaMaxDateInMadrid(), []);
  const madridNow = useMemo(() => getMadridNowParts(), []);
  const currentMinutesInMadrid = madridNow.hour * 60 + madridNow.minute;

  const queryDate = searchParams.get("date") || "";
  const queryWeek = searchParams.get("week") || "";
  const queryTime = searchParams.get("time") || "";
  const queryDuration = searchParams.get("duration") || "";
  const queryQuick = searchParams.get("quick") || "";
  const queryShared = searchParams.get("shared") || "";

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workDate, setWorkDate] = useState(agendaMinDate);
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSundaySelected = isSundayDate(workDate);
  const isTodaySelected = workDate === madridNow.dateValue;

  const isQuickModalOpen =
    queryQuick === "1" && Boolean(queryDate || queryTime || queryDuration);

  const isPrefilledTimeActive = Boolean(
    queryQuick === "1" &&
      queryDate &&
      queryTime &&
      queryDuration &&
      workDate === queryDate &&
      durationMinutes === queryDuration &&
      !isSundaySelected
  );

  const trimmedClientName = clientName.trim();
  const selectedDurationMinutes = Number(durationMinutes);
  const selectedDateLabel = workDate ? formatLongDate(workDate) : "";
  const cameFromGapSuggestion = Boolean(
    queryQuick === "1" && queryDate && queryTime && queryDuration
  );

  const selectableTimes = useMemo(() => {
    const merged = [...availableTimes];

    if (isPrefilledTimeActive && queryTime && !merged.includes(queryTime)) {
      merged.push(queryTime);
    }

    return merged
      .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
      .filter((slot) => {
        if (!isTodaySelected) return true;
        if (isPrefilledTimeActive && slot === queryTime) return true;
        return timeToMinutes(slot) >= currentMinutesInMadrid;
      });
  }, [
    availableTimes,
    isPrefilledTimeActive,
    queryTime,
    isTodaySelected,
    currentMinutesInMadrid,
  ]);

  function buildAgendaUrl(params: URLSearchParams, hash?: string) {
    const query = params.toString();
    return `${AGENDA_PATH}${query ? `?${query}` : ""}${hash ?? ""}`;
  }

  function updateWeekInUrl(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", nextDate);
    params.set("date", nextDate);

    if (!isQuickModalOpen) {
      params.delete("quick");
      params.delete("time");
      params.delete("duration");
      params.delete("edit");

      router.replace(buildAgendaUrl(params, "#quick-add-job-form"), {
        scroll: false,
      });
      return;
    }

    params.set("quick", "1");
    params.delete("time");
    params.delete("duration");
    params.delete("edit");

    router.replace(buildAgendaUrl(params), { scroll: false });
  }

  function closeQuickModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("quick");
    params.delete("time");
    params.delete("duration");
    params.delete("edit");

    router.replace(buildAgendaUrl(params, "#quick-add-job-form"), {
      scroll: false,
    });
  }

  useEffect(() => {
    const preferredDate = queryDate || queryWeek;

    if (
      preferredDate &&
      preferredDate >= agendaMinDate &&
      preferredDate <= agendaMaxDate
    ) {
      setWorkDate(preferredDate);
    }

    if (isValidDuration(queryDuration)) {
      setDurationMinutes(queryDuration);
    }

    if (queryTime) {
      setStartTime(queryTime);
    }
  }, [
    queryDate,
    queryWeek,
    queryTime,
    queryDuration,
    agendaMinDate,
    agendaMaxDate,
  ]);

  useEffect(() => {
    if (workDate < agendaMinDate) {
      setWorkDate(agendaMinDate);
      return;
    }

    if (workDate > agendaMaxDate) {
      setWorkDate(agendaMaxDate);
    }
  }, [workDate, agendaMinDate, agendaMaxDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setLoadingAvailability(true);
      setAvailabilityError(null);

      try {
        const response = await fetch(
          `/api/trabajos/disponibilidad?date=${encodeURIComponent(
            workDate
          )}&duration_minutes=${encodeURIComponent(durationMinutes)}`,
          {
            cache: "no-store",
          }
        );

        const result = (await response.json()) as AvailabilityResponse;

        if (!response.ok) {
          throw new Error(
            result?.error || "No se pudo cargar la disponibilidad."
          );
        }

        if (cancelled) return;

        const slots = result.slots ?? [];
        setAvailableTimes(slots);

        setStartTime((current) => {
          if (
            current &&
            (slots.includes(current) ||
              (isPrefilledTimeActive &&
                workDate === queryDate &&
                current === queryTime))
          ) {
            return current;
          }

          if (isPrefilledTimeActive && queryTime && workDate === queryDate) {
            return queryTime;
          }

          return slots[0] ?? "";
        });
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar la disponibilidad.";

        setAvailabilityError(message);
        setAvailableTimes([]);
        setStartTime("");
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    }

    if (!workDate || !durationMinutes) {
      setAvailableTimes([]);
      setStartTime("");
      setAvailabilityError(null);
      return;
    }

    if (isSundaySelected) {
      setAvailableTimes([]);
      setStartTime("");
      setAvailabilityError(null);
      setLoadingAvailability(false);
      return;
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [
    workDate,
    durationMinutes,
    queryTime,
    queryDate,
    isSundaySelected,
    isPrefilledTimeActive,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/trabajos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: trimmedClientName,
          phone: phone.trim(),
          address: address.trim(),
          work_date: workDate,
          start_time: startTime,
          duration_minutes: Number(durationMinutes),
          notes: notes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo guardar el trabajo.");
      }

      const savedWorkDate = workDate;

      setClientName("");
      setPhone("");
      setAddress("");
      setWorkDate(agendaMinDate);
      setStartTime("");
      setDurationMinutes("60");
      setNotes("");
      setSuccess("Trabajo guardado correctamente como Comprometido.");

      const params = new URLSearchParams(searchParams.toString());
      params.set("week", savedWorkDate);
      params.set("date", savedWorkDate);
      params.delete("quick");
      params.delete("time");
      params.delete("duration");
      params.delete("edit");

      router.replace(buildAgendaUrl(params, `#day-${savedWorkDate}`));

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ha ocurrido un error.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const noSlotsAvailable =
    !loadingAvailability &&
    !availabilityError &&
    !isSundaySelected &&
    selectableTimes.length === 0;

  const firstAvailableTime = selectableTimes[0] ?? null;

  return (
    <>
      {isQuickModalOpen ? (
        <div
          aria-hidden="true"
          onClick={closeQuickModal}
          className="fixed inset-0 z-40 bg-slate-900/50"
        />
      ) : null}

      <section
        id="quick-add-job-form"
        className={
          isQuickModalOpen
            ? "fixed inset-x-4 top-4 z-50 mx-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:top-8 sm:p-6"
            : "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Añadir trabajo a tu agenda
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Al guardar, el trabajo quedará directamente como Comprometido.
            </p>
          </div>

          {isQuickModalOpen ? (
            <button
              type="button"
              onClick={closeQuickModal}
              className="inline-flex self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar
            </button>
          ) : null}
        </div>

        {cameFromGapSuggestion ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Hueco elegido
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  {formatLongDate(queryDate)} · {queryTime} ·{" "}
                  {formatDurationLabel(Number(queryDuration))}
                </p>
              </div>

              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                Preparado desde la agenda
              </span>
            </div>
          </div>
        ) : null}

        {queryShared ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Estás viendo una agenda compartida en solo lectura, pero este
            formulario <span className="font-semibold">siempre guarda</span> el
            trabajo en <span className="font-semibold">tu propia agenda</span>.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                Cliente *
              </span>
              <input
                type="text"
                value={clientName}
                onChange={(event) => {
                  setClientName(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                placeholder="Nombre del cliente"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                Teléfono
              </span>
              <input
                type="text"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                placeholder="600123123"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Dirección
            </span>
            <input
              type="text"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              placeholder="Calle, número, localidad"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Fecha *</span>
              <input
                type="date"
                value={workDate}
                min={agendaMinDate}
                max={agendaMaxDate}
                onChange={(event) => {
                  const nextDate = event.target.value;
                  setWorkDate(nextDate);
                  setStartTime("");
                  setError(null);
                  setSuccess(null);
                  updateWeekInUrl(nextDate);
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Hora *</span>
              <select
                value={startTime}
                onChange={(event) => {
                  setStartTime(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100"
                required
                disabled={
                  isSundaySelected ||
                  loadingAvailability ||
                  !!availabilityError ||
                  selectableTimes.length === 0
                }
              >
                <option value="" disabled>
                  {loadingAvailability
                    ? "Cargando horas..."
                    : "Selecciona una hora"}
                </option>

                {!isSundaySelected &&
                  !loadingAvailability &&
                  !availabilityError &&
                  selectableTimes.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                Duración *
              </span>
              <select
                value={durationMinutes}
                onChange={(event) => {
                  setDurationMinutes(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {formatDurationLabel(minutes)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="-mt-1 text-xs text-slate-500">
            Puedes programar trabajos hasta el {formatShortDate(agendaMaxDate)}.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            {isSundaySelected ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span className="font-semibold">
                  Domingo marcado como descanso.
                </span>{" "}
                No se ofrecen horas libres automáticas para ese día.
              </div>
            ) : loadingAvailability ? (
              <div className="text-sm text-slate-700">
                Cargando horas libres para{" "}
                <span className="font-semibold">
                  {formatDurationLabel(selectedDurationMinutes)}
                </span>
                ...
              </div>
            ) : availabilityError ? (
              <div className="text-sm text-red-700">{availabilityError}</div>
            ) : noSlotsAvailable ? (
              <div className="text-sm text-red-700">
                No hay huecos disponibles para{" "}
                <span className="font-semibold">
                  {formatDurationLabel(selectedDurationMinutes)}
                </span>{" "}
                en este día.
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-700">
                  Solo se muestran horas libres reales según el día y la duración
                  elegida.
                </div>

                {firstAvailableTime ? (
                  <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    Primera hora libre: {firstAvailableTime}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Resumen rápido
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedDateLabel}{" "}
                  {startTime ? `· ${startTime}` : "· sin hora elegida"}{" "}
                  {selectedDurationMinutes
                    ? `· ${formatDurationLabel(selectedDurationMinutes)}`
                    : null}
                </p>
              </div>

              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Se guarda en mi agenda
              </span>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Nota</span>
            <input
              type="text"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              placeholder="Cambiar grifo, revisar enchufe..."
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                isSundaySelected ||
                saving ||
                loadingAvailability ||
                !!availabilityError ||
                selectableTimes.length === 0 ||
                !startTime ||
                !trimmedClientName
              }
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar trabajo"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}