import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type CreateTrabajoBody = {
  client_name?: string;
  phone?: string;
  address?: string;
  work_date?: string;
  start_time?: string;
  duration_minutes?: number | string;
  notes?: string;
};

type ExistingTrabajo = {
  id: number;
  client_name: string;
  start_time: string;
  duration_minutes: number;
  status: string;
};

const MADRID_TIME_ZONE = "Europe/Madrid";
const WORK_DAY_START = "08:00";
const WORK_DAY_END = "20:00";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function isBlockingStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pendiente" ||
    normalized === "hecho" ||
    normalized === "facturado"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTrabajoBody;

    const client_name = normalizeText(body.client_name);
    const phone = normalizeText(body.phone);
    const address = normalizeText(body.address);
    const work_date = normalizeText(body.work_date);
    const start_time = normalizeText(body.start_time);
    const notes = normalizeText(body.notes);

    const duration_minutes = Number(body.duration_minutes);
    const status = "pendiente";
    const committed_at = new Date().toISOString();
    const agendaStartDate = getAgendaStartDateInMadrid();

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

    if (work_date < agendaStartDate) {
      return NextResponse.json(
        {
          error:
            "Ese día ya ha quedado fuera de agenda. La jornada de hoy ya terminó.",
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

    const dayStartMinutes = timeToMinutes(WORK_DAY_START);
    const dayEndMinutes = timeToMinutes(WORK_DAY_END);

    const newStartMinutes = timeToMinutes(start_time);
    const newEndMinutes = newStartMinutes + duration_minutes;

    if (newStartMinutes < dayStartMinutes) {
      return NextResponse.json(
        {
          error: `La jornada empieza a las ${WORK_DAY_START}.`,
        },
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

    const { data: existingTrabajos, error: existingError } = await supabase
      .from("trabajos")
      .select("id, client_name, start_time, duration_minutes, status")
      .eq("work_date", work_date)
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
      (existingTrabajos as ExistingTrabajo[]) ?? []
    ).filter((trabajo) => isBlockingStatus(trabajo.status));

    const conflict = blockingTrabajos.find((trabajo) => {
      const existingStartMinutes = timeToMinutes(trabajo.start_time);
      const existingEndMinutes =
        existingStartMinutes + Number(trabajo.duration_minutes || 0);

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

    const { data, error } = await supabase
      .from("trabajos")
      .insert({
        client_name,
        phone: phone || null,
        address: address || null,
        work_date,
        start_time,
        duration_minutes,
        notes: notes || null,
        status,
        committed_at,
        done_at: null,
        invoiced_at: null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo guardar el trabajo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, trabajo: data });
  } catch {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 }
    );
  }
}