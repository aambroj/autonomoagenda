"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EditJobButtonProps = {
  jobId: number;
  clientName: string;
  phone: string | null;
  address: string | null;
  workDate: string;
  startTime: string;
  durationMinutes: number;
  notes: string | null;
};

type AvailabilityResponse = {
  date: string;
  duration_minutes: number;
  slots: string[];
  error?: string;
};

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export default function EditJobButton(props: EditJobButtonProps) {
  const router = useRouter();
  const today = useMemo(() => toDateValue(new Date()), []);

  const [open, setOpen] = useState(false);

  const [clientName, setClientName] = useState(props.clientName);
  const [phone, setPhone] = useState(props.phone ?? "");
  const [address, setAddress] = useState(props.address ?? "");
  const [workDate, setWorkDate] = useState(props.workDate);
  const [startTime, setStartTime] = useState(props.startTime.slice(0, 5));
  const [durationMinutes, setDurationMinutes] = useState(
    String(props.durationMinutes)
  );
  const [notes, setNotes] = useState(props.notes ?? "");

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setClientName(props.clientName);
    setPhone(props.phone ?? "");
    setAddress(props.address ?? "");
    setWorkDate(props.workDate);
    setStartTime(props.startTime.slice(0, 5));
    setDurationMinutes(String(props.durationMinutes));
    setNotes(props.notes ?? "");
    setError(null);
    setAvailabilityError(null);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadAvailability() {
      setLoadingAvailability(true);
      setAvailabilityError(null);

      try {
        const response = await fetch(
          `/api/trabajos/disponibilidad?date=${encodeURIComponent(
            workDate
          )}&duration_minutes=${encodeURIComponent(
            durationMinutes
          )}&ignore_id=${encodeURIComponent(props.jobId)}`,
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

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [open, workDate, durationMinutes, props.jobId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/trabajos/${props.jobId}`, {
        method: "PUT",
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

      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el trabajo.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
      >
        Editar
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Editar trabajo
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Ajusta datos, fecha, hora y duración sin crear un trabajo nuevo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
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
                  onChange={(event) => setAddress(event.target.value)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Fecha *
                  </span>
                  <input
                    type="date"
                    value={workDate}
                    min={today}
                    onChange={(event) => setWorkDate(event.target.value)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Hora *
                  </span>
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                {loadingAvailability ? (
                  <span className="text-slate-700">
                    Cargando horas libres para{" "}
                    <span className="font-semibold">
                      {formatDurationLabel(Number(durationMinutes))}
                    </span>
                    ...
                  </span>
                ) : availabilityError ? (
                  <span className="text-red-700">{availabilityError}</span>
                ) : availableTimes.length === 0 ? (
                  <span className="text-red-700">
                    No quedan horas libres para esa duración en ese día.
                  </span>
                ) : (
                  <span className="text-slate-700">
                    Se muestran horas reales disponibles, ignorando este mismo
                    trabajo.
                  </span>
                )}
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Nota</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingAvailability ||
                    !!availabilityError ||
                    availableTimes.length === 0 ||
                    !startTime
                  }
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}