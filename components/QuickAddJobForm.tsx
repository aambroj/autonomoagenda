"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AvailabilityResponse = {
  date: string;
  duration_minutes: number;
  slots: string[];
  error?: string;
};

const MADRID_TIME_ZONE = "Europe/Madrid";
const WORK_DAY_END = "20:00";

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

export default function QuickAddJobForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const agendaMinDate = useMemo(() => getAgendaMinDateInMadrid(), []);

  const queryDate = searchParams.get("date") || "";
  const queryTime = searchParams.get("time") || "";

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

  useEffect(() => {
    if (queryDate && queryDate >= agendaMinDate) {
      setWorkDate(queryDate);
    }

    if (queryTime) {
      setStartTime(queryTime);
    }
  }, [queryDate, queryTime, agendaMinDate]);

  useEffect(() => {
    if (workDate < agendaMinDate) {
      setWorkDate(agendaMinDate);
    }
  }, [workDate, agendaMinDate]);

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
          if (current && slots.includes(current)) {
            return current;
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
      return;
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [workDate, durationMinutes]);

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
          client_name: clientName,
          phone,
          address,
          work_date: workDate,
          start_time: startTime,
          duration_minutes: Number(durationMinutes),
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo guardar el trabajo.");
      }

      setClientName("");
      setPhone("");
      setAddress("");
      setWorkDate(agendaMinDate);
      setStartTime("");
      setDurationMinutes("60");
      setNotes("");
      setSuccess("Trabajo guardado correctamente como Comprometido.");

      router.replace("/#quick-add-job-form");
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
    availableTimes.length === 0;

  const firstAvailableTime = availableTimes[0] ?? null;
  const selectedDurationMinutes = Number(durationMinutes);

  return (
    <section
      id="quick-add-job-form"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Añadir trabajo rápido
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Al guardar, el trabajo quedará directamente como Comprometido.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Cliente *
            </span>
            <input
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
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
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              placeholder="600123123"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Dirección</span>
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
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
              onChange={(event) => setWorkDate(event.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Hora *</span>
            <select
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100"
              required
              disabled={
                loadingAvailability ||
                !!availabilityError ||
                availableTimes.length === 0
              }
            >
              {loadingAvailability ? (
                <option value="">Cargando horas libres...</option>
              ) : availabilityError ? (
                <option value="">No disponible</option>
              ) : availableTimes.length === 0 ? (
                <option value="">Sin horas libres</option>
              ) : (
                availableTimes.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Duración *
            </span>
            <select
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 h</option>
              <option value="90">1 h 30 min</option>
              <option value="120">2 h</option>
              <option value="150">2 h 30 min</option>
              <option value="180">3 h</option>
              <option value="210">3 h 30 min</option>
              <option value="240">4 h</option>
              <option value="270">4 h 30 min</option>
              <option value="300">5 h</option>
              <option value="360">6 h</option>
              <option value="420">7 h</option>
              <option value="480">8 h</option>
              <option value="540">9 h</option>
              <option value="600">10 h</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          {loadingAvailability ? (
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
              No quedan horas libres para una duración de{" "}
              <span className="font-semibold">
                {formatDurationLabel(selectedDurationMinutes)}
              </span>{" "}
              en ese día.
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

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Nota</span>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
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
              saving ||
              loadingAvailability ||
              !!availabilityError ||
              availableTimes.length === 0 ||
              !startTime
            }
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar trabajo"}
          </button>
        </div>
      </form>
    </section>
  );
}