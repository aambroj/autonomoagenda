import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

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
const SLOT_STEP_MINUTES = 30;
const MAX_FUTURE_DAYS = 30;

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateValueToUtcDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function isSundayDate(dateValue: string) {
  return dateValueToUtcDate(dateValue).getUTCDay() === 0;
}

function timeToMinutes(value: string) {
  const [hourText, minuteText] = value.slice(0, 5).split(":");
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

function toDateValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function isBlockingStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pendiente" ||
    normalized === "hecho" ||
    normalized === "facturado"
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para consultar disponibilidad." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const date = (searchParams.get("date") || "").trim();
    const durationText = (searchParams.get("duration_minutes") || "").trim();
    const ignoreIdText = (searchParams.get("ignore_id") || "").trim();

    const durationMinutes = Number(durationText);
    const parsedIgnoreId = ignoreIdText ? Number(ignoreIdText) : null;
    const ignoreId =
      parsedIgnoreId !== null && Number.isFinite(parsedIgnoreId)
        ? parsedIgnoreId
        : null;

    const agendaStartDate = getAgendaStartDateInMadrid();
    const agendaMaxDate = getAgendaMaxDateInMadrid();

    if (!date || !isValidDate(date)) {
      return NextResponse.json(
        { error: "La fecha no es válida." },
        { status: 400 }
      );
    }

    if (date < agendaStartDate) {
      return NextResponse.json(
        {
          error:
            "Ese día ya ha quedado fuera de agenda. La jornada de hoy ya terminó.",
        },
        { status: 400 }
      );
    }

    if (date > agendaMaxDate) {
      return NextResponse.json(
        {
          error:
            "Solo puedes consultar disponibilidad hasta 30 días por delante desde hoy.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json(
        { error: "La duración no es válida." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("trabajos")
      .select("id, client_name, start_time, duration_minutes, status")
      .eq("user_id", user.id)
      .eq("work_date", date)
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo cargar la disponibilidad." },
        { status: 500 }
      );
    }

    const allTrabajos = (data as ExistingTrabajo[]) ?? [];

    if (isSundayDate(date)) {
      if (ignoreId) {
        const ignoredTrabajo = allTrabajos.find(
          (trabajo) => trabajo.id === ignoreId
        );

        if (ignoredTrabajo) {
          return NextResponse.json({
            date,
            duration_minutes: durationMinutes,
            slots: [ignoredTrabajo.start_time],
            is_non_working_day: true,
          });
        }
      }

      return NextResponse.json(
        {
          error:
            "El domingo está marcado como día de descanso y no ofrece horas disponibles.",
        },
        { status: 400 }
      );
    }

    const trabajos = allTrabajos.filter((trabajo) => {
      if (!isBlockingStatus(trabajo.status)) return false;
      if (ignoreId && trabajo.id === ignoreId) return false;
      return true;
    });

    const dayStart = timeToMinutes(WORK_DAY_START);
    const dayEnd = timeToMinutes(WORK_DAY_END);

    const slots: string[] = [];

    for (
      let start = dayStart;
      start + durationMinutes <= dayEnd;
      start += SLOT_STEP_MINUTES
    ) {
      const end = start + durationMinutes;

      const hasConflict = trabajos.some((trabajo) => {
        const existingStart = timeToMinutes(trabajo.start_time);
        const existingEnd =
          existingStart + Number(trabajo.duration_minutes || 0);

        return start < existingEnd && end > existingStart;
      });

      if (!hasConflict) {
        slots.push(minutesToTime(start));
      }
    }

    return NextResponse.json({
      date,
      duration_minutes: durationMinutes,
      slots,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo calcular la disponibilidad." },
      { status: 500 }
    );
  }
}