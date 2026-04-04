import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateStatusBody = {
  status?: string;
};

type UpdateTrabajoBody = {
  client_name?: string;
  phone?: string;
  address?: string;
  work_date?: string;
  start_time?: string;
  duration_minutes?: number | string;
  notes?: string;
};

type DeleteTrabajoBody = {
  confirm_text?: string;
  confirmText?: string;
};

type TrabajoRow = {
  id: number;
  client_name: string;
  phone: string | null;
  address: string | null;
  work_date: string;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
  status: string;
  committed_at: string | null;
  done_at: string | null;
  invoiced_at: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
};

type StatusUpdatePayload = {
  status: string;
  committed_at?: string | null;
  done_at?: string | null;
  invoiced_at?: string | null;
  cancelled_at?: string | null;
  archived_at?: string | null;
};

const MADRID_TIME_ZONE = "Europe/Madrid";
const WORK_DAY_START = "08:00";
const WORK_DAY_END = "20:00";
const MAX_FUTURE_DAYS = 30;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.split(":");
  return Number(hourText) * 60 + Number(minuteText);
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
  return minutesToTime(timeToMinutes(time) + minutes);
}

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

function getAgendaStartDateInMadrid() {
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

function canTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;

  if (currentStatus === "pendiente") {
    return nextStatus === "hecho" || nextStatus === "cancelado";
  }

  if (currentStatus === "hecho") {
    return nextStatus === "facturado" || nextStatus === "pendiente";
  }

  if (currentStatus === "cancelado") {
    return nextStatus === "pendiente";
  }

  if (currentStatus === "facturado") {
    return nextStatus === "archivado";
  }

  return false;
}

function isBlockingStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pendiente" ||
    normalized === "hecho" ||
    normalized === "facturado"
  );
}

function canDeletePermanently(status: string) {
  const normalized = normalizeStatus(status);
  return normalized === "archivado" || normalized === "cancelado";
}

function buildStatusUpdatePayload(
  currentStatus: string,
  nextStatus: string
): StatusUpdatePayload {
  if (currentStatus === nextStatus) {
    return { status: nextStatus };
  }

  const now = new Date().toISOString();

  if (nextStatus === "pendiente") {
    if (currentStatus === "hecho") {
      return {
        status: nextStatus,
        committed_at: now,
        done_at: null,
        invoiced_at: null,
        cancelled_at: null,
        archived_at: null,
      };
    }

    if (currentStatus === "cancelado") {
      return {
        status: nextStatus,
        committed_at: now,
        cancelled_at: null,
        archived_at: null,
      };
    }

    return {
      status: nextStatus,
      committed_at: now,
      cancelled_at: null,
      archived_at: null,
    };
  }

  if (nextStatus === "hecho") {
    return {
      status: nextStatus,
      done_at: now,
      invoiced_at: null,
      cancelled_at: null,
      archived_at: null,
    };
  }

  if (nextStatus === "facturado") {
    return {
      status: nextStatus,
      invoiced_at: now,
      cancelled_at: null,
      archived_at: null,
    };
  }

  if (nextStatus === "cancelado") {
    return {
      status: nextStatus,
      cancelled_at: now,
      archived_at: null,
    };
  }

  if (nextStatus === "archivado") {
    return {
      status: nextStatus,
      cancelled_at: null,
      archived_at: now,
    };
  }

  return {
    status: nextStatus,
  };
}

