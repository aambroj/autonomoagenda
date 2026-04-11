import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import InternalTopbar from "@/components/InternalTopbar";
import QuickAddJobForm from "@/components/QuickAddJobForm";
import JobActions from "@/components/JobActions";
import EditJobButton from "@/components/EditJobButton";
import AgendaFilters from "@/components/AgendaFilters";
import SharedAgendaSelector from "@/components/SharedAgendaSelector";
import AgendaAutoRefresh from "@/components/AgendaAutoRefresh";

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
  committed_at: string | null;
  done_at: string | null;
  invoiced_at: string | null;
  cancelled_at: string | null;
  user_id?: string | null;
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

type TimelineMark = {
  label: string;
  offsetMinutes: number;
};

type TimelineGuideMark = {
  label: string | null;
  offsetMinutes: number;
  major: boolean;
};

type AgendaPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    day?: string;
    date?: string;
    week?: string;
    time?: string;
    duration?: string;
    quick?: string;
    edit?: string;
    shared?: string;
  }>;
};

type LinkRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_from_invite_id: string | null;
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
};

type InviteRow = {
  id: string;
  inviter_user_id: string;
  inviter_email: string | null;
  invitee_email: string;
  invitee_user_id: string | null;
  status: string;
  created_at: string;
  alias_for_inviter: string | null;
  alias_for_invitee: string | null;
};

type AgendaOwner = {
  userId: string;
  label: string;
  isOwn: boolean;
  readOnly: boolean;
  inviteId: string | null;
  editAliasHref: string | null;
  manageConnectionHref: string;
};

type AgendaDayData = {
  date: string;
  label: string;
  compactWeekday: string;
  compactDayNumber: string;
  isSunday: boolean;
  isNonWorkingDay: boolean;
  items: Trabajo[];
  blockingItems: Trabajo[];
  actualFreeBlocks: TimeGap[];
  usableGaps: TimeGap[];
  hasActualFreeTime: boolean;
  hasUsableGaps: boolean;
  hasShortFreeTime: boolean;
  totalFreeMinutes: number;
  firstFreeTime: string | null;
  longestGap: TimeGap | null;
  visibleWindowMinutes: number;
  visibleDayStartMinutes: number;
  visibleDayEndMinutes: number;
  busyMinutes: number;
  occupancyPercentage: number;
  committedItemsCount: number;
  doneItemsCount: number;
  timelineHeightPx: number;
  timelineMarks: TimelineMark[];
  timelineGuideMarks: TimelineGuideMark[];
  displayTimelineMarks: TimelineMark[];
  displayTimelineGuideMarks: TimelineGuideMark[];
};

type AgendaComputedData = {
  filteredTrabajos: Trabajo[];
  activeTrabajos: Trabajo[];
  archivedTrabajos: Trabajo[];
  committedCount: number;
  doneCount: number;
  invoicedCount: number;
  archivedCount: number;
  daysWithData: AgendaDayData[];
  hasAnyVisibleWork: boolean;
};

const DAYS_TO_SHOW = 7;
const MADRID_LOCALE = "es-ES";
const MADRID_TIME_ZONE = "Europe/Madrid";
const WORK_DAY_START = "08:00";
const WORK_DAY_END = "20:00";
const MIN_GAP_MINUTES = 30;
const QUICK_ADD_DEFAULT_DURATION = 60;

function toDateValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

function getStartOfWeekDateValue(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);
  const currentDay = date.getUTCDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  return addDaysToDateValue(dateValue, diff);
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

function formatCompactWeekdayLabel(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);

  const label = date.toLocaleDateString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    weekday: "short",
  });

  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function formatCompactDayNumber(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);

  return date.toLocaleDateString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    day: "numeric",
  });
}

function formatShortDayMonth(dateValue: string) {
  const date = dateValueToUtcDate(dateValue);

  return date.toLocaleDateString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  });
}

function formatWeekRangeLabel(days: DayItem[]) {
  if (days.length === 0) return "";

  const firstDate = days[0]?.date;
  const lastDate = days[days.length - 1]?.date;

  if (!firstDate || !lastDate) return "";

  return `${formatShortDayMonth(firstDate)} - ${formatShortDayMonth(lastDate)}`;
}

function formatStatusMoment(value: string | null | undefined) {
  if (!value) return "Sin registrar";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin registrar";
  }

  const dateLabel = date.toLocaleDateString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const timeLabel = date.toLocaleTimeString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${
    dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)
  } · ${timeLabel}`;
}

function isSundayDate(dateValue: string) {
  return dateValueToUtcDate(dateValue).getUTCDay() === 0;
}

function isNonWorkingDay(dateValue: string) {
  return isSundayDate(dateValue);
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

function buildWeekDays(anchorDate: string) {
  return buildNextDays(DAYS_TO_SHOW, getStartOfWeekDateValue(anchorDate));
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

function roundUpMinutes(totalMinutes: number, step: number) {
  return Math.ceil(totalMinutes / step) * step;
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
    return "border-amber-300 bg-amber-100 text-amber-900";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "facturado") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
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

function getTimelineStatusPillClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") {
    return "border-red-200 bg-white/90 text-red-700";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "border-sky-200 bg-white/90 text-sky-700";
  }

  if (normalized === "facturado") {
    return "border-indigo-200 bg-white/90 text-indigo-700";
  }

  if (normalized === "cancelado") {
    return "border-amber-200 bg-white/90 text-amber-900";
  }

  if (normalized === "archivado") {
    return "border-slate-200 bg-white/90 text-slate-600";
  }

  return "border-slate-200 bg-white/90 text-slate-700";
}

function getMainTimeClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") {
    return "text-[1.75rem] font-black tracking-tight text-red-700 sm:text-[2.15rem] lg:text-[2.35rem]";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "text-[1.75rem] font-black tracking-tight text-sky-700 sm:text-[2.15rem] lg:text-[2.35rem]";
  }

  if (normalized === "facturado") {
    return "text-[1.75rem] font-black tracking-tight text-indigo-700 sm:text-[2.15rem] lg:text-[2.35rem]";
  }

  if (normalized === "cancelado") {
    return "text-[1.75rem] font-black tracking-tight text-amber-900 sm:text-[2.15rem] lg:text-[2.35rem]";
  }

  if (normalized === "archivado") {
    return "text-[1.75rem] font-black tracking-tight text-slate-600 sm:text-[2.15rem] lg:text-[2.35rem]";
  }

  return "text-[1.75rem] font-black tracking-tight text-slate-800 sm:text-[2.15rem] lg:text-[2.35rem]";
}

function getDurationClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") {
    return "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-base font-bold text-red-700 sm:text-lg";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-base font-bold text-sky-700 sm:text-lg";
  }

  if (normalized === "facturado") {
    return "inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-base font-bold text-indigo-700 sm:text-lg";
  }

  if (normalized === "cancelado") {
    return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-base font-bold text-amber-900 sm:text-lg";
  }

  if (normalized === "archivado") {
    return "inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-base font-bold text-slate-700 sm:text-lg";
  }

  return "inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-base font-bold text-slate-700 sm:text-lg";
}

function getTimelineJobClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pendiente") {
    return "border-red-300 bg-red-100/95 text-red-900";
  }

  if (normalized === "hecho" || normalized === "terminado") {
    return "border-sky-300 bg-sky-100/95 text-sky-900";
  }

  if (normalized === "facturado") {
    return "border-indigo-300 bg-indigo-100/95 text-indigo-900";
  }

  return "border-slate-300 bg-slate-100/95 text-slate-900";
}

function getTrabajoCardClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "cancelado") {
    return "border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white";
  }

  if (normalized === "archivado") {
    return "border-slate-300/80 bg-gradient-to-br from-slate-50 to-white";
  }

  return "border-white/70 bg-white/88 backdrop-blur-sm";
}

function isBlockingStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "pendiente" ||
    normalized === "hecho" ||
    normalized === "facturado"
  );
}

function getVisibleDayStartMinutes(options?: {
  dayDate?: string;
  todayDate?: string;
  currentMinutes?: number;
}) {
  const dayStart = timeToMinutes(WORK_DAY_START);
  const dayEnd = timeToMinutes(WORK_DAY_END);

  const isToday =
    Boolean(options?.dayDate) &&
    Boolean(options?.todayDate) &&
    options?.dayDate === options?.todayDate;

  if (!isToday) {
    return dayStart;
  }

  return Math.min(
    dayEnd,
    Math.max(dayStart, roundUpMinutes(options?.currentMinutes ?? dayStart, 5))
  );
}

function getVisibleDayWindowMinutes(options?: {
  dayDate?: string;
  todayDate?: string;
  currentMinutes?: number;
}) {
  const dayEnd = timeToMinutes(WORK_DAY_END);
  const visibleDayStart = getVisibleDayStartMinutes(options);
  return Math.max(0, dayEnd - visibleDayStart);
}

function buildGaps(
  trabajos: Trabajo[],
  options?: {
    dayDate?: string;
    todayDate?: string;
    currentMinutes?: number;
  },
  minimumGapMinutes = 0
) {
  const dayEnd = timeToMinutes(WORK_DAY_END);
  const visibleDayStart = getVisibleDayStartMinutes(options);

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

  if (visibleDayStart >= dayEnd) {
    return [] satisfies TimeGap[];
  }

  if (blockingTrabajos.length === 0) {
    const diff = dayEnd - visibleDayStart;

    if (diff <= 0 || diff < minimumGapMinutes) {
      return [] satisfies TimeGap[];
    }

    return [
      {
        start: minutesToTime(visibleDayStart),
        end: WORK_DAY_END,
        minutes: diff,
      },
    ] satisfies TimeGap[];
  }

  const gaps: TimeGap[] = [];
  let cursor = visibleDayStart;

  for (const trabajo of blockingTrabajos) {
    const boundedStart = Math.max(visibleDayStart, trabajo.start);
    const boundedEnd = Math.min(dayEnd, trabajo.end);

    if (boundedStart > cursor) {
      const diff = boundedStart - cursor;

      if (diff > 0 && diff >= minimumGapMinutes) {
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

    if (diff > 0 && diff >= minimumGapMinutes) {
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

function getSuggestedDurationForGap(gapMinutes: number) {
  if (gapMinutes >= QUICK_ADD_DEFAULT_DURATION) {
    return QUICK_ADD_DEFAULT_DURATION;
  }

  return gapMinutes;
}

function buildQuickAddHref(
  date: string,
  time: string,
  duration: number,
  sharedUserId?: string
) {
  const params = new URLSearchParams({
    week: date,
    date,
    time,
    duration: String(duration),
    quick: "1",
  });

  if (sharedUserId?.trim()) {
    params.set("shared", sharedUserId.trim());
  }

  return `/agenda?${params.toString()}#quick-add-job-form`;
}

function buildTrabajoHref(
  jobId: number,
  weekDate: string,
  sharedUserId?: string
) {
  const params = new URLSearchParams({
    week: weekDate,
    edit: String(jobId),
  });

  if (sharedUserId?.trim()) {
    params.set("shared", sharedUserId.trim());
  }

  return `/agenda?${params.toString()}#trabajo-${jobId}`;
}

function buildWeekNavigationHref(params: {
  q?: string;
  status?: string;
  weekDate: string;
  shared?: string;
}) {
  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }

  if (params.shared?.trim()) {
    search.set("shared", params.shared.trim());
  }

  search.set("week", params.weekDate);
  search.set("date", params.weekDate);

  return `/agenda?${search.toString()}`;
}

function buildOwnAgendaHref(params: {
  q?: string;
  status?: string;
  day?: string;
  weekDate: string;
}) {
  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }

  if (params.day?.trim()) {
    search.set("day", params.day.trim());
  }

  search.set("week", params.weekDate);
  search.set("date", params.weekDate);

  return `/agenda?${search.toString()}#mi-agenda`;
}

