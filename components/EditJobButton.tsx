"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type EditJobButtonProps = {
  jobId: number;
  clientName: string;
  phone: string | null;
  address: string | null;
  workDate: string;
  startTime: string;
  durationMinutes: number;
  notes: string | null;
  status: string;
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

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function normalizeStatus(value: string) {
  return value.trim().toLowerCase();
}

function getStatusLabel(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "pendiente") return "Comprometido";
  if (normalized === "hecho") return "Hecho";
  if (normalized === "facturado") return "Facturado";
  if (normalized === "cancelado") return "Cancelado";
  if (normalized === "archivado") return "Archivado";

  return status;
}

function getStatusBadgeClasses(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "pendiente") {
    return "border-red-600 bg-red-600 text-white";
  }

  if (normalized === "hecho") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "facturado") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (normalized === "cancelado") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "archivado") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function EditJobButton(props: EditJobButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => toDateValue(new Date()), []);
  const originalStartTime = useMemo(
    () => props.startTime.slice(0, 5),
    [props.startTime]
  );

  const queryEdit = searchParams.get("edit") || "";
  const shouldOpenFromQuery = queryEdit === String(props.jobId);

  const [open, setOpen] = useState(false);

  const [clientName, setClientName] = useState(props.clientName);
  const [phone, setPhone] = useState(props.phone ?? "");
  const [address, setAddress] = useState(props.address ?? "");
  const [workDate, setWorkDate] = useState(props.workDate);
  const [startTime, setStartTime] = useState(originalStartTime);
  const [durationMinutes, setDurationMinutes] = useState(
    String(props.durationMinutes)
  );
  const [notes, setNotes] = useState(props.notes ?? "");
  const [currentStatus, setCurrentStatus] = useState(props.status);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [busyStatusAction, setBusyStatusAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectableTimes = useMemo(() => {
    const merged = [...availableTimes];

    if (workDate === props.workDate && !merged.includes(originalStartTime)) {
      merged.push(originalStartTime);
    }

    return merged.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }, [availableTimes, workDate, props.workDate, originalStartTime]);

  const resetForm = useCallback(() => {
    setClientName(props.clientName);
    setPhone(props.phone ?? "");
    setAddress(props.address ?? "");
    setWorkDate(props.workDate);
    setStartTime(originalStartTime);
    setDurationMinutes(String(props.durationMinutes));
    setNotes(props.notes ?? "");
    setCurrentStatus(props.status);
    setError(null);
    setAvailabilityError(null);
  }, [
    props.clientName,
    props.phone,
    props.address,
    props.workDate,
    props.durationMinutes,
    props.notes,
    props.status,
    originalStartTime,
  ]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setError(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `/?${nextQuery}` : "/";

    router.replace(nextUrl, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (shouldOpenFromQuery) {
      resetForm();
      setOpen(true);
    }
  }, [shouldOpenFromQuery, resetForm]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeModal]);

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
          if (
            current &&
            (slots.includes(current) ||
              (workDate === props.workDate && current === originalStartTime))
          ) {
            return current;
          }

          if (workDate === props.workDate) {
            return originalStartTime;
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
  }, [
    open,
    workDate,
    durationMinutes,
    props.jobId,
    props.workDate,
    originalStartTime,
  ]);

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

      closeModal();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el trabajo.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(nextStatus: string, actionLabel: string) {
    setBusyStatusAction(actionLabel);
    setError(null);

    try {
      const response = await fetch(`/api/trabajos/${props.jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo cambiar el estado.");
      }

      setCurrentStatus(nextStatus);
      closeModal();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado.";
      setError(message);
    } finally {
      setBusyStatusAction(null);
    }
  }

  const normalizedCurrentStatus = normalizeStatus(currentStatus);
  const isBusy = saving || !!busyStatusAction;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Cerrar edición"
            onClick={closeModal}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    Editar trabajo
                  </h3>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClasses(
                      currentStatus
                    )}`}
                  >
                    {getStatusLabel(currentStatus)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-600">
                  Ajusta datos, fecha, hora y duración sin crear un trabajo
                  nuevo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-800">
                Acciones rápidas
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {normalizedCurrentStatus === "pendiente" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus("hecho", "done")}
                      disabled={isBusy}
                      className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    >
                      {busyStatusAction === "done"
                        ? "Guardando..."
                        : "Marcar hecho"}
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("cancelado", "cancel")}
                      disabled={isBusy}
                      className="inline-flex rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    >
                      {busyStatusAction === "cancel"
                        ? "Guardando..."
                        : "Cancelar"}
                    </button>
                  </>
                ) : null}

                {normalizedCurrentStatus === "hecho" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus("facturado", "invoice")}
                      disabled={isBusy}
                      className="inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    >
                      {busyStatusAction === "invoice"
                        ? "Guardando..."
                        : "Marcar facturado"}
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("pendiente", "reopen")}
                      disabled={isBusy}
                      className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                    >
                      {busyStatusAction === "reopen"
                        ? "Guardando..."
                        : "Volver a comprometido"}
                    </button>
                  </>
                ) : null}

                {normalizedCurrentStatus === "cancelado" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("pendiente", "reactivate")}
                    disabled={isBusy}
                    className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {busyStatusAction === "reactivate"
                      ? "Guardando..."
                      : "Reactivar"}
                  </button>
                ) : null}

                {normalizedCurrentStatus === "facturado" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("archivado", "archive")}
                    disabled={isBusy}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {busyStatusAction === "archive"
                      ? "Guardando..."
                      : "Archivar"}
                  </button>
                ) : null}
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
                      selectableTimes.length === 0 ||
                      !!busyStatusAction
                    }
                  >
                    {loadingAvailability ? (
                      <option value="">Cargando horas libres...</option>
                    ) : availabilityError ? (
                      <option value="">No disponible</option>
                    ) : selectableTimes.length === 0 ? (
                      <option value="">Sin horas libres</option>
                    ) : (
                      selectableTimes.map((slot) => (
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
                    disabled={!!busyStatusAction}
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
                ) : selectableTimes.length === 0 ? (
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
                  disabled={!!busyStatusAction}
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
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  disabled={isBusy}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingAvailability ||
                    !!availabilityError ||
                    selectableTimes.length === 0 ||
                    !startTime ||
                    !!busyStatusAction
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