async function getTrabajoById(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  trabajoId: number,
  userId: string
) {
  const { data, error } = await supabase
    .from("trabajos")
    .select(
      "id, client_name, phone, address, work_date, start_time, duration_minutes, notes, status, committed_at, done_at, invoiced_at, cancelled_at, archived_at"
    )
    .eq("id", trabajoId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    data: data as TrabajoRow | null,
    error,
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para editar trabajos." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const trabajoId = Number(id);

    if (!Number.isFinite(trabajoId) || trabajoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del trabajo no es válido." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateTrabajoBody;

    const client_name = normalizeText(body.client_name);
    const phone = normalizeText(body.phone);
    const address = normalizeText(body.address);
    const work_date = normalizeText(body.work_date);
    const start_time = normalizeText(body.start_time);
    const notes = normalizeText(body.notes);
    const duration_minutes = Number(body.duration_minutes);

    if (!client_name) {
      return NextResponse.json(
        { error: "El nombre del cliente es obligatorio." },
        { status: 400 }
      );
    }

    if (!work_date || !isValidDate(work_date)) {
      return NextResponse.json(
        { error: "La fecha del trabajo no es válida." },
        { status: 400 }
      );
    }

    const agendaStartDate = getAgendaStartDateInMadrid();
    const agendaMaxDate = getAgendaMaxDateInMadrid();

    if (work_date < agendaStartDate) {
      return NextResponse.json(
        { error: "No se pueden mover trabajos a días ya fuera de agenda." },
        { status: 400 }
      );
    }

    if (work_date > agendaMaxDate) {
      return NextResponse.json(
        {
          error:
            "Solo puedes programar trabajos hasta 30 días por delante desde hoy.",
        },
        { status: 400 }
      );
    }

    if (!start_time || !isValidTime(start_time)) {
      return NextResponse.json(
        { error: "La hora de inicio no es válida." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
      return NextResponse.json(
        { error: "La duración debe ser mayor que 0." },
        { status: 400 }
      );
    }

    const { data: trabajo, error: trabajoError } = await getTrabajoById(
      supabase,
      trabajoId,
      user.id
    );

    if (trabajoError) {
      return NextResponse.json(
        { error: trabajoError.message || "No se pudo leer el trabajo." },
        { status: 500 }
      );
    }

    if (!trabajo) {
      return NextResponse.json(
        { error: "No se encontró el trabajo." },
        { status: 404 }
      );
    }

    const currentStatus = normalizeStatus(trabajo.status);

    if (currentStatus === "archivado") {
      return NextResponse.json(
        {
          error: "Un trabajo archivado ya no se puede editar.",
        },
        { status: 400 }
      );
    }

    const dayStartMinutes = timeToMinutes(WORK_DAY_START);
    const dayEndMinutes = timeToMinutes(WORK_DAY_END);
    const newStartMinutes = timeToMinutes(start_time);
    const newEndMinutes = newStartMinutes + duration_minutes;

    if (newStartMinutes < dayStartMinutes) {
      return NextResponse.json(
        { error: `La jornada empieza a las ${WORK_DAY_START}.` },
        { status: 400 }
      );
    }

    if (newEndMinutes > dayEndMinutes) {
      return NextResponse.json(
        {
          error: `El trabajo termina fuera de la jornada (${WORK_DAY_END}).`,
        },
        { status: 400 }
      );
    }

    if (isBlockingStatus(currentStatus)) {
      const { data: existingTrabajos, error: existingError } = await supabase
        .from("trabajos")
        .select("id, client_name, start_time, duration_minutes, status")
        .eq("user_id", user.id)
        .eq("work_date", work_date)
        .neq("id", trabajoId)
        .order("start_time", { ascending: true });

      if (existingError) {
        return NextResponse.json(
          {
            error:
              existingError.message || "No se pudo comprobar la disponibilidad.",
          },
          { status: 500 }
        );
      }

      const blockingTrabajos = (
        (existingTrabajos as TrabajoRow[]) ?? []
      ).filter((existingTrabajo) => isBlockingStatus(existingTrabajo.status));

      const conflict = blockingTrabajos.find((existingTrabajo) => {
        const existingStartMinutes = timeToMinutes(existingTrabajo.start_time);
        const existingEndMinutes =
          existingStartMinutes + Number(existingTrabajo.duration_minutes || 0);

        return (
          newStartMinutes < existingEndMinutes &&
          newEndMinutes > existingStartMinutes
        );
      });

      if (conflict) {
        const conflictEnd = addMinutes(
          conflict.start_time,
          Number(conflict.duration_minutes || 0)
        );

        return NextResponse.json(
          {
            error: `Ese horario se solapa con ${conflict.client_name} (${conflict.start_time.slice(
              0,
              5
            )} - ${conflictEnd}).`,
          },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("trabajos")
      .update({
        client_name,
        phone: phone || null,
        address: address || null,
        work_date,
        start_time,
        duration_minutes,
        notes: notes || null,
      })
      .eq("id", trabajoId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo actualizar el trabajo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, trabajo: data });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar el trabajo." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para cambiar estados." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const trabajoId = Number(id);

    if (!Number.isFinite(trabajoId) || trabajoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del trabajo no es válido." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateStatusBody;
    const nextStatus = normalizeStatus(body.status);

    if (
      !nextStatus ||
      !["pendiente", "hecho", "facturado", "cancelado", "archivado"].includes(
        nextStatus
      )
    ) {
      return NextResponse.json(
        { error: "El estado solicitado no es válido." },
        { status: 400 }
      );
    }

    const { data: trabajo, error: trabajoError } = await getTrabajoById(
      supabase,
      trabajoId,
      user.id
    );

    if (trabajoError) {
      return NextResponse.json(
        { error: trabajoError.message || "No se pudo leer el trabajo." },
        { status: 500 }
      );
    }

    if (!trabajo) {
      return NextResponse.json(
        { error: "No se encontró el trabajo." },
        { status: 404 }
      );
    }

    const currentStatus = normalizeStatus(trabajo.status);

    if (!canTransition(currentStatus, nextStatus)) {
      return NextResponse.json(
        {
          error: "Ese cambio de estado no está permitido en este momento.",
        },
        { status: 400 }
      );
    }

    const updatePayload = buildStatusUpdatePayload(currentStatus, nextStatus);

    const { data, error } = await supabase
      .from("trabajos")
      .update(updatePayload)
      .eq("id", trabajoId)
      .eq("user_id", user.id)
      .select(
        "id, status, committed_at, done_at, invoiced_at, cancelled_at, archived_at"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo actualizar el trabajo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, trabajo: data });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar el trabajo." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para borrar trabajos." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const trabajoId = Number(id);

    if (!Number.isFinite(trabajoId) || trabajoId <= 0) {
      return NextResponse.json(
        { error: "El identificador del trabajo no es válido." },
        { status: 400 }
      );
    }

    let body: DeleteTrabajoBody = {};

    try {
      body = (await request.json()) as DeleteTrabajoBody;
    } catch {
      body = {};
    }

    const confirmText = normalizeText(
      body.confirm_text ?? body.confirmText ?? ""
    ).toLowerCase();

    if (confirmText !== "eliminar") {
      return NextResponse.json(
        {
          error:
            'Para borrar el trabajo definitivamente debes escribir "eliminar".',
        },
        { status: 400 }
      );
    }

    const { data: trabajo, error: trabajoError } = await getTrabajoById(
      supabase,
      trabajoId,
      user.id
    );

    if (trabajoError) {
      return NextResponse.json(
        { error: trabajoError.message || "No se pudo leer el trabajo." },
        { status: 500 }
      );
    }

    if (!trabajo) {
      return NextResponse.json(
        { error: "No se encontró el trabajo." },
        { status: 404 }
      );
    }

    if (!canDeletePermanently(trabajo.status)) {
      return NextResponse.json(
        {
          error:
            "Solo se puede eliminar definitivamente un trabajo cuando está Cancelado o Archivado.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("trabajos")
      .delete()
      .eq("id", trabajoId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo borrar el trabajo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo borrar el trabajo." },
      { status: 500 }
    );
  }
}