function getTotalFreeMinutes(gaps: TimeGap[]) {
  return gaps.reduce((total, gap) => total + gap.minutes, 0);
}

function getFirstFreeTime(gaps: TimeGap[]) {
  return gaps[0]?.start ?? null;
}

function getLongestGap(gaps: TimeGap[]) {
  if (gaps.length === 0) return null;

  return gaps.reduce((longest, current) => {
    if (!longest || current.minutes > longest.minutes) {
      return current;
    }
    return longest;
  }, null as TimeGap | null);
}

function getOccupancyPercentage(
  busyMinutes: number,
  visibleWindowMinutes: number
) {
  if (visibleWindowMinutes <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((busyMinutes / visibleWindowMinutes) * 100))
  );
}

function getOccupancyBarClasses(percentage: number) {
  if (percentage >= 85) return "bg-red-600";
  if (percentage >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function getOccupancyTextClasses(percentage: number) {
  if (percentage >= 85) return "text-red-700";
  if (percentage >= 60) return "text-amber-700";
  return "text-emerald-700";
}

function getCompactDayCardClasses(params: {
  percentage: number;
  hasActualFreeTime: boolean;
  hasUsableGaps: boolean;
  isSunday: boolean;
  isNonWorking: boolean;
}) {
  const {
    percentage,
    hasActualFreeTime,
    hasUsableGaps,
    isSunday,
    isNonWorking,
  } = params;

  if (isNonWorking) {
    return "border-rose-300 bg-rose-100/85";
  }

  if (isSunday) {
    if (!hasActualFreeTime) {
      return "border-rose-300 bg-rose-100/80";
    }

    return "border-rose-200 bg-rose-50/85";
  }

  if (!hasActualFreeTime) {
    return "border-red-200 bg-white/85";
  }

  if (!hasUsableGaps) {
    return "border-emerald-200 bg-white/85";
  }

  if (percentage >= 85) {
    return "border-red-200 bg-white/88";
  }

  if (percentage >= 60) {
    return "border-amber-200 bg-white/88";
  }

  return "border-emerald-200 bg-white/88";
}

function getCompactDayBadgeClasses(params: {
  isNonWorking: boolean;
  hasActualFreeTime: boolean;
  hasUsableGaps: boolean;
}) {
  const { isNonWorking, hasActualFreeTime, hasUsableGaps } = params;

  if (isNonWorking) {
    return "inline-flex min-w-[82px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-rose-200 bg-rose-100 px-2 py-1 text-[10px] font-bold leading-none text-rose-700";
  }

  if (hasUsableGaps) {
    return "inline-flex min-w-[82px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-bold leading-none text-emerald-700";
  }

  if (hasActualFreeTime) {
    return "inline-flex min-w-[82px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold leading-none text-emerald-700";
  }

  return "inline-flex min-w-[82px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-bold leading-none text-red-700";
}

function getCompactDayBadgeLabel(params: {
  isNonWorking: boolean;
  hasActualFreeTime: boolean;
  hasUsableGaps: boolean;
}) {
  const { isNonWorking, hasActualFreeTime, hasUsableGaps } = params;

  if (isNonWorking) return "Descanso";
  if (hasUsableGaps) return "Huecos";
  if (hasActualFreeTime) return "Libre corto";
  return "Lleno";
}

function getDaySectionClasses(isSunday: boolean) {
  return isSunday
    ? "border-rose-200/80 bg-white/82 backdrop-blur-xl"
    : "border-white/70 bg-white/82 backdrop-blur-xl";
}

function getInnerPanelClasses(isSunday: boolean) {
  return isSunday
    ? "border-rose-200/80 bg-gradient-to-br from-rose-50/85 to-white"
    : "border-white/70 bg-white/72 backdrop-blur-sm";
}

function getNonWorkingBadgeClasses() {
  return "inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-700";
}

function getRestPanelClasses() {
  return "overflow-hidden rounded-[2rem] border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white px-5 py-5 shadow-sm";
}

function getTimelineHeightPx(visibleWindowMinutes: number) {
  return Math.max(320, Math.round(visibleWindowMinutes * 1.05));
}

function buildTimelineMarks(
  visibleStartMinutes: number,
  visibleEndMinutes: number
) {
  const marks: TimelineMark[] = [
    {
      label: minutesToTime(visibleStartMinutes),
      offsetMinutes: 0,
    },
  ];

  let currentHour = Math.ceil(visibleStartMinutes / 60) * 60;

  if (currentHour === visibleStartMinutes) {
    currentHour += 60;
  }

  while (currentHour < visibleEndMinutes) {
    marks.push({
      label: minutesToTime(currentHour),
      offsetMinutes: currentHour - visibleStartMinutes,
    });
    currentHour += 60;
  }

  return marks;
}

function buildTimelineGuideMarks(
  visibleStartMinutes: number,
  visibleEndMinutes: number
) {
  const marks: TimelineGuideMark[] = [];
  let current = visibleStartMinutes;

  while (current <= visibleEndMinutes) {
    const isHour = current % 60 === 0;
    marks.push({
      label:
        current === visibleStartMinutes || isHour
          ? minutesToTime(current)
          : null,
      offsetMinutes: current - visibleStartMinutes,
      major: isHour || current === visibleStartMinutes,
    });

    current += 30;
  }

  return marks;
}

function filterMarksBySpacing<T extends { offsetMinutes: number }>(
  marks: T[],
  visibleWindowMinutes: number,
  timelineHeightPx: number,
  minGapPx = 34
) {
  const safeWindow = Math.max(1, visibleWindowMinutes);
  const filtered: T[] = [];
  let lastTopPx = -Infinity;

  for (const mark of marks) {
    const topPx = (mark.offsetMinutes / safeWindow) * timelineHeightPx;

    if (topPx - lastTopPx >= minGapPx) {
      filtered.push(mark);
      lastTopPx = topPx;
    }
  }

  return filtered;
}

function getTimelineCanvasStyle() {
  return {
    backgroundImage: [
      "linear-gradient(to bottom, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
      "linear-gradient(to right, rgba(148,163,184,0.05) 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: "100% 100%, 24px 24px",
  } as const;
}

function getTimelineGridLineClasses(major: boolean) {
  return major
    ? "absolute left-0 right-0 border-t border-slate-300/70"
    : "absolute left-0 right-0 border-t border-dashed border-slate-200/90";
}

function getTimelineBlockStyle(params: {
  startMinutes: number;
  endMinutes: number;
  visibleStartMinutes: number;
  visibleEndMinutes: number;
  timelineHeightPx: number;
  minHeightPx?: number;
}) {
  const {
    startMinutes,
    endMinutes,
    visibleStartMinutes,
    visibleEndMinutes,
    timelineHeightPx,
    minHeightPx = 32,
  } = params;

  const safeStart = Math.max(startMinutes, visibleStartMinutes);
  const safeEnd = Math.min(endMinutes, visibleEndMinutes);
  const visibleWindowMinutes = Math.max(
    1,
    visibleEndMinutes - visibleStartMinutes
  );

  const topPx =
    ((safeStart - visibleStartMinutes) / visibleWindowMinutes) *
    timelineHeightPx;

  const rawHeightPx =
    ((safeEnd - safeStart) / visibleWindowMinutes) * timelineHeightPx;

  const heightPx =
    rawHeightPx < minHeightPx ? rawHeightPx : Math.max(minHeightPx, rawHeightPx);

  const clampedHeightPx = Math.max(
    Math.min(heightPx, timelineHeightPx - topPx),
    Math.min(rawHeightPx, timelineHeightPx - topPx)
  );

  return {
    top: `${Math.max(0, topPx)}px`,
    height: `${Math.max(0, clampedHeightPx)}px`,
  };
}

function getTimelineGapBlockStyle(params: {
  startMinutes: number;
  endMinutes: number;
  visibleStartMinutes: number;
  visibleEndMinutes: number;
  timelineHeightPx: number;
}) {
  const base = getTimelineBlockStyle({
    ...params,
    minHeightPx: 32,
  });

  return {
    ...base,
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(16,185,129,0.06) 0px, rgba(16,185,129,0.06) 10px, rgba(16,185,129,0.12) 10px, rgba(16,185,129,0.12) 20px)",
  };
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
    <div
      className={`rounded-3xl border p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] backdrop-blur-sm sm:p-5 ${cardClasses}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
        {title}
      </p>
      <p
        className={`mt-2 text-3xl font-black leading-none sm:text-4xl ${valueClasses}`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
    </div>
  );
}

function renderTrabajoCard(
  trabajo: Trabajo,
  options?: {
    readOnly?: boolean;
    ownerLabel?: string;
  }
) {
  const readOnly = options?.readOnly ?? false;

  const normalizedStatus = trabajo.status.trim().toLowerCase();
  const canEdit = !readOnly && normalizedStatus !== "archivado";
  const showArchivedDate = normalizedStatus === "archivado";
  const showCancelledNotice = normalizedStatus === "cancelado";
  const showCancelledTracking =
    showCancelledNotice || Boolean(trabajo.cancelled_at);

  const cancelledSummary = trabajo.cancelled_at
    ? `Cancelado el ${formatStatusMoment(
        trabajo.cancelled_at
      )}. Ya no cuenta como hueco ocupado.`
    : "Este trabajo está cancelado y ya no cuenta como hueco ocupado.";

  return (
    <article
      id={`trabajo-${trabajo.id}`}
      key={trabajo.id}
      className={`scroll-mt-24 rounded-3xl border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-offset-2 target:ring-2 target:ring-sky-300 sm:px-5 sm:py-4 ${getTrabajoCardClasses(
        trabajo.status
      )}`}
    >
      <div className="grid gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold leading-tight text-slate-900 sm:text-2xl">
                {trabajo.client_name}
              </p>

              {showCancelledNotice ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-900">
                  Trabajo cancelado
                </span>
              ) : null}

              {readOnly ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                  Solo lectura
                </span>
              ) : null}
            </div>

            {showArchivedDate ? (
              <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">
                Fecha del trabajo: {formatDateLabel(trabajo.work_date)}
              </p>
            ) : null}

            <div className="mt-1.5 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <p className={getMainTimeClasses(trabajo.status)}>
                {formatTime(trabajo.start_time)} -{" "}
                {addMinutes(trabajo.start_time, trabajo.duration_minutes)}
              </p>

              <span className={getDurationClasses(trabajo.status)}>
                {formatJobDurationLabel(trabajo.duration_minutes)}
              </span>
            </div>

            {showCancelledNotice ? (
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
                {cancelledSummary}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-start gap-2 lg:pl-3">
            {!showCancelledNotice ? (
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold sm:text-sm ${getStatusClasses(
                  trabajo.status
                )}`}
              >
                {getStatusLabel(trabajo.status)}
              </span>
            ) : null}

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
                status={trabajo.status}
              />
            ) : null}

            {!readOnly ? (
              <JobActions
                jobId={trabajo.id}
                clientName={trabajo.client_name}
                status={trabajo.status}
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {trabajo.phone ? (
              <div className="rounded-2xl bg-white/75 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
                  Teléfono
                </p>
                <p className="mt-0.5 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
                  {trabajo.phone}
                </p>
              </div>
            ) : null}

            {trabajo.address ? (
              <div className="rounded-2xl bg-white/75 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
                  Dirección
                </p>
                <p className="mt-0.5 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
                  {trabajo.address}
                </p>
              </div>
            ) : null}

            {trabajo.notes ? (
              <div className="rounded-2xl bg-white/75 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
                  Nota
                </p>
                <p className="mt-0.5 text-base font-semibold leading-tight text-slate-800 sm:text-lg">
                  {trabajo.notes}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
              Seguimiento del estado
            </p>

            <div className="mt-2 grid gap-2">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-red-700">
                  Comprometida
                </p>
                <p className="mt-1 text-sm font-bold leading-tight text-red-900 sm:text-base">
                  {formatStatusMoment(trabajo.committed_at)}
                </p>
              </div>

              {!showCancelledNotice ? (
                <>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-sky-700">
                      Hecha
                    </p>
                    <p className="mt-1 text-sm font-bold leading-tight text-sky-900 sm:text-base">
                      {formatStatusMoment(trabajo.done_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-indigo-700">
                      Facturada
                    </p>
                    <p className="mt-1 text-sm font-bold leading-tight text-indigo-900 sm:text-base">
                      {formatStatusMoment(trabajo.invoiced_at)}
                    </p>
                  </div>
                </>
              ) : null}

              {showCancelledTracking ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-amber-800">
                    Cancelada
                  </p>
                  <p className="mt-1 text-sm font-bold leading-tight text-amber-950 sm:text-base">
                    {formatStatusMoment(trabajo.cancelled_at)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function buildAgendaComputedData(params: {
  trabajos: Trabajo[];
  query: string;
  status: string;
  day: string;
  anchorDate: string;
  todayInMadrid: string;
  currentMinutesInMadrid: number;
  days: DayItem[];
  hasActiveFilters: boolean;
}) {
  const {
    trabajos,
    query,
    status,
    day,
    anchorDate,
    todayInMadrid,
    currentMinutesInMadrid,
    days,
    hasActiveFilters,
  } = params;

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

  const summaryDate = day || anchorDate;

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

      const nonWorkingDay = isNonWorkingDay(dayItem.date);

      const actualFreeBlocks = nonWorkingDay
        ? []
        : buildGaps(
            items,
            {
              dayDate: dayItem.date,
              todayDate: todayInMadrid,
              currentMinutes: currentMinutesInMadrid,
            },
            0
          );

      const usableGaps = nonWorkingDay
        ? []
        : buildGaps(
            items,
            {
              dayDate: dayItem.date,
              todayDate: todayInMadrid,
              currentMinutes: currentMinutesInMadrid,
            },
            MIN_GAP_MINUTES
          );

      const visibleDayStartMinutes = nonWorkingDay
        ? timeToMinutes(WORK_DAY_START)
        : getVisibleDayStartMinutes({
            dayDate: dayItem.date,
            todayDate: todayInMadrid,
            currentMinutes: currentMinutesInMadrid,
          });

      const visibleDayEndMinutes = nonWorkingDay
        ? timeToMinutes(WORK_DAY_START)
        : timeToMinutes(WORK_DAY_END);

      const totalFreeMinutes = nonWorkingDay
        ? 0
        : getTotalFreeMinutes(actualFreeBlocks);

      const visibleWindowMinutes = nonWorkingDay
        ? 0
        : getVisibleDayWindowMinutes({
            dayDate: dayItem.date,
            todayDate: todayInMadrid,
            currentMinutes: currentMinutesInMadrid,
          });

      const busyMinutes = nonWorkingDay
        ? 0
        : Math.max(0, visibleWindowMinutes - totalFreeMinutes);

      const occupancyPercentage = nonWorkingDay
        ? 0
        : getOccupancyPercentage(busyMinutes, visibleWindowMinutes);

      const committedItemsCount = items.filter(
        (trabajo) => trabajo.status.trim().toLowerCase() === "pendiente"
      ).length;

      const doneItemsCount = items.filter(
        (trabajo) => trabajo.status.trim().toLowerCase() === "hecho"
      ).length;

      const timelineHeightPx = getTimelineHeightPx(
        Math.max(visibleWindowMinutes, 60)
      );

      const timelineMarks = nonWorkingDay
        ? []
        : buildTimelineMarks(visibleDayStartMinutes, visibleDayEndMinutes);

      const timelineGuideMarks = nonWorkingDay
        ? []
        : buildTimelineGuideMarks(visibleDayStartMinutes, visibleDayEndMinutes);

      const displayTimelineMarks = nonWorkingDay
        ? []
        : filterMarksBySpacing(
            timelineMarks,
            visibleWindowMinutes,
            timelineHeightPx,
            34
          );

      const displayTimelineGuideMarks = nonWorkingDay
        ? []
        : filterMarksBySpacing(
            timelineGuideMarks.filter((mark) => Boolean(mark.label)),
            visibleWindowMinutes,
            timelineHeightPx,
            34
          );

      const hasActualFreeTime = actualFreeBlocks.length > 0;
      const hasUsableGaps = usableGaps.length > 0;
      const hasShortFreeTime = hasActualFreeTime && !hasUsableGaps;

      return {
        ...dayItem,
        compactWeekday: formatCompactWeekdayLabel(dayItem.date),
        compactDayNumber: formatCompactDayNumber(dayItem.date),
        isSunday: isSundayDate(dayItem.date),
        isNonWorkingDay: nonWorkingDay,
        items,
        blockingItems,
        actualFreeBlocks,
        usableGaps,
        hasActualFreeTime,
        hasUsableGaps,
        hasShortFreeTime,
        totalFreeMinutes,
        firstFreeTime: nonWorkingDay ? null : getFirstFreeTime(actualFreeBlocks),
        longestGap: nonWorkingDay ? null : getLongestGap(actualFreeBlocks),
        visibleWindowMinutes,
        visibleDayStartMinutes,
        visibleDayEndMinutes,
        busyMinutes,
        occupancyPercentage,
        committedItemsCount,
        doneItemsCount,
        timelineHeightPx,
        timelineMarks,
        timelineGuideMarks,
        displayTimelineMarks,
        displayTimelineGuideMarks,
      };
    })
    .filter((dayItem) => {
      if (!hasActiveFilters) return true;
      return dayItem.items.length > 0;
    });

  const hasAnyVisibleWork =
    activeTrabajos.length > 0 || archivedTrabajos.length > 0;

  return {
    filteredTrabajos,
    activeTrabajos,
    archivedTrabajos,
    committedCount,
    doneCount,
    invoicedCount,
    archivedCount,
    daysWithData,
    hasAnyVisibleWork,
  } satisfies AgendaComputedData;
}

function findAcceptedInviteForLink(params: {
  link: LinkRow;
  invites: InviteRow[];
  inviteMap: Map<string, InviteRow>;
  currentUserId: string;
  currentUserEmail: string;
}) {
  const { link, invites, inviteMap, currentUserId, currentUserEmail } = params;

  if (link.created_from_invite_id) {
    const inviteFromId = inviteMap.get(link.created_from_invite_id);
    if (inviteFromId) {
      return inviteFromId;
    }
  }

  const otherUserId =
    link.user_a_id === currentUserId ? link.user_b_id : link.user_a_id;

  const normalizedCurrentEmail = normalizeText(currentUserEmail);

  return (
    invites.find((invite) => {
      if (invite.status !== "accepted") {
        return false;
      }

      const matchesPairByUserIds =
        (invite.inviter_user_id === currentUserId &&
          invite.invitee_user_id === otherUserId) ||
        (invite.inviter_user_id === otherUserId &&
          invite.invitee_user_id === currentUserId);

      if (matchesPairByUserIds) {
        return true;
      }

      const normalizedInviterEmail = normalizeText(invite.inviter_email ?? "");
      const normalizedInviteeEmail = normalizeText(invite.invitee_email);

      const currentUserMatchesInviteeEmail =
        normalizedInviteeEmail === normalizedCurrentEmail;

      const currentUserMatchesInviterEmail =
        normalizedInviterEmail === normalizedCurrentEmail;

      return (
        (invite.inviter_user_id === otherUserId &&
          currentUserMatchesInviteeEmail) ||
        (invite.invitee_user_id === otherUserId &&
          currentUserMatchesInviterEmail)
      );
    }) ?? null
  );
}

function getSharedAgendaLabel(params: {
  link: LinkRow;
  invite: InviteRow | null;
  currentUserId: string;
  currentUserEmail: string;
}) {
  const { link, invite, currentUserId, currentUserEmail } = params;
  const otherUserId =
    link.user_a_id === currentUserId ? link.user_b_id : link.user_a_id;

  if (!invite) {
    return {
      userId: otherUserId,
      label: "Agenda compartida",
    };
  }

  const normalizedCurrentEmail = normalizeText(currentUserEmail);
  const normalizedInviterEmail = normalizeText(invite.inviter_email ?? "");
  const normalizedInviteeEmail = normalizeText(invite.invitee_email);

  const aliasForInviter = (invite.alias_for_inviter ?? "").trim();
  const aliasForInvitee = (invite.alias_for_invitee ?? "").trim();

  const currentUserIsInviter =
    invite.inviter_user_id === currentUserId ||
    normalizedInviterEmail === normalizedCurrentEmail;

  const currentUserIsInvitee =
    invite.invitee_user_id === currentUserId ||
    normalizedInviteeEmail === normalizedCurrentEmail;

  if (currentUserIsInviter) {
    return {
      userId: otherUserId,
      label: aliasForInviter || invite.invitee_email || "Agenda compartida",
    };
  }

  if (currentUserIsInvitee) {
    return {
      userId: otherUserId,
      label: aliasForInvitee || invite.inviter_email || "Agenda compartida",
    };
  }

  return {
    userId: otherUserId,
    label:
      aliasForInviter ||
      aliasForInvitee ||
      invite.invitee_email ||
      invite.inviter_email ||
      "Agenda compartida",
  };
}

function buildSharedConnectionLinks(inviteId: string | null) {
  if (!inviteId) {
    return {
      editAliasHref: null,
      manageConnectionHref: "/compartir",
    };
  }

  return {
    editAliasHref: `/compartir?editAlias=${encodeURIComponent(
      inviteId
    )}#edit-shared-link-alias-form`,
    manageConnectionHref: "/compartir#edit-shared-link-alias-form",
  };
}

function renderSharedAgendaSection(params: {
  owner: AgendaOwner;
  data: AgendaComputedData;
  anchorDate: string;
  hasActiveFilters: boolean;
  backToOwnAgendaHref: string;
  errorMessage?: string | null;
}) {
  const { owner, data, hasActiveFilters, backToOwnAgendaHref, errorMessage } = params;

  return (
    <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
              Agenda compartida
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Solo lectura
            </span>
          </div>

          <h2 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Agenda de {owner.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Todo lo que ves debajo pertenece a esta agenda compartida. Aquí puedes
            consultarla, pero no editarla.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 xl:flex">
          {owner.editAliasHref ? (
            <Link
              href={owner.editAliasHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 xl:w-auto"
            >
              Editar alias
            </Link>
          ) : null}

          <Link
            href={owner.manageConnectionHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 xl:w-auto"
          >
            Gestionar conexión
          </Link>

          <Link
            href={backToOwnAgendaHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 xl:w-auto"
          >
            Volver a mi agenda
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
          {errorMessage}
        </div>
      ) : !data.hasAnyVisibleWork ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600">
          No hay trabajos visibles en esta agenda para los filtros actuales.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {renderSummaryCard({
              title: "Comprometidos",
              value: data.committedCount,
              subtitle: "Trabajos comprometidos en la fecha visible.",
              valueClasses: "text-red-700",
              cardClasses: "border-red-200 bg-white/88",
            })}

            {renderSummaryCard({
              title: "Hechos",
              value: data.doneCount,
              subtitle: "Trabajos hechos en la fecha visible.",
              valueClasses: "text-sky-700",
              cardClasses: "border-sky-200 bg-white/88",
            })}

            {renderSummaryCard({
              title: "Facturados",
              value: data.invoicedCount,
              subtitle: "Facturados visibles en esta agenda.",
              valueClasses: "text-indigo-700",
              cardClasses: "border-indigo-200 bg-white/88",
            })}

            {renderSummaryCard({
              title: "Archivados",
              value: data.archivedCount,
              subtitle: "Guardados fuera de producción.",
              valueClasses: "text-slate-700",
              cardClasses: "border-slate-300 bg-white/88",
            })}
          </div>

          <div className="mt-6 grid gap-5">
            {data.daysWithData.map((dayItem) => (
              <section
                id={`shared-${owner.userId}-day-${dayItem.date}`}
                key={`${owner.userId}-${dayItem.date}`}
                className={`scroll-mt-24 overflow-hidden rounded-[2rem] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6 ${getDaySectionClasses(
                  dayItem.isSunday
                )}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-900 sm:text-3xl">
                        {dayItem.label}
                      </h3>

                      {dayItem.isNonWorkingDay ? (
                        <span className={getNonWorkingBadgeClasses()}>
                          Descanso
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
                      {dayItem.items.length === 0
                        ? "Sin trabajos visibles este día."
                        : `${dayItem.items.length} trabajo${
                            dayItem.items.length === 1 ? "" : "s"
                          } visible${dayItem.items.length === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 sm:text-base">
                    Solo lectura
                  </span>
                </div>

                {!dayItem.isNonWorkingDay && dayItem.items.length > 0 ? (
                  <div
                    className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                      dayItem.isSunday
                    )}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-800 sm:text-lg">
                          Vista vertical del día
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Solo lectura de la agenda compartida.
                        </p>
                      </div>

                      <div
                        className={`text-sm font-bold ${getOccupancyTextClasses(
                          dayItem.occupancyPercentage
                        )}`}
                      >
                        {dayItem.occupancyPercentage}% ocupado
                      </div>
                    </div>

                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${getOccupancyBarClasses(
                          dayItem.occupancyPercentage
                        )}`}
                        style={{
                          width: `${dayItem.occupancyPercentage}%`,
                        }}
                      />
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[94px_1fr]">
                      <div
                        className="relative hidden lg:block"
                        style={{
                          height: `${dayItem.timelineHeightPx}px`,
                        }}
                      >
                        {dayItem.displayTimelineMarks.map((mark) => {
                          const topPx =
                            (mark.offsetMinutes / dayItem.visibleWindowMinutes) *
                            dayItem.timelineHeightPx;

                          return (
                            <div
                              key={`shared-mark-${owner.userId}-${dayItem.date}-${mark.label}`}
                              className="absolute left-0 -translate-y-1/2"
                              style={{ top: `${topPx}px` }}
                            >
                              <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                                {mark.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-inner"
                        style={{
                          height: `${dayItem.timelineHeightPx}px`,
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={getTimelineCanvasStyle()}
                        />

                        {dayItem.timelineGuideMarks.map((mark) => {
                          const topPx =
                            (mark.offsetMinutes / dayItem.visibleWindowMinutes) *
                            dayItem.timelineHeightPx;

                          return (
                            <div
                              key={`shared-guide-${owner.userId}-${dayItem.date}-${mark.offsetMinutes}`}
                              className={getTimelineGridLineClasses(mark.major)}
                              style={{ top: `${topPx}px` }}
                            />
                          );
                        })}

                        {dayItem.displayTimelineGuideMarks.map((mark) => {
                          const topPx =
                            (mark.offsetMinutes / dayItem.visibleWindowMinutes) *
                            dayItem.timelineHeightPx;

                          return (
                            <div
                              key={`shared-guide-mobile-${owner.userId}-${dayItem.date}-${mark.offsetMinutes}`}
                              className="absolute left-3 top-0 lg:hidden"
                              style={{ top: `${topPx}px` }}
                            >
                              <span className="inline-flex -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                                {mark.label}
                              </span>
                            </div>
                          );
                        })}

                        {dayItem.blockingItems.map((trabajo) => {
                          const startMinutes = timeToMinutes(trabajo.start_time);
                          const endMinutes =
                            startMinutes +
                            Number(trabajo.duration_minutes || 0);

                          return (
                            <div
                              key={`shared-timeline-job-${owner.userId}-${trabajo.id}`}
                              className={`absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm sm:left-3 sm:right-3 sm:px-4 ${getTimelineJobClasses(
                                trabajo.status
                              )}`}
                              style={getTimelineBlockStyle({
                                startMinutes,
                                endMinutes,
                                visibleStartMinutes:
                                  dayItem.visibleDayStartMinutes,
                                visibleEndMinutes: dayItem.visibleDayEndMinutes,
                                timelineHeightPx: dayItem.timelineHeightPx,
                                minHeightPx: 38,
                              })}
                              title={`${trabajo.client_name}`}
                            >
                              <div className="flex h-full items-center justify-between gap-3 overflow-hidden whitespace-nowrap">
                                <div className="min-w-0 flex-1 truncate text-[14px] font-bold tabular-nums sm:text-base">
                                  <span className="font-black">
                                    {trabajo.client_name}
                                  </span>
                                  <span className="mx-2 opacity-50">·</span>
                                  <span>{formatTime(trabajo.start_time)}</span>
                                  <span className="mx-1.5 opacity-50">-</span>
                                  <span>
                                    {addMinutes(
                                      trabajo.start_time,
                                      trabajo.duration_minutes
                                    )}
                                  </span>
                                  <span className="mx-2 opacity-50">·</span>
                                  <span>
                                    {formatJobDurationLabel(
                                      trabajo.duration_minutes
                                    )}
                                  </span>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getTimelineStatusPillClasses(
                                    trabajo.status
                                  )}`}
                                >
                                  {getStatusLabel(trabajo.status)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {dayItem.items.length === 0 ? (
                  !hasActiveFilters ? (
                    dayItem.isNonWorkingDay ? null : (
                      <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600">
                        Sin trabajos visibles este día.
                      </div>
                    )
                  ) : null
                ) : (
                  <div className="mt-5 grid gap-3">
                    {dayItem.items.map((trabajo) =>
                      renderTrabajoCard(trabajo, {
                        readOnly: true,
                      })
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/86 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Archivados de {owner.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
                  Vista en solo lectura de los trabajos archivados.
                </p>
              </div>

              <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 sm:self-auto sm:text-base">
                {data.archivedTrabajos.length} archivado
                {data.archivedTrabajos.length === 1 ? "" : "s"}
              </span>
            </div>

            {data.archivedTrabajos.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600 sm:text-lg">
                No hay trabajos archivados visibles.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {data.archivedTrabajos.map((trabajo) =>
                  renderTrabajoCard(trabajo, {
                    readOnly: true,
                  })
                )}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const query = (resolvedSearchParams.q ?? "").trim();
  const status = (resolvedSearchParams.status ?? "").trim().toLowerCase();
  const day = (resolvedSearchParams.day ?? "").trim();
  const requestedDate = (resolvedSearchParams.date ?? "").trim();
  const requestedWeek = (resolvedSearchParams.week ?? "").trim();
  const requestedShared = (resolvedSearchParams.shared ?? "").trim();
  const hasActiveFilters = Boolean(query || status || day);

  const madridNow = getMadridNowParts();
  const todayInMadrid = madridNow.dateValue;
  const currentMinutesInMadrid = madridNow.hour * 60 + madridNow.minute;

  const agendaStartDateInMadrid = getAgendaStartDateInMadrid();

  const anchorDate = isValidDate(requestedWeek)
    ? requestedWeek
    : isValidDate(requestedDate)
      ? requestedDate
      : isValidDate(day)
        ? day
        : agendaStartDateInMadrid;

  const normalizedUserEmail = normalizeText(user.email);

  const { data: activeLinksData, error: activeLinksError } = await supabase
    .from("shared_agenda_links")
    .select("*")
    .eq("is_active", true)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  const activeLinks = ((activeLinksData as LinkRow[]) ?? []).filter(Boolean);

  const { data: inviteData, error: inviteError } =
    activeLinks.length === 0
      ? { data: [] as InviteRow[], error: null }
      : await supabase
          .from("shared_agenda_invites")
          .select("*")
          .eq("status", "accepted")
          .or(
            `inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id},invitee_email.eq.${normalizedUserEmail}`
          )
          .order("created_at", { ascending: false });

  const acceptedInvites = ((inviteData as InviteRow[]) ?? []).filter(Boolean);

  const inviteMap = new Map(
    acceptedInvites.map((invite) => [invite.id, invite])
  );

  const sharedOwners: AgendaOwner[] = activeLinks.map((link, index) => {
    const invite = findAcceptedInviteForLink({
      link,
      invites: acceptedInvites,
      inviteMap,
      currentUserId: user.id,
      currentUserEmail: normalizedUserEmail,
    });

    const sharedInfo = getSharedAgendaLabel({
      link,
      invite,
      currentUserId: user.id,
      currentUserEmail: normalizedUserEmail,
    });

    const connectionLinks = buildSharedConnectionLinks(invite?.id ?? null);

    return {
      userId: sharedInfo.userId,
      label:
        sharedInfo.label === "Agenda compartida"
          ? `${sharedInfo.label} ${index + 1}`
          : sharedInfo.label,
      isOwn: false,
      readOnly: true,
      inviteId: invite?.id ?? null,
      editAliasHref: connectionLinks.editAliasHref,
      manageConnectionHref: connectionLinks.manageConnectionHref,
    };
  });

  const uniqueOwners = [
    {
      userId: user.id,
      label: "Mi agenda",
      isOwn: true,
      readOnly: false,
      inviteId: null,
      editAliasHref: null,
      manageConnectionHref: "/compartir",
    },
    ...sharedOwners.filter(
      (owner, index, arr) =>
        arr.findIndex((item) => item.userId === owner.userId) === index
    ),
  ];

  const selectedSharedUserId = sharedOwners.some(
    (owner) => owner.userId === requestedShared
  )
    ? requestedShared
    : "";

  const ownerIds = uniqueOwners.map((owner) => owner.userId);

  const { data: trabajosData, error } = await supabase
    .from("trabajos")
    .select("*")
    .in("user_id", ownerIds)
    .order("work_date", { ascending: true })
    .order("start_time", { ascending: true });

  const allTrabajos = ((trabajosData as Trabajo[]) ?? []).filter(Boolean);

  const trabajosByUser = new Map<string, Trabajo[]>();

  for (const owner of uniqueOwners) {
    trabajosByUser.set(owner.userId, []);
  }

  for (const trabajo of allTrabajos) {
    const ownerId = trabajo.user_id ?? "";
    if (!trabajosByUser.has(ownerId)) {
      trabajosByUser.set(ownerId, []);
    }
    trabajosByUser.get(ownerId)?.push(trabajo);
  }

  const previousWeekDate = addDaysToDateValue(anchorDate, -7);
  const nextWeekDate = addDaysToDateValue(anchorDate, 7);
  const todayWeekDate = todayInMadrid;

  const previousWeekHref = buildWeekNavigationHref({
    q: query,
    status,
    weekDate: previousWeekDate,
    shared: selectedSharedUserId,
  });

  const todayHref = buildWeekNavigationHref({
    q: query,
    status,
    weekDate: todayWeekDate,
    shared: selectedSharedUserId,
  });

  const nextWeekHref = buildWeekNavigationHref({
    q: query,
    status,
    weekDate: nextWeekDate,
    shared: selectedSharedUserId,
  });

  const currentWeekStart = getStartOfWeekDateValue(anchorDate);
  const todayWeekStart = getStartOfWeekDateValue(todayInMadrid);
  const isCurrentWeek = currentWeekStart === todayWeekStart;

  const days = buildWeekDays(anchorDate);
  const weekRangeLabel = formatWeekRangeLabel(days);

  const ownAgendaData = buildAgendaComputedData({
    trabajos: trabajosByUser.get(user.id) ?? [],
    query,
    status,
    day,
    anchorDate,
    todayInMadrid,
    currentMinutesInMadrid,
    days,
    hasActiveFilters,
  });

  const sharedAgendaData = uniqueOwners
    .filter((owner) => !owner.isOwn)
    .map((owner) => ({
      owner,
      data: buildAgendaComputedData({
        trabajos: trabajosByUser.get(owner.userId) ?? [],
        query,
        status,
        day,
        anchorDate,
        todayInMadrid,
        currentMinutesInMadrid,
        days,
        hasActiveFilters,
      }),
    }));

  const selectedSharedAgenda = selectedSharedUserId
    ? sharedAgendaData.find(
        (item) => item.owner.userId === selectedSharedUserId
      ) ?? null
    : null;

  const ownAgendaHref = buildOwnAgendaHref({
    q: query,
    status,
    day,
    weekDate: anchorDate,
  });

  const summaryDateLabel = day
    ? formatDateLabel(day)
    : anchorDate === todayInMadrid
      ? "Hoy"
      : formatDateLabel(anchorDate);

  return (
    <main className="min-h-screen bg-transparent px-4 py-4 text-slate-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <InternalTopbar />
        <AgendaAutoRefresh ownerIds={ownerIds} intervalMs={3000} />

        <div className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm ${
                  selectedSharedAgenda ? "text-sky-700" : "text-slate-500"
                }`}
              >
                {selectedSharedAgenda ? "Modo compartido" : "AutonomoAgenda"}
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {selectedSharedAgenda
                  ? `Agenda compartida de ${selectedSharedAgenda.owner.label}`
                  : "Tu agenda de trabajo"}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-lg">
                {selectedSharedAgenda
                  ? "Ahora mismo estás consultando una agenda ajena en solo lectura. Puedes revisar sus huecos, cambiar de agenda compartida o volver a la tuya cuando quieras."
                  : "Consulta de un vistazo tu semana de trabajo y revisa qué huecos libres te quedan para encajar trabajos."}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Semana visible: {weekRangeLabel}. Jornada provisional calculada
                de {WORK_DAY_START} a {WORK_DAY_END}.
              </p>

              {selectedSharedAgenda ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
                    Solo lectura
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    Visible ahora: {selectedSharedAgenda.owner.label}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    Tu agenda sigue abajo
                  </span>
                </div>
              ) : (
                <div
                  className={`mt-5 grid gap-3 ${
                    sharedOwners.length > 0 ? "md:grid-cols-2" : "md:grid-cols-1"
                  }`}
                >
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm">
                      Tu zona
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      Mi agenda · editable
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Aquí puedes crear trabajos, editar, cambiar estados y
                      moverte con total normalidad.
                    </p>
                  </div>

                  {sharedOwners.length > 0 ? (
                    <div className="rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 sm:text-sm">
                        Compartida
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        Agenda ajena · solo lectura
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        También puedes consultar{" "}
                        {sharedOwners.length === 1
                          ? "1 agenda compartida"
                          : `${sharedOwners.length} agendas compartidas`}{" "}
                        más abajo. No podrás editar la agenda del otro.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
              <span className="inline-flex items-center self-start rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm lg:self-auto">
                {weekRangeLabel}
              </span>

              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
                <Link
                  href={previousWeekHref}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Semana anterior
                </Link>

                <Link
                  href={todayHref}
                  className={`inline-flex min-h-[48px] items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    isCurrentWeek
                      ? "border-slate-900 bg-slate-900 !text-white"
                      : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-white"
                  }`}
                >
                  Hoy
                </Link>

                <Link
                  href={nextWeekHref}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Semana siguiente
                </Link>
              </div>
            </div>
          </div>
        </div>

        {selectedSharedAgenda ? (
          <section className="mt-5 rounded-[2rem] border border-sky-200/80 bg-sky-50/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
                    Conexión activa
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    Solo lectura
                  </span>
                </div>

                <h2 className="mt-3 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Agenda de {selectedSharedAgenda.owner.label}
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Estás dentro de una agenda ajena. Desde aquí puedes editar el alias,
                  gestionar la conexión o volver a tu agenda.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex">
                {selectedSharedAgenda.owner.editAliasHref ? (
                  <Link
                    href={selectedSharedAgenda.owner.editAliasHref}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 lg:w-auto"
                  >
                    Editar alias
                  </Link>
                ) : null}

                <Link
                  href={selectedSharedAgenda.owner.manageConnectionHref}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 lg:w-auto"
                >
                  Gestionar conexión
                </Link>

                <Link
                  href={ownAgendaHref}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 lg:w-auto"
                >
                  Volver a mi agenda
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {selectedSharedAgenda ? (
          <section className="mt-5 rounded-[1.75rem] border border-sky-200/80 bg-white/82 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Cambiar agenda compartida
                </p>
                <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                  Puedes cambiar de agenda sin bajar más
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Desde aquí puedes seguir en esta agenda ajena, abrir otra o salir de la vista compartida.
                </p>
              </div>

              <div id="agenda-compartida">
                <SharedAgendaSelector
                  options={sharedAgendaData.map(({ owner }) => ({
                    userId: owner.userId,
                    label: owner.label,
                  }))}
                  selectedUserId={selectedSharedAgenda.owner.userId}
                />
              </div>
            </div>
          </section>
        ) : null}

        {selectedSharedAgenda ? (
          <section className="mt-5 rounded-[1.75rem] border border-amber-200 bg-amber-50/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Edición desactivada
                </p>
                <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                  Estás viendo una agenda ajena
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Para crear trabajos o editar los tuyos, vuelve a tu agenda editable.
                </p>
              </div>

              <Link
                href={ownAgendaHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Ir a mi agenda
              </Link>
            </div>
          </section>
        ) : (
          <div id="mi-agenda-detalle" className="mt-5">
            <QuickAddJobForm />
          </div>
        )}

        <div className="mt-5 space-y-3">
          {selectedSharedAgenda ? (
            <section className="rounded-[1.75rem] border border-sky-200/80 bg-sky-50/90 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 sm:text-sm">
                      Filtros activos sobre la vista actual
                    </p>
                    <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                      Estás filtrando la agenda de {selectedSharedAgenda.owner.label}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      Los filtros de búsqueda, estado y día se aplican a toda esta
                      pantalla: la agenda compartida visible y también tu agenda
                      editable de abajo.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
                      Vista actual: {selectedSharedAgenda.owner.label}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                      Tu agenda también se filtra
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <Link
                    href={ownAgendaHref}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                  >
                    Salir del modo compartido
                  </Link>

                  <Link
                    href="#agenda-compartida"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 sm:w-auto"
                  >
                    Volver a la agenda ajena
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <AgendaFilters
            initialQuery={query}
            initialStatus={status}
            initialDay={day}
            initialWeek={anchorDate}
            initialShared={selectedSharedUserId}
            availableDays={days.map((item) => ({
              value: item.date,
              label: item.label,
            }))}
          />
        </div>

        {selectedSharedAgenda ? (
          <div key={`shared-priority-${selectedSharedAgenda.owner.userId}`}>
            {renderSharedAgendaSection({
              owner: selectedSharedAgenda.owner,
              data: selectedSharedAgenda.data,
              anchorDate,
              hasActiveFilters,
              backToOwnAgendaHref: ownAgendaHref,
            })}
          </div>
        ) : null}

        <section
          id="mi-agenda"
          className={`mt-5 rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 ${
            selectedSharedAgenda
              ? "border-slate-200 bg-slate-50/85"
              : "border-white/70 bg-white/82"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Mi agenda
                </h2>

                {selectedSharedAgenda ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    Zona editable debajo
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tu zona de trabajo completa, con edición y acciones.
              </p>

              {selectedSharedAgenda ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Estás en modo compartido, pero tu agenda sigue disponible aquí
                  debajo para cuando quieras volver a trabajar sobre la tuya.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedSharedAgenda ? (
                <Link
                  href="#agenda-compartida"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Volver arriba
                </Link>
              ) : null}

              <span className="inline-flex items-center self-start rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 sm:self-auto">
                Editable
              </span>
            </div>
          </div>

          {selectedSharedAgenda ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Zona editable
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    Tu agenda sigue disponible más abajo
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Mientras estás viendo una agenda ajena, tu zona editable queda
                    en segundo plano. Baja para crear, editar o cambiar estados en
                    tu propia agenda.
                  </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                  <Link
                    href="#mi-agenda"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Ir a mi agenda
                  </Link>

                  <Link
                    href="#agenda-compartida"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                  >
                    Volver a la compartida
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {renderSummaryCard({
                title: `${summaryDateLabel} · Comprometidos`,
                value: ownAgendaData.committedCount,
                subtitle: "Trabajos ya encajados en agenda.",
                valueClasses: "text-red-700",
                cardClasses: "border-red-200 bg-white/88",
              })}

              {renderSummaryCard({
                title: `${summaryDateLabel} · Hechos`,
                value: ownAgendaData.doneCount,
                subtitle: "Trabajos realizados pendientes de cerrar.",
                valueClasses: "text-sky-700",
                cardClasses: "border-sky-200 bg-white/88",
              })}

              {renderSummaryCard({
                title: "Facturados",
                value: ownAgendaData.invoicedCount,
                subtitle: "Pendientes de archivar.",
                valueClasses: "text-indigo-700",
                cardClasses: "border-indigo-200 bg-white/88",
              })}

              {renderSummaryCard({
                title: "Archivados",
                value: ownAgendaData.archivedCount,
                subtitle: "Guardados fuera de producción.",
                valueClasses: "text-slate-700",
                cardClasses: "border-slate-300 bg-white/88",
              })}
            </div>
          )}
        </section>

        {!hasActiveFilters && !error && !selectedSharedAgenda ? (
          <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Semana en un vistazo
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Para detectar rápido qué día conviene aprovechar dentro de esa
                  semana.
                </p>
              </div>

              <span className="inline-flex items-center self-start rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:self-auto">
                {weekRangeLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              {ownAgendaData.daysWithData.map((dayItem) => (
                <a
                  key={`compact-${dayItem.date}`}
                  href={`#day-${dayItem.date}`}
                  className={`min-w-0 overflow-hidden rounded-3xl border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-md ${getCompactDayCardClasses(
                    {
                      percentage: dayItem.occupancyPercentage,
                      hasActualFreeTime: dayItem.hasActualFreeTime,
                      hasUsableGaps: dayItem.hasUsableGaps,
                      isSunday: dayItem.isSunday,
                      isNonWorking: dayItem.isNonWorkingDay,
                    }
                  )}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {dayItem.compactWeekday}
                      </p>
                      <p className="mt-1 text-lg font-black leading-none text-slate-900">
                        {dayItem.compactDayNumber}
                      </p>
                    </div>

                    <span
                      className={getCompactDayBadgeClasses({
                        isNonWorking: dayItem.isNonWorkingDay,
                        hasActualFreeTime: dayItem.hasActualFreeTime,
                        hasUsableGaps: dayItem.hasUsableGaps,
                      })}
                    >
                      {getCompactDayBadgeLabel({
                        isNonWorking: dayItem.isNonWorkingDay,
                        hasActualFreeTime: dayItem.hasActualFreeTime,
                        hasUsableGaps: dayItem.hasUsableGaps,
                      })}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-2xl font-black leading-none text-slate-900">
                      {dayItem.items.length}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {dayItem.items.length === 1 ? "trabajo" : "trabajos"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          dayItem.isNonWorkingDay
                            ? "bg-rose-400"
                            : getOccupancyBarClasses(dayItem.occupancyPercentage)
                        }`}
                        style={{
                          width: `${
                            dayItem.isNonWorkingDay
                              ? 100
                              : dayItem.occupancyPercentage
                          }%`,
                        }}
                      />
                    </div>

                    <p
                      className={`mt-2 text-sm font-bold ${
                        dayItem.isNonWorkingDay
                          ? "text-rose-700"
                          : getOccupancyTextClasses(dayItem.occupancyPercentage)
                      }`}
                    >
                      {dayItem.isNonWorkingDay
                        ? "Día no laborable"
                        : `${dayItem.occupancyPercentage}% ocupado`}
                    </p>
                  </div>

                  {dayItem.isNonWorkingDay ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-white/70 px-3 py-3 text-sm text-rose-700">
                      Sin huecos automáticos.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-2">
                        <span>Libre</span>
                        <span className="font-bold text-slate-800">
                          {formatGapLabel(dayItem.totalFreeMinutes)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span>Primera</span>
                        <span className="font-bold text-slate-800">
                          {dayItem.firstFreeTime ?? "--:--"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span>Hueco top</span>
                        <span className="font-bold text-slate-800">
                          {dayItem.longestGap
                            ? formatGapLabel(dayItem.longestGap.minutes)
                            : "0 min"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Comprometidos: {dayItem.committedItemsCount}
                    </span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      Hechos: {dayItem.doneItemsCount}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-5">
          {selectedSharedAgenda ? (
            <details
              id="mi-agenda-detalle"
              className="group rounded-[2rem] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Mi agenda editable
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
                    Abrir mi zona de trabajo
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Úsalo solo cuando quieras volver a crear, editar o cambiar estados
                    en tu propia agenda.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    Editable
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 transition group-open:hidden">
                    Tocar para abrir
                  </span>
                  <span className="hidden items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 group-open:inline-flex">
                    Zona abierta
                  </span>
                </div>
              </summary>

              <div className="mt-5">
          {error ? (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-base text-red-700 shadow-sm">
              Error al cargar trabajos: {error.message}
            </div>
          ) : !ownAgendaData.hasAnyVisibleWork ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/82 p-6 text-base text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              No hay trabajos que coincidan con los filtros actuales.
            </div>
          ) : (
            <>
              <div className="grid gap-5">
                {ownAgendaData.daysWithData.map((dayItem) => (
                  <section
                    id={`day-${dayItem.date}`}
                    key={dayItem.date}
                    className={`scroll-mt-24 overflow-hidden rounded-[2rem] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6 ${getDaySectionClasses(
                      dayItem.isSunday
                    )}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900 sm:text-3xl">
                            {dayItem.label}
                          </h2>

                          {dayItem.isNonWorkingDay ? (
                            <span className={getNonWorkingBadgeClasses()}>
                              Descanso
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
                          {dayItem.isNonWorkingDay
                            ? dayItem.items.length > 0
                              ? `Día de descanso. Hay ${dayItem.items.length} trabajo${
                                  dayItem.items.length === 1 ? "" : "s"
                                } guardado${
                                  dayItem.items.length === 1 ? "" : "s"
                                } manualmente.`
                              : "Día de descanso sin trabajos en agenda."
                            : hasActiveFilters
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
                        className={`inline-flex shrink-0 items-center self-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold sm:self-auto sm:text-base ${
                          dayItem.isNonWorkingDay
                            ? "bg-rose-100 text-rose-700"
                            : hasActiveFilters
                              ? "bg-slate-100 text-slate-700"
                              : dayItem.hasUsableGaps
                                ? "bg-emerald-50 text-emerald-700"
                                : dayItem.hasActualFreeTime
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                        }`}
                      >
                        {dayItem.isNonWorkingDay
                          ? "Descanso"
                          : hasActiveFilters
                            ? `${dayItem.items.length} resultado${
                                dayItem.items.length === 1 ? "" : "s"
                              }`
                            : dayItem.hasUsableGaps
                              ? "Con huecos"
                              : dayItem.hasActualFreeTime
                                ? "Libre corto"
                                : "Completo"}
                      </span>
                    </div>

                    {!hasActiveFilters ? (
                      <>
                        {dayItem.isNonWorkingDay ? (
                          <div className="mt-5">
                            <div className={getRestPanelClasses()}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-lg font-bold text-rose-800 sm:text-xl">
                                    Descanso semanal
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-rose-700 sm:text-base">
                                    Este día queda cerrado por descanso. No se
                                    generan huecos automáticos ni disponibilidad
                                    sugerida.
                                  </p>

                                  {dayItem.items.length > 0 ? (
                                    <p className="mt-3 text-sm font-medium leading-6 text-rose-800">
                                      Los trabajos que ya hayas guardado para
                                      este día se siguen mostrando abajo.
                                    </p>
                                  ) : null}
                                </div>

                                <span className="inline-flex shrink-0 items-center self-start whitespace-nowrap rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 sm:self-auto">
                                  No laborable
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                                dayItem.isSunday
                              )}`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                  <p className="text-base font-bold text-slate-800 sm:text-lg">
                                    Agenda visual del día
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Vista vertical tipo calendario para detectar
                                    rápido bloques ocupados y huecos reales.
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
                                    Comprometido
                                  </span>
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                                    Hecho
                                  </span>
                                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                                    Facturado
                                  </span>
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-emerald-700">
                                    Hueco libre
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Trabajos en agenda
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.blockingItems.length}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Bloques que ocupan tiempo real.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ventana visible
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.visibleWindowMinutes)}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Desde{" "}
                                    {minutesToTime(dayItem.visibleDayStartMinutes)}
                                    .
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Primera libre
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.firstFreeTime ?? "--:--"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Primer momento desde el que todavía puedes
                                    encajar.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Hueco más largo
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.longestGap
                                      ? formatGapLabel(dayItem.longestGap.minutes)
                                      : "0 min"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    {dayItem.longestGap
                                      ? `${dayItem.longestGap.start} - ${dayItem.longestGap.end}`
                                      : "Sin hueco suficiente"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                                Visible desde{" "}
                                {minutesToTime(dayItem.visibleDayStartMinutes)}{" "}
                                hasta{" "}
                                {minutesToTime(dayItem.visibleDayEndMinutes)}
                              </div>

                              <div className="mt-5 grid gap-4 lg:grid-cols-[94px_1fr]">
                                <div
                                  className="relative hidden lg:block"
                                  style={{
                                    height: `${dayItem.timelineHeightPx}px`,
                                  }}
                                >
                                  {dayItem.displayTimelineMarks.map((mark) => {
                                    const topPx =
                                      (mark.offsetMinutes /
                                        dayItem.visibleWindowMinutes) *
                                      dayItem.timelineHeightPx;

                                    return (
                                      <div
                                        key={`mark-label-${dayItem.date}-${mark.label}`}
                                        className="absolute left-0 -translate-y-1/2"
                                        style={{ top: `${topPx}px` }}
                                      >
                                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                                          {mark.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div
                                  className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-inner"
                                  style={{
                                    height: `${dayItem.timelineHeightPx}px`,
                                  }}
                                >
                                  <div
                                    className="absolute inset-0"
                                    style={getTimelineCanvasStyle()}
                                  />

                                  {dayItem.timelineGuideMarks.map((mark) => {
                                    const topPx =
                                      (mark.offsetMinutes /
                                        dayItem.visibleWindowMinutes) *
                                      dayItem.timelineHeightPx;

                                    return (
                                      <div
                                        key={`guide-${dayItem.date}-${mark.offsetMinutes}`}
                                        className={getTimelineGridLineClasses(
                                          mark.major
                                        )}
                                        style={{ top: `${topPx}px` }}
                                      />
                                    );
                                  })}

                                  {dayItem.displayTimelineGuideMarks.map(
                                    (mark) => {
                                      const topPx =
                                        (mark.offsetMinutes /
                                          dayItem.visibleWindowMinutes) *
                                        dayItem.timelineHeightPx;

                                      return (
                                        <div
                                          key={`guide-mobile-${dayItem.date}-${mark.offsetMinutes}`}
                                          className="absolute left-3 top-0 lg:hidden"
                                          style={{ top: `${topPx}px` }}
                                        >
                                          <span className="inline-flex -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                                            {mark.label}
                                          </span>
                                        </div>
                                      );
                                    }
                                  )}

                                  {dayItem.actualFreeBlocks.map((gap) => {
                                    const gapStartMinutes = timeToMinutes(
                                      gap.start
                                    );
                                    const gapEndMinutes = timeToMinutes(gap.end);
                                    const suggestedDuration =
                                      getSuggestedDurationForGap(gap.minutes);
                                    const isUsable =
                                      gap.minutes >= MIN_GAP_MINUTES;

                                    if (isUsable) {
                                      return (
                                        <Link
                                          key={`timeline-gap-${dayItem.date}-${gap.start}-${gap.end}`}
                                          href={buildQuickAddHref(
                                            dayItem.date,
                                            gap.start,
                                            suggestedDuration,
                                            selectedSharedUserId
                                          )}
                                          className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm sm:left-3 sm:right-3 sm:px-4"
                                          style={getTimelineGapBlockStyle({
                                            startMinutes: gapStartMinutes,
                                            endMinutes: gapEndMinutes,
                                            visibleStartMinutes:
                                              dayItem.visibleDayStartMinutes,
                                            visibleEndMinutes:
                                              dayItem.visibleDayEndMinutes,
                                            timelineHeightPx:
                                              dayItem.timelineHeightPx,
                                          })}
                                          title={`Crear trabajo el ${dayItem.label} a las ${gap.start}`}
                                        >
                                          <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                                            <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                                              <span className="font-black uppercase tracking-wide text-emerald-700">
                                                Hueco libre
                                              </span>
                                              <span className="mx-2 text-emerald-500">
                                                ·
                                              </span>
                                              <span>{gap.start}</span>
                                              <span className="mx-1.5 text-emerald-500">
                                                -
                                              </span>
                                              <span>{gap.end}</span>
                                              <span className="mx-2 text-emerald-500">
                                                ·
                                              </span>
                                              <span>
                                                {formatGapLabel(gap.minutes)}
                                              </span>
                                            </div>
                                          </div>
                                        </Link>
                                      );
                                    }

                                    return (
                                      <div
                                        key={`timeline-short-gap-${dayItem.date}-${gap.start}-${gap.end}`}
                                        className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 sm:left-3 sm:right-3 sm:px-4"
                                        style={getTimelineGapBlockStyle({
                                          startMinutes: gapStartMinutes,
                                          endMinutes: gapEndMinutes,
                                          visibleStartMinutes:
                                            dayItem.visibleDayStartMinutes,
                                          visibleEndMinutes:
                                            dayItem.visibleDayEndMinutes,
                                          timelineHeightPx:
                                            dayItem.timelineHeightPx,
                                        })}
                                        title={`Tramo libre corto: ${gap.start} - ${gap.end}`}
                                      >
                                        <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                                          <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                                            <span className="font-black uppercase tracking-wide text-emerald-700">
                                              Libre corto
                                            </span>
                                            <span className="mx-2 text-emerald-500">
                                              ·
                                            </span>
                                            <span>{gap.start}</span>
                                            <span className="mx-1.5 text-emerald-500">
                                              -
                                            </span>
                                            <span>{gap.end}</span>
                                            <span className="mx-2 text-emerald-500">
                                              ·
                                            </span>
                                            <span>
                                              {formatGapLabel(gap.minutes)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {dayItem.blockingItems.map((trabajo) => {
                                    const startMinutes = timeToMinutes(
                                      trabajo.start_time
                                    );
                                    const endMinutes =
                                      startMinutes +
                                      Number(trabajo.duration_minutes || 0);

                                    return (
                                      <Link
                                        key={`timeline-job-${trabajo.id}`}
                                        href={buildTrabajoHref(
                                          trabajo.id,
                                          anchorDate,
                                          selectedSharedUserId
                                        )}
                                        className={`absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm transition hover:shadow-md sm:left-3 sm:right-3 sm:px-4 ${getTimelineJobClasses(
                                          trabajo.status
                                        )}`}
                                        style={getTimelineBlockStyle({
                                          startMinutes,
                                          endMinutes,
                                          visibleStartMinutes:
                                            dayItem.visibleDayStartMinutes,
                                          visibleEndMinutes:
                                            dayItem.visibleDayEndMinutes,
                                          timelineHeightPx:
                                            dayItem.timelineHeightPx,
                                          minHeightPx: 38,
                                        })}
                                        title={`Editar trabajo de ${trabajo.client_name}`}
                                      >
                                        <div className="flex h-full items-center justify-between gap-3 overflow-hidden whitespace-nowrap">
                                          <div className="min-w-0 flex-1 truncate text-[14px] font-bold tabular-nums sm:text-base">
                                            <span className="font-black">
                                              {trabajo.client_name}
                                            </span>
                                            <span className="mx-2 opacity-50">
                                              ·
                                            </span>
                                            <span>
                                              {formatTime(trabajo.start_time)}
                                            </span>
                                            <span className="mx-1.5 opacity-50">
                                              -
                                            </span>
                                            <span>
                                              {addMinutes(
                                                trabajo.start_time,
                                                trabajo.duration_minutes
                                              )}
                                            </span>
                                            <span className="mx-2 opacity-50">
                                              ·
                                            </span>
                                            <span>
                                              {formatJobDurationLabel(
                                                trabajo.duration_minutes
                                              )}
                                            </span>
                                          </div>

                                          <span
                                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getTimelineStatusPillClasses(
                                              trabajo.status
                                            )}`}
                                          >
                                            {getStatusLabel(trabajo.status)}
                                          </span>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div
                              className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                                dayItem.isSunday
                              )}`}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-base font-bold text-slate-800 sm:text-lg">
                                    Ocupación visual del día
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Para ver rápido si todavía compensa encajar
                                    algo.
                                  </p>
                                </div>

                                <div
                                  className={`text-sm font-bold ${getOccupancyTextClasses(
                                    dayItem.occupancyPercentage
                                  )}`}
                                >
                                  {dayItem.occupancyPercentage}% ocupado
                                </div>
                              </div>

                              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${getOccupancyBarClasses(
                                    dayItem.occupancyPercentage
                                  )}`}
                                  style={{
                                    width: `${dayItem.occupancyPercentage}%`,
                                  }}
                                />
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ocupado
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.busyMinutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Libre
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.totalFreeMinutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ventana restante
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.visibleWindowMinutes)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                                dayItem.isSunday
                              )}`}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-base font-bold text-slate-800 sm:text-lg">
                                    Huecos libres
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Pulsa en uno y baja con el formulario
                                    preparado.
                                  </p>
                                </div>

                                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                                  Sugerencia por defecto:{" "}
                                  {QUICK_ADD_DEFAULT_DURATION} min
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Horas libres
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.totalFreeMinutes)}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Tiempo disponible real que queda ese día.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Primera hora libre
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.firstFreeTime ?? "--:--"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Primer momento desde el que todavía puedes
                                    encajar.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Hueco más largo
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.longestGap
                                      ? formatGapLabel(
                                          dayItem.longestGap.minutes
                                        )
                                      : "0 min"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    {dayItem.longestGap
                                      ? `${dayItem.longestGap.start} - ${dayItem.longestGap.end}`
                                      : "Sin huecos suficientes"}
                                  </p>
                                </div>
                              </div>

                              {dayItem.usableGaps.length === 0 ? (
                                dayItem.hasActualFreeTime ? (
                                  <p className="mt-4 text-lg font-bold text-emerald-700 sm:text-xl">
                                    Queda tiempo libre, pero ningún tramo llega
                                    a {MIN_GAP_MINUTES} minutos.
                                  </p>
                                ) : (
                                  <p className="mt-4 text-lg font-bold text-red-700 sm:text-xl">
                                    No quedan huecos de al menos{" "}
                                    {MIN_GAP_MINUTES} minutos.
                                  </p>
                                )
                              ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  {dayItem.usableGaps.map((gap) => {
                                    const suggestedDuration =
                                      getSuggestedDurationForGap(gap.minutes);

                                    return (
                                      <Link
                                        key={`${dayItem.date}-${gap.start}-${gap.end}`}
                                        href={buildQuickAddHref(
                                          dayItem.date,
                                          gap.start,
                                          suggestedDuration,
                                          selectedSharedUserId
                                        )}
                                        className="group min-w-0 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                                              Hueco disponible
                                            </p>
                                            <p className="mt-2 text-2xl font-black leading-none text-slate-900 sm:text-[2rem]">
                                              {gap.start} - {gap.end}
                                            </p>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                                              Espacio libre de{" "}
                                              {formatGapLabel(gap.minutes)}
                                            </p>
                                          </div>

                                          <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                            {formatGapLabel(gap.minutes)}
                                          </span>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="text-sm leading-6 text-slate-500">
                                            Se propone empezar a las{" "}
                                            <span className="font-bold text-slate-700">
                                              {gap.start}
                                            </span>{" "}
                                            con{" "}
                                            <span className="font-bold text-slate-700">
                                              {suggestedDuration} min
                                            </span>
                                            .
                                          </div>

                                          <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-emerald-700">
                                            Encajar aquí
                                          </span>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : null}

                    {dayItem.items.length === 0 ? (
                      !hasActiveFilters ? (
                        dayItem.isNonWorkingDay ? null : (
                          <div className="mt-5 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 px-5 py-4 text-base font-semibold text-emerald-700 sm:text-lg">
                            No tienes nada apuntado este día.
                          </div>
                        )
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

              {selectedSharedAgenda ? (
                <section className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                          Archivados de mi agenda
                        </h2>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                          Segundo plano
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                        Mientras estás en modo compartido, tus archivados quedan fuera
                        de foco para no competir con la agenda ajena.
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                      <Link
                        href={ownAgendaHref}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Salir del modo compartido
                      </Link>

                      <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
                        {ownAgendaData.archivedTrabajos.length} archivado
                        {ownAgendaData.archivedTrabajos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                        Trabajos archivados
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
                        Aquí quedan guardados hasta que el autónomo decida
                        eliminarlos definitivamente.
                      </p>
                    </div>

                    <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 sm:self-auto sm:text-base">
                      {ownAgendaData.archivedTrabajos.length} archivado
                      {ownAgendaData.archivedTrabajos.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {ownAgendaData.archivedTrabajos.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600 sm:text-lg">
                      No hay trabajos archivados.
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3">
                      {ownAgendaData.archivedTrabajos.map((trabajo) =>
                        renderTrabajoCard(trabajo)
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
              </div>
            </details>
          ) : (
            <>
          {error ? (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-base text-red-700 shadow-sm">
              Error al cargar trabajos: {error.message}
            </div>
          ) : !ownAgendaData.hasAnyVisibleWork ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/82 p-6 text-base text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              No hay trabajos que coincidan con los filtros actuales.
            </div>
          ) : (
            <>
              <div className="grid gap-5">
                {ownAgendaData.daysWithData.map((dayItem) => (
                  <section
                    id={`day-${dayItem.date}`}
                    key={dayItem.date}
                    className={`scroll-mt-24 overflow-hidden rounded-[2rem] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6 ${getDaySectionClasses(
                      dayItem.isSunday
                    )}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900 sm:text-3xl">
                            {dayItem.label}
                          </h2>

                          {dayItem.isNonWorkingDay ? (
                            <span className={getNonWorkingBadgeClasses()}>
                              Descanso
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
                          {dayItem.isNonWorkingDay
                            ? dayItem.items.length > 0
                              ? `Día de descanso. Hay ${dayItem.items.length} trabajo${
                                  dayItem.items.length === 1 ? "" : "s"
                                } guardado${
                                  dayItem.items.length === 1 ? "" : "s"
                                } manualmente.`
                              : "Día de descanso sin trabajos en agenda."
                            : hasActiveFilters
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
                        className={`inline-flex shrink-0 items-center self-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold sm:self-auto sm:text-base ${
                          dayItem.isNonWorkingDay
                            ? "bg-rose-100 text-rose-700"
                            : hasActiveFilters
                              ? "bg-slate-100 text-slate-700"
                              : dayItem.hasUsableGaps
                                ? "bg-emerald-50 text-emerald-700"
                                : dayItem.hasActualFreeTime
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                        }`}
                      >
                        {dayItem.isNonWorkingDay
                          ? "Descanso"
                          : hasActiveFilters
                            ? `${dayItem.items.length} resultado${
                                dayItem.items.length === 1 ? "" : "s"
                              }`
                            : dayItem.hasUsableGaps
                              ? "Con huecos"
                              : dayItem.hasActualFreeTime
                                ? "Libre corto"
                                : "Completo"}
                      </span>
                    </div>

                    {!hasActiveFilters ? (
                      <>
                        {dayItem.isNonWorkingDay ? (
                          <div className="mt-5">
                            <div className={getRestPanelClasses()}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-lg font-bold text-rose-800 sm:text-xl">
                                    Descanso semanal
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-rose-700 sm:text-base">
                                    Este día queda cerrado por descanso. No se
                                    generan huecos automáticos ni disponibilidad
                                    sugerida.
                                  </p>

                                  {dayItem.items.length > 0 ? (
                                    <p className="mt-3 text-sm font-medium leading-6 text-rose-800">
                                      Los trabajos que ya hayas guardado para
                                      este día se siguen mostrando abajo.
                                    </p>
                                  ) : null}
                                </div>

                                <span className="inline-flex shrink-0 items-center self-start whitespace-nowrap rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 sm:self-auto">
                                  No laborable
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                                dayItem.isSunday
                              )}`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                  <p className="text-base font-bold text-slate-800 sm:text-lg">
                                    Agenda visual del día
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Vista vertical tipo calendario para detectar
                                    rápido bloques ocupados y huecos reales.
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
                                    Comprometido
                                  </span>
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                                    Hecho
                                  </span>
                                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                                    Facturado
                                  </span>
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-emerald-700">
                                    Hueco libre
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Trabajos en agenda
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.blockingItems.length}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Bloques que ocupan tiempo real.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ventana visible
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.visibleWindowMinutes)}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Desde{" "}
                                    {minutesToTime(dayItem.visibleDayStartMinutes)}
                                    .
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Primera libre
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.firstFreeTime ?? "--:--"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Primer momento desde el que todavía puedes
                                    encajar.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Hueco más largo
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.longestGap
                                      ? formatGapLabel(dayItem.longestGap.minutes)
                                      : "0 min"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    {dayItem.longestGap
                                      ? `${dayItem.longestGap.start} - ${dayItem.longestGap.end}`
                                      : "Sin hueco suficiente"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                                Visible desde{" "}
                                {minutesToTime(dayItem.visibleDayStartMinutes)}{" "}
                                hasta{" "}
                                {minutesToTime(dayItem.visibleDayEndMinutes)}
                              </div>

                              <div className="mt-5 grid gap-4 lg:grid-cols-[94px_1fr]">
                                <div
                                  className="relative hidden lg:block"
                                  style={{
                                    height: `${dayItem.timelineHeightPx}px`,
                                  }}
                                >
                                  {dayItem.displayTimelineMarks.map((mark) => {
                                    const topPx =
                                      (mark.offsetMinutes /
                                        dayItem.visibleWindowMinutes) *
                                      dayItem.timelineHeightPx;

                                    return (
                                      <div
                                        key={`mark-label-${dayItem.date}-${mark.label}`}
                                        className="absolute left-0 -translate-y-1/2"
                                        style={{ top: `${topPx}px` }}
                                      >
                                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                                          {mark.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div
                                  className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-inner"
                                  style={{
                                    height: `${dayItem.timelineHeightPx}px`,
                                  }}
                                >
                                  <div
                                    className="absolute inset-0"
                                    style={getTimelineCanvasStyle()}
                                  />

                                  {dayItem.timelineGuideMarks.map((mark) => {
                                    const topPx =
                                      (mark.offsetMinutes /
                                        dayItem.visibleWindowMinutes) *
                                      dayItem.timelineHeightPx;

                                    return (
                                      <div
                                        key={`guide-${dayItem.date}-${mark.offsetMinutes}`}
                                        className={getTimelineGridLineClasses(
                                          mark.major
                                        )}
                                        style={{ top: `${topPx}px` }}
                                      />
                                    );
                                  })}

                                  {dayItem.displayTimelineGuideMarks.map(
                                    (mark) => {
                                      const topPx =
                                        (mark.offsetMinutes /
                                          dayItem.visibleWindowMinutes) *
                                        dayItem.timelineHeightPx;

                                      return (
                                        <div
                                          key={`guide-mobile-${dayItem.date}-${mark.offsetMinutes}`}
                                          className="absolute left-3 top-0 lg:hidden"
                                          style={{ top: `${topPx}px` }}
                                        >
                                          <span className="inline-flex -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                                            {mark.label}
                                          </span>
                                        </div>
                                      );
                                    }
                                  )}

                                  {dayItem.actualFreeBlocks.map((gap) => {
                                    const gapStartMinutes = timeToMinutes(
                                      gap.start
                                    );
                                    const gapEndMinutes = timeToMinutes(gap.end);
                                    const suggestedDuration =
                                      getSuggestedDurationForGap(gap.minutes);
                                    const isUsable =
                                      gap.minutes >= MIN_GAP_MINUTES;

                                    if (isUsable) {
                                      return (
                                        <Link
                                          key={`timeline-gap-${dayItem.date}-${gap.start}-${gap.end}`}
                                          href={buildQuickAddHref(
                                            dayItem.date,
                                            gap.start,
                                            suggestedDuration,
                                            selectedSharedUserId
                                          )}
                                          className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm sm:left-3 sm:right-3 sm:px-4"
                                          style={getTimelineGapBlockStyle({
                                            startMinutes: gapStartMinutes,
                                            endMinutes: gapEndMinutes,
                                            visibleStartMinutes:
                                              dayItem.visibleDayStartMinutes,
                                            visibleEndMinutes:
                                              dayItem.visibleDayEndMinutes,
                                            timelineHeightPx:
                                              dayItem.timelineHeightPx,
                                          })}
                                          title={`Crear trabajo el ${dayItem.label} a las ${gap.start}`}
                                        >
                                          <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                                            <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                                              <span className="font-black uppercase tracking-wide text-emerald-700">
                                                Hueco libre
                                              </span>
                                              <span className="mx-2 text-emerald-500">
                                                ·
                                              </span>
                                              <span>{gap.start}</span>
                                              <span className="mx-1.5 text-emerald-500">
                                                -
                                              </span>
                                              <span>{gap.end}</span>
                                              <span className="mx-2 text-emerald-500">
                                                ·
                                              </span>
                                              <span>
                                                {formatGapLabel(gap.minutes)}
                                              </span>
                                            </div>
                                          </div>
                                        </Link>
                                      );
                                    }

                                    return (
                                      <div
                                        key={`timeline-short-gap-${dayItem.date}-${gap.start}-${gap.end}`}
                                        className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 sm:left-3 sm:right-3 sm:px-4"
                                        style={getTimelineGapBlockStyle({
                                          startMinutes: gapStartMinutes,
                                          endMinutes: gapEndMinutes,
                                          visibleStartMinutes:
                                            dayItem.visibleDayStartMinutes,
                                          visibleEndMinutes:
                                            dayItem.visibleDayEndMinutes,
                                          timelineHeightPx:
                                            dayItem.timelineHeightPx,
                                        })}
                                        title={`Tramo libre corto: ${gap.start} - ${gap.end}`}
                                      >
                                        <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                                          <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                                            <span className="font-black uppercase tracking-wide text-emerald-700">
                                              Libre corto
                                            </span>
                                            <span className="mx-2 text-emerald-500">
                                              ·
                                            </span>
                                            <span>{gap.start}</span>
                                            <span className="mx-1.5 text-emerald-500">
                                              -
                                            </span>
                                            <span>{gap.end}</span>
                                            <span className="mx-2 text-emerald-500">
                                              ·
                                            </span>
                                            <span>
                                              {formatGapLabel(gap.minutes)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {dayItem.blockingItems.map((trabajo) => {
                                    const startMinutes = timeToMinutes(
                                      trabajo.start_time
                                    );
                                    const endMinutes =
                                      startMinutes +
                                      Number(trabajo.duration_minutes || 0);

                                    return (
                                      <Link
                                        key={`timeline-job-${trabajo.id}`}
                                        href={buildTrabajoHref(
                                          trabajo.id,
                                          anchorDate,
                                          selectedSharedUserId
                                        )}
                                        className={`absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm transition hover:shadow-md sm:left-3 sm:right-3 sm:px-4 ${getTimelineJobClasses(
                                          trabajo.status
                                        )}`}
                                        style={getTimelineBlockStyle({
                                          startMinutes,
                                          endMinutes,
                                          visibleStartMinutes:
                                            dayItem.visibleDayStartMinutes,
                                          visibleEndMinutes:
                                            dayItem.visibleDayEndMinutes,
                                          timelineHeightPx:
                                            dayItem.timelineHeightPx,
                                          minHeightPx: 38,
                                        })}
                                        title={`Editar trabajo de ${trabajo.client_name}`}
                                      >
                                        <div className="flex h-full items-center justify-between gap-3 overflow-hidden whitespace-nowrap">
                                          <div className="min-w-0 flex-1 truncate text-[14px] font-bold tabular-nums sm:text-base">
                                            <span className="font-black">
                                              {trabajo.client_name}
                                            </span>
                                            <span className="mx-2 opacity-50">
                                              ·
                                            </span>
                                            <span>
                                              {formatTime(trabajo.start_time)}
                                            </span>
                                            <span className="mx-1.5 opacity-50">
                                              -
                                            </span>
                                            <span>
                                              {addMinutes(
                                                trabajo.start_time,
                                                trabajo.duration_minutes
                                              )}
                                            </span>
                                            <span className="mx-2 opacity-50">
                                              ·
                                            </span>
                                            <span>
                                              {formatJobDurationLabel(
                                                trabajo.duration_minutes
                                              )}
                                            </span>
                                          </div>

                                          <span
                                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getTimelineStatusPillClasses(
                                              trabajo.status
                                            )}`}
                                          >
                                            {getStatusLabel(trabajo.status)}
                                          </span>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div
                              className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                                dayItem.isSunday
                              )}`}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-base font-bold text-slate-800 sm:text-lg">
                                    Ocupación visual del día
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Para ver rápido si todavía compensa encajar
                                    algo.
                                  </p>
                                </div>

                                <div
                                  className={`text-sm font-bold ${getOccupancyTextClasses(
                                    dayItem.occupancyPercentage
                                  )}`}
                                >
                                  {dayItem.occupancyPercentage}% ocupado
                                </div>
                              </div>

                              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${getOccupancyBarClasses(
                                    dayItem.occupancyPercentage
                                  )}`}
                                  style={{
                                    width: `${dayItem.occupancyPercentage}%`,
                                  }}
                                />
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ocupado
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.busyMinutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Libre
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.totalFreeMinutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ventana restante
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.visibleWindowMinutes)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
                                dayItem.isSunday
                              )}`}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-base font-bold text-slate-800 sm:text-lg">
                                    Huecos libres
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Pulsa en uno y baja con el formulario
                                    preparado.
                                  </p>
                                </div>

                                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                                  Sugerencia por defecto:{" "}
                                  {QUICK_ADD_DEFAULT_DURATION} min
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Horas libres
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {formatGapLabel(dayItem.totalFreeMinutes)}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Tiempo disponible real que queda ese día.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Primera hora libre
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.firstFreeTime ?? "--:--"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Primer momento desde el que todavía puedes
                                    encajar.
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Hueco más largo
                                  </p>
                                  <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                                    {dayItem.longestGap
                                      ? formatGapLabel(
                                          dayItem.longestGap.minutes
                                        )
                                      : "0 min"}
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-slate-500">
                                    {dayItem.longestGap
                                      ? `${dayItem.longestGap.start} - ${dayItem.longestGap.end}`
                                      : "Sin huecos suficientes"}
                                  </p>
                                </div>
                              </div>

                              {dayItem.usableGaps.length === 0 ? (
                                dayItem.hasActualFreeTime ? (
                                  <p className="mt-4 text-lg font-bold text-emerald-700 sm:text-xl">
                                    Queda tiempo libre, pero ningún tramo llega
                                    a {MIN_GAP_MINUTES} minutos.
                                  </p>
                                ) : (
                                  <p className="mt-4 text-lg font-bold text-red-700 sm:text-xl">
                                    No quedan huecos de al menos{" "}
                                    {MIN_GAP_MINUTES} minutos.
                                  </p>
                                )
                              ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  {dayItem.usableGaps.map((gap) => {
                                    const suggestedDuration =
                                      getSuggestedDurationForGap(gap.minutes);

                                    return (
                                      <Link
                                        key={`${dayItem.date}-${gap.start}-${gap.end}`}
                                        href={buildQuickAddHref(
                                          dayItem.date,
                                          gap.start,
                                          suggestedDuration,
                                          selectedSharedUserId
                                        )}
                                        className="group min-w-0 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                                              Hueco disponible
                                            </p>
                                            <p className="mt-2 text-2xl font-black leading-none text-slate-900 sm:text-[2rem]">
                                              {gap.start} - {gap.end}
                                            </p>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                                              Espacio libre de{" "}
                                              {formatGapLabel(gap.minutes)}
                                            </p>
                                          </div>

                                          <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                            {formatGapLabel(gap.minutes)}
                                          </span>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="text-sm leading-6 text-slate-500">
                                            Se propone empezar a las{" "}
                                            <span className="font-bold text-slate-700">
                                              {gap.start}
                                            </span>{" "}
                                            con{" "}
                                            <span className="font-bold text-slate-700">
                                              {suggestedDuration} min
                                            </span>
                                            .
                                          </div>

                                          <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-emerald-700">
                                            Encajar aquí
                                          </span>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : null}

                    {dayItem.items.length === 0 ? (
                      !hasActiveFilters ? (
                        dayItem.isNonWorkingDay ? null : (
                          <div className="mt-5 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 px-5 py-4 text-base font-semibold text-emerald-700 sm:text-lg">
                            No tienes nada apuntado este día.
                          </div>
                        )
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

              {selectedSharedAgenda ? (
                <section className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                          Archivados de mi agenda
                        </h2>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                          Segundo plano
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                        Mientras estás en modo compartido, tus archivados quedan fuera
                        de foco para no competir con la agenda ajena.
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                      <Link
                        href={ownAgendaHref}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Salir del modo compartido
                      </Link>

                      <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
                        {ownAgendaData.archivedTrabajos.length} archivado
                        {ownAgendaData.archivedTrabajos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                        Trabajos archivados
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
                        Aquí quedan guardados hasta que el autónomo decida
                        eliminarlos definitivamente.
                      </p>
                    </div>

                    <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 sm:self-auto sm:text-base">
                      {ownAgendaData.archivedTrabajos.length} archivado
                      {ownAgendaData.archivedTrabajos.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {ownAgendaData.archivedTrabajos.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600 sm:text-lg">
                      No hay trabajos archivados.
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3">
                      {ownAgendaData.archivedTrabajos.map((trabajo) =>
                        renderTrabajoCard(trabajo)
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
            </>
          )}
        </div>

        {sharedOwners.length > 0 ? (
          <>
            {activeLinksError || inviteError ? (
              <div className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
                No se pudo cargar toda la información de las agendas
                compartidas.
              </div>
            ) : null}

            {!selectedSharedAgenda ? (
              <section
                id="agenda-compartida"
                className="mt-8 rounded-[2rem] border border-sky-200/80 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6"
              >
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 sm:text-sm">
                      Compartida
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                      Cambiar agenda compartida
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Aquí eliges si quieres seguir en tu agenda o entrar en una
                      ajena en solo lectura.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        Mostrando solo mi agenda
                      </span>
                    </div>
                  </div>

                  <SharedAgendaSelector
                    options={sharedAgendaData.map(({ owner }) => ({
                      userId: owner.userId,
                      label: owner.label,
                    }))}
                    selectedUserId=""
                  />
                </div>
              </section>
            ) : null}


          </>
        ) : null}
      </div>
    </main>
  );
}
