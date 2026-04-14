import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { ensurePaidAccess } from "@/lib/subscription-access";
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
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
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
    "0",
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
    Math.max(dayStart, roundUpMinutes(options?.currentMinutes ?? dayStart, 5)),
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
  minimumGapMinutes = 0,
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
  sharedUserId?: string,
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
  sharedUserId?: string,
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

  return gaps.reduce(
    (longest, current) => {
      if (!longest || current.minutes > longest.minutes) {
        return current;
      }
      return longest;
    },
    null as TimeGap | null,
  );
}

function getOccupancyPercentage(
  busyMinutes: number,
  visibleWindowMinutes: number,
) {
  if (visibleWindowMinutes <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((busyMinutes / visibleWindowMinutes) * 100)),
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
  visibleEndMinutes: number,
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
  visibleEndMinutes: number,
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
  minGapPx = 34,
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
    visibleEndMinutes - visibleStartMinutes,
  );

  const topPx =
    ((safeStart - visibleStartMinutes) / visibleWindowMinutes) *
    timelineHeightPx;

  const rawHeightPx =
    ((safeEnd - safeStart) / visibleWindowMinutes) * timelineHeightPx;

  const heightPx =
    rawHeightPx < minHeightPx
      ? rawHeightPx
      : Math.max(minHeightPx, rawHeightPx);

  const clampedHeightPx = Math.max(
    Math.min(heightPx, timelineHeightPx - topPx),
    Math.min(rawHeightPx, timelineHeightPx - topPx),
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
      .join(" "),
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
  },
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
        trabajo.cancelled_at,
      )}. Ya no ocupa hueco.`
    : "Este trabajo está cancelado y ya no ocupa hueco.";

  return (
    <article
      id={`trabajo-${trabajo.id}`}
      key={trabajo.id}
      className={`scroll-mt-24 rounded-3xl border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-offset-2 target:ring-2 target:ring-sky-300 sm:px-5 sm:py-4 ${getTrabajoCardClasses(
        trabajo.status,
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
                  Cancelado
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
                Fecha: {formatDateLabel(trabajo.work_date)}
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
                  trabajo.status,
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
              Seguimiento
            </p>

            <div className="mt-2 grid gap-2">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-red-700">
                  Comprometido
                </p>
                <p className="mt-1 text-sm font-bold leading-tight text-red-900 sm:text-base">
                  {formatStatusMoment(trabajo.committed_at)}
                </p>
              </div>

              {!showCancelledNotice ? (
                <>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-sky-700">
                      Hecho
                    </p>
                    <p className="mt-1 text-sm font-bold leading-tight text-sky-900 sm:text-base">
                      {formatStatusMoment(trabajo.done_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                    <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-indigo-700">
                      Facturado
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
                    Cancelado
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
    (trabajo) => trabajo.status.trim().toLowerCase() !== "archivado",
  );
  const archivedTrabajos = filteredTrabajos.filter(
    (trabajo) => trabajo.status.trim().toLowerCase() === "archivado",
  );

  const summaryDate = day || anchorDate;

  const committedCount = filteredTrabajos.filter(
    (trabajo) =>
      trabajo.work_date === summaryDate &&
      trabajo.status.trim().toLowerCase() === "pendiente",
  ).length;

  const doneCount = filteredTrabajos.filter(
    (trabajo) =>
      trabajo.work_date === summaryDate &&
      trabajo.status.trim().toLowerCase() === "hecho",
  ).length;

  const invoicedCount = filteredTrabajos.filter(
    (trabajo) => trabajo.status.trim().toLowerCase() === "facturado",
  ).length;

  const archivedCount = archivedTrabajos.length;

  const daysWithData = days
    .map((dayItem) => {
      const items = activeTrabajos.filter(
        (trabajo) => trabajo.work_date === dayItem.date,
      );
      const blockingItems = items.filter((trabajo) =>
        isBlockingStatus(trabajo.status),
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
            0,
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
            MIN_GAP_MINUTES,
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
        (trabajo) => trabajo.status.trim().toLowerCase() === "pendiente",
      ).length;

      const doneItemsCount = items.filter(
        (trabajo) => trabajo.status.trim().toLowerCase() === "hecho",
      ).length;

      const timelineHeightPx = getTimelineHeightPx(
        Math.max(visibleWindowMinutes, 60),
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
            34,
          );

      const displayTimelineGuideMarks = nonWorkingDay
        ? []
        : filterMarksBySpacing(
            timelineGuideMarks.filter((mark) => Boolean(mark.label)),
            visibleWindowMinutes,
            timelineHeightPx,
            34,
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
        firstFreeTime: nonWorkingDay
          ? null
          : getFirstFreeTime(actualFreeBlocks),
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
      inviteId,
    )}#edit-shared-link-alias-form`,
    manageConnectionHref: "/compartir#edit-shared-link-alias-form",
  };
}

function renderMiniMetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-black leading-none text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function renderTimelinePanel(params: {
  dayItem: AgendaDayData;
  readOnly: boolean;
  anchorDate: string;
  selectedSharedUserId?: string;
  ownerKey: string;
}) {
  const { dayItem, readOnly, anchorDate, selectedSharedUserId, ownerKey } =
    params;

  if (dayItem.isNonWorkingDay) {
    return (
      <div className="mt-5">
        <div className={getRestPanelClasses()}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-bold text-rose-800 sm:text-xl">
                Descanso semanal
              </p>
              <p className="mt-2 text-sm leading-6 text-rose-700 sm:text-base">
                Este día queda cerrado por descanso.
              </p>
              {dayItem.items.length > 0 ? (
                <p className="mt-3 text-sm font-medium leading-6 text-rose-800">
                  Los trabajos guardados para este día se siguen mostrando
                  abajo.
                </p>
              ) : null}
            </div>

            <span className="inline-flex shrink-0 items-center self-start whitespace-nowrap rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-700 sm:self-auto">
              No laborable
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
        dayItem.isSunday,
      )}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-bold text-slate-800 sm:text-lg">
            Vista del día
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {readOnly
              ? "Consulta rápida en solo lectura."
              : "Bloques ocupados y huecos reales."}
          </p>
        </div>

        <div
          className={`text-sm font-bold ${getOccupancyTextClasses(
            dayItem.occupancyPercentage,
          )}`}
        >
          {dayItem.occupancyPercentage}% ocupado
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[94px_1fr]">
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
                key={`mark-${ownerKey}-${dayItem.date}-${mark.label}`}
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
          <div className="absolute inset-0" style={getTimelineCanvasStyle()} />

          {dayItem.timelineGuideMarks.map((mark) => {
            const topPx =
              (mark.offsetMinutes / dayItem.visibleWindowMinutes) *
              dayItem.timelineHeightPx;

            return (
              <div
                key={`guide-${ownerKey}-${dayItem.date}-${mark.offsetMinutes}`}
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
                key={`guide-mobile-${ownerKey}-${dayItem.date}-${mark.offsetMinutes}`}
                className="absolute left-3 top-0 lg:hidden"
                style={{ top: `${topPx}px` }}
              >
                <span className="inline-flex -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                  {mark.label}
                </span>
              </div>
            );
          })}

          {dayItem.actualFreeBlocks.map((gap) => {
            const gapStartMinutes = timeToMinutes(gap.start);
            const gapEndMinutes = timeToMinutes(gap.end);
            const suggestedDuration = getSuggestedDurationForGap(gap.minutes);
            const isUsable = gap.minutes >= MIN_GAP_MINUTES;

            if (readOnly) {
              return (
                <div
                  key={`timeline-gap-${ownerKey}-${dayItem.date}-${gap.start}-${gap.end}`}
                  className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 sm:left-3 sm:right-3 sm:px-4"
                  style={getTimelineGapBlockStyle({
                    startMinutes: gapStartMinutes,
                    endMinutes: gapEndMinutes,
                    visibleStartMinutes: dayItem.visibleDayStartMinutes,
                    visibleEndMinutes: dayItem.visibleDayEndMinutes,
                    timelineHeightPx: dayItem.timelineHeightPx,
                  })}
                  title={`Tramo libre: ${gap.start} - ${gap.end}`}
                >
                  <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                    <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                      <span className="font-black uppercase tracking-wide text-emerald-700">
                        {isUsable ? "Hueco libre" : "Libre corto"}
                      </span>
                      <span className="mx-2 text-emerald-500">·</span>
                      <span>{gap.start}</span>
                      <span className="mx-1.5 text-emerald-500">-</span>
                      <span>{gap.end}</span>
                      <span className="mx-2 text-emerald-500">·</span>
                      <span>{formatGapLabel(gap.minutes)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isUsable) {
              return (
                <Link
                  key={`timeline-gap-${ownerKey}-${dayItem.date}-${gap.start}-${gap.end}`}
                  href={buildQuickAddHref(
                    dayItem.date,
                    gap.start,
                    suggestedDuration,
                    selectedSharedUserId,
                  )}
                  className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm sm:left-3 sm:right-3 sm:px-4"
                  style={getTimelineGapBlockStyle({
                    startMinutes: gapStartMinutes,
                    endMinutes: gapEndMinutes,
                    visibleStartMinutes: dayItem.visibleDayStartMinutes,
                    visibleEndMinutes: dayItem.visibleDayEndMinutes,
                    timelineHeightPx: dayItem.timelineHeightPx,
                  })}
                  title={`Crear trabajo el ${dayItem.label} a las ${gap.start}`}
                >
                  <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                    <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                      <span className="font-black uppercase tracking-wide text-emerald-700">
                        Hueco libre
                      </span>
                      <span className="mx-2 text-emerald-500">·</span>
                      <span>{gap.start}</span>
                      <span className="mx-1.5 text-emerald-500">-</span>
                      <span>{gap.end}</span>
                      <span className="mx-2 text-emerald-500">·</span>
                      <span>{formatGapLabel(gap.minutes)}</span>
                    </div>
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={`timeline-short-gap-${ownerKey}-${dayItem.date}-${gap.start}-${gap.end}`}
                className="absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 sm:left-3 sm:right-3 sm:px-4"
                style={getTimelineGapBlockStyle({
                  startMinutes: gapStartMinutes,
                  endMinutes: gapEndMinutes,
                  visibleStartMinutes: dayItem.visibleDayStartMinutes,
                  visibleEndMinutes: dayItem.visibleDayEndMinutes,
                  timelineHeightPx: dayItem.timelineHeightPx,
                })}
                title={`Tramo libre corto: ${gap.start} - ${gap.end}`}
              >
                <div className="flex h-full items-center overflow-hidden whitespace-nowrap">
                  <div className="min-w-0 truncate text-[14px] font-bold tabular-nums text-emerald-900 sm:text-base">
                    <span className="font-black uppercase tracking-wide text-emerald-700">
                      Libre corto
                    </span>
                    <span className="mx-2 text-emerald-500">·</span>
                    <span>{gap.start}</span>
                    <span className="mx-1.5 text-emerald-500">-</span>
                    <span>{gap.end}</span>
                    <span className="mx-2 text-emerald-500">·</span>
                    <span>{formatGapLabel(gap.minutes)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {dayItem.blockingItems.map((trabajo) => {
            const startMinutes = timeToMinutes(trabajo.start_time);
            const endMinutes =
              startMinutes + Number(trabajo.duration_minutes || 0);

            const commonContent = (
              <div className="flex h-full items-center justify-between gap-3 overflow-hidden whitespace-nowrap">
                <div className="min-w-0 flex-1 truncate text-[14px] font-bold tabular-nums sm:text-base">
                  <span className="font-black">{trabajo.client_name}</span>
                  <span className="mx-2 opacity-50">·</span>
                  <span>{formatTime(trabajo.start_time)}</span>
                  <span className="mx-1.5 opacity-50">-</span>
                  <span>
                    {addMinutes(trabajo.start_time, trabajo.duration_minutes)}
                  </span>
                  <span className="mx-2 opacity-50">·</span>
                  <span>
                    {formatJobDurationLabel(trabajo.duration_minutes)}
                  </span>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getTimelineStatusPillClasses(
                    trabajo.status,
                  )}`}
                >
                  {getStatusLabel(trabajo.status)}
                </span>
              </div>
            );

            if (readOnly) {
              return (
                <div
                  key={`timeline-job-${ownerKey}-${trabajo.id}`}
                  className={`absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm sm:left-3 sm:right-3 sm:px-4 ${getTimelineJobClasses(
                    trabajo.status,
                  )}`}
                  style={getTimelineBlockStyle({
                    startMinutes,
                    endMinutes,
                    visibleStartMinutes: dayItem.visibleDayStartMinutes,
                    visibleEndMinutes: dayItem.visibleDayEndMinutes,
                    timelineHeightPx: dayItem.timelineHeightPx,
                    minHeightPx: 38,
                  })}
                  title={trabajo.client_name}
                >
                  {commonContent}
                </div>
              );
            }

            return (
              <Link
                key={`timeline-job-${ownerKey}-${trabajo.id}`}
                href={buildTrabajoHref(
                  trabajo.id,
                  anchorDate,
                  selectedSharedUserId,
                )}
                className={`absolute left-2.5 right-2.5 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm transition hover:shadow-md sm:left-3 sm:right-3 sm:px-4 ${getTimelineJobClasses(
                  trabajo.status,
                )}`}
                style={getTimelineBlockStyle({
                  startMinutes,
                  endMinutes,
                  visibleStartMinutes: dayItem.visibleDayStartMinutes,
                  visibleEndMinutes: dayItem.visibleDayEndMinutes,
                  timelineHeightPx: dayItem.timelineHeightPx,
                  minHeightPx: 38,
                })}
                title={`Editar trabajo de ${trabajo.client_name}`}
              >
                {commonContent}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderDayMetrics(dayItem: AgendaDayData) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {renderMiniMetricCard({
        title: "En agenda",
        value: String(dayItem.blockingItems.length),
        detail: "Bloques que ocupan tiempo.",
      })}
      {renderMiniMetricCard({
        title: "Primera libre",
        value: dayItem.firstFreeTime ?? "--:--",
        detail: "Primer hueco del día.",
      })}
      {renderMiniMetricCard({
        title: "Hueco mayor",
        value: dayItem.longestGap
          ? formatGapLabel(dayItem.longestGap.minutes)
          : "0 min",
        detail: dayItem.longestGap
          ? `${dayItem.longestGap.start} - ${dayItem.longestGap.end}`
          : "Sin huecos amplios.",
      })}
      {renderMiniMetricCard({
        title: "Libre",
        value: formatGapLabel(dayItem.totalFreeMinutes),
        detail: `Ventana visible: ${formatGapLabel(dayItem.visibleWindowMinutes)}`,
      })}
    </div>
  );
}

function renderGapSection(params: {
  dayItem: AgendaDayData;
  readOnly: boolean;
  selectedSharedUserId?: string;
}) {
  const { dayItem, readOnly, selectedSharedUserId } = params;

  if (dayItem.isNonWorkingDay) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-[2rem] border p-3.5 sm:p-4 ${getInnerPanelClasses(
        dayItem.isSunday,
      )}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-bold text-slate-800 sm:text-lg">
            {readOnly ? "Huecos visibles" : "Huecos útiles"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {readOnly
              ? "Consulta los tramos libres de este día."
              : "Pulsa un hueco para preparar el alta rápida."}
          </p>
        </div>

        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
          Base: {QUICK_ADD_DEFAULT_DURATION} min
        </div>
      </div>

      {dayItem.usableGaps.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {dayItem.hasActualFreeTime
            ? `Queda tiempo libre, pero ningún tramo llega a ${MIN_GAP_MINUTES} min.`
            : `No quedan huecos de ${MIN_GAP_MINUTES} min o más.`}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dayItem.usableGaps.map((gap) => {
            const suggestedDuration = getSuggestedDurationForGap(gap.minutes);

            if (readOnly) {
              return (
                <div
                  key={`${dayItem.date}-${gap.start}-${gap.end}`}
                  className="min-w-0 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                        Hueco
                      </p>
                      <p className="mt-2 text-2xl font-black leading-none text-slate-900 sm:text-[2rem]">
                        {gap.start} - {gap.end}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                        Libre durante {formatGapLabel(gap.minutes)}
                      </p>
                    </div>

                    <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {formatGapLabel(gap.minutes)}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={`${dayItem.date}-${gap.start}-${gap.end}`}
                href={buildQuickAddHref(
                  dayItem.date,
                  gap.start,
                  suggestedDuration,
                  selectedSharedUserId,
                )}
                className="group min-w-0 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                      Hueco
                    </p>
                    <p className="mt-2 text-2xl font-black leading-none text-slate-900 sm:text-[2rem]">
                      {gap.start} - {gap.end}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      Libre durante {formatGapLabel(gap.minutes)}
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
  );
}

function getDayHeaderSummary(params: {
  dayItem: AgendaDayData;
  hasActiveFilters: boolean;
}) {
  const { dayItem, hasActiveFilters } = params;

  if (dayItem.isNonWorkingDay) {
    if (dayItem.items.length > 0) {
      return `Día de descanso con ${dayItem.items.length} trabajo${
        dayItem.items.length === 1 ? "" : "s"
      }.`;
    }

    return "Día de descanso.";
  }

  if (hasActiveFilters) {
    return `${dayItem.items.length} resultado${
      dayItem.items.length === 1 ? "" : "s"
    }.`;
  }

  if (dayItem.items.length === 0) {
    return "Sin trabajos en agenda.";
  }

  return `${dayItem.items.length} trabajo${
    dayItem.items.length === 1 ? "" : "s"
  } en agenda.`;
}

function getDayBadgeLabel(params: {
  dayItem: AgendaDayData;
  hasActiveFilters: boolean;
  readOnly: boolean;
}) {
  const { dayItem, hasActiveFilters, readOnly } = params;

  if (dayItem.isNonWorkingDay) return "Descanso";
  if (readOnly) return "Solo lectura";
  if (hasActiveFilters) {
    return `${dayItem.items.length} resultado${dayItem.items.length === 1 ? "" : "s"}`;
  }
  if (dayItem.hasUsableGaps) return "Con huecos";
  if (dayItem.hasActualFreeTime) return "Libre corto";
  return "Completo";
}

function getDayBadgeClasses(params: {
  dayItem: AgendaDayData;
  hasActiveFilters: boolean;
  readOnly: boolean;
}) {
  const { dayItem, hasActiveFilters, readOnly } = params;

  if (dayItem.isNonWorkingDay) {
    return "bg-rose-100 text-rose-700";
  }
  if (readOnly) {
    return "bg-slate-100 text-slate-700";
  }
  if (hasActiveFilters) {
    return "bg-slate-100 text-slate-700";
  }
  if (dayItem.hasUsableGaps || dayItem.hasActualFreeTime) {
    return "bg-emerald-50 text-emerald-700";
  }
  return "bg-red-50 text-red-700";
}

function renderDaySection(params: {
  ownerKey: string;
  dayItem: AgendaDayData;
  readOnly: boolean;
  hasActiveFilters: boolean;
  anchorDate: string;
  selectedSharedUserId?: string;
}) {
  const {
    ownerKey,
    dayItem,
    readOnly,
    hasActiveFilters,
    anchorDate,
    selectedSharedUserId,
  } = params;

  return (
    <section
      id={`${ownerKey}-day-${dayItem.date}`}
      key={`${ownerKey}-${dayItem.date}`}
      className={`scroll-mt-24 overflow-hidden rounded-[2rem] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6 ${getDaySectionClasses(
        dayItem.isSunday,
      )}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 sm:text-3xl">
              {dayItem.label}
            </h2>

            {dayItem.isNonWorkingDay ? (
              <span className={getNonWorkingBadgeClasses()}>Descanso</span>
            ) : null}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
            {getDayHeaderSummary({ dayItem, hasActiveFilters })}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center self-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold sm:self-auto sm:text-base ${getDayBadgeClasses(
            {
              dayItem,
              hasActiveFilters,
              readOnly,
            },
          )}`}
        >
          {getDayBadgeLabel({
            dayItem,
            hasActiveFilters,
            readOnly,
          })}
        </span>
      </div>

      {!hasActiveFilters ? (
        <>
          {renderTimelinePanel({
            dayItem,
            readOnly,
            anchorDate,
            selectedSharedUserId,
            ownerKey,
          })}
          {renderDayMetrics(dayItem)}
          {renderGapSection({
            dayItem,
            readOnly,
            selectedSharedUserId,
          })}
        </>
      ) : null}

      {dayItem.items.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {dayItem.items.map((trabajo) =>
            renderTrabajoCard(trabajo, {
              readOnly,
            }),
          )}
        </div>
      ) : null}
    </section>
  );
}

function renderArchivedSection(params: {
  ownerLabel: string;
  archivedTrabajos: Trabajo[];
  readOnly: boolean;
}) {
  const { ownerLabel, archivedTrabajos, readOnly } = params;

  return (
    <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {readOnly ? `Archivados de ${ownerLabel}` : "Trabajos archivados"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-lg">
            {readOnly
              ? "Vista en solo lectura."
              : "Guardados fuera de producción hasta decidir qué hacer con ellos."}
          </p>
        </div>

        <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 sm:self-auto sm:text-base">
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
            renderTrabajoCard(trabajo, {
              readOnly,
            }),
          )}
        </div>
      )}
    </section>
  );
}

function renderSharedAgendaSection(params: {
  owner: AgendaOwner;
  data: AgendaComputedData;
  hasActiveFilters: boolean;
  anchorDate: string;
  selectedSharedUserId?: string;
  backToOwnAgendaHref: string;
  errorMessage?: string | null;
}) {
  const {
    owner,
    data,
    hasActiveFilters,
    anchorDate,
    selectedSharedUserId,
    backToOwnAgendaHref,
    errorMessage,
  } = params;

  return (
    <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere] break-words sm:text-3xl">
            Agenda de {owner.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Vista en solo lectura. Puedes consultarla, pero no editarla.
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
          No hay trabajos visibles con los filtros actuales.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {renderSummaryCard({
              title: "Comprometidos",
              value: data.committedCount,
              subtitle: "Trabajos visibles en esta fecha.",
              valueClasses: "text-red-700",
              cardClasses: "border-red-200 bg-white/88",
            })}

            {renderSummaryCard({
              title: "Hechos",
              value: data.doneCount,
              subtitle: "Trabajos hechos en esta fecha.",
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
            {data.daysWithData.map((dayItem) =>
              renderDaySection({
                ownerKey: `shared-${owner.userId}`,
                dayItem,
                readOnly: true,
                hasActiveFilters,
                anchorDate,
                selectedSharedUserId,
              }),
            )}
          </div>

          {renderArchivedSection({
            ownerLabel: owner.label,
            archivedTrabajos: data.archivedTrabajos,
            readOnly: true,
          })}
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

  await ensurePaidAccess({
    supabase,
    userId: user.id,
    userEmail: user.email,
    redirectTo: "/cuenta",
  });

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
            `inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id},invitee_email.eq.${normalizedUserEmail}`,
          )
          .order("created_at", { ascending: false });

  const acceptedInvites = ((inviteData as InviteRow[]) ?? []).filter(Boolean);
  const inviteMap = new Map(
    acceptedInvites.map((invite) => [invite.id, invite]),
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
        arr.findIndex((item) => item.userId === owner.userId) === index,
    ),
  ];

  const selectedSharedUserId = sharedOwners.some(
    (owner) => owner.userId === requestedShared,
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
    ? (sharedAgendaData.find(
        (item) => item.owner.userId === selectedSharedUserId,
      ) ?? null)
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
                  ? `Agenda de ${selectedSharedAgenda.owner.label}`
                  : "Tu agenda de trabajo"}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-lg">
                {selectedSharedAgenda
                  ? "Estás viendo una agenda compartida en solo lectura."
                  : "Mira tu semana y detecta rápido dónde encaja otro trabajo."}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Semana visible: {weekRangeLabel}. Jornada calculada de{" "}
                {WORK_DAY_START} a {WORK_DAY_END}.
              </p>
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

        {!selectedSharedAgenda ? (
          <div id="mi-agenda-detalle" className="mt-5">
            <QuickAddJobForm />
          </div>
        ) : null}

        <div className="mt-5">
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

        {sharedOwners.length > 0 ? (
          <section
            id="agenda-compartida"
            className="mt-5 rounded-[2rem] border border-sky-200/80 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 sm:text-sm">
                  Compartida
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                  {selectedSharedAgenda
                    ? "Cambiar agenda"
                    : "Agendas compartidas"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedSharedAgenda
                    ? "Elige otra agenda o vuelve a la tuya."
                    : "Entra en otra agenda cuando necesites consultarla."}
                </p>
              </div>

              {selectedSharedAgenda ? (
                <Link
                  href={ownAgendaHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Volver a mi agenda
                </Link>
              ) : null}
            </div>

            <div className="mt-4">
              <SharedAgendaSelector
                options={sharedAgendaData.map(({ owner }) => ({
                  userId: owner.userId,
                  label: owner.label,
                }))}
                selectedUserId={selectedSharedAgenda?.owner.userId ?? ""}
              />
            </div>
          </section>
        ) : null}

        {selectedSharedAgenda ? (
          <>
            {renderSharedAgendaSection({
              owner: selectedSharedAgenda.owner,
              data: selectedSharedAgenda.data,
              hasActiveFilters,
              anchorDate,
              selectedSharedUserId,
              backToOwnAgendaHref: ownAgendaHref,
            })}

            <section
              id="mi-agenda"
              className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      Mi agenda
                    </h2>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                      Editable
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Tu agenda sigue disponible. Usa el botón para volver a
                    trabajar sobre ella.
                  </p>
                </div>

                <Link
                  href={ownAgendaHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
                >
                  Abrir mi agenda
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {renderSummaryCard({
                  title: `${summaryDateLabel} · Comprometidos`,
                  value: ownAgendaData.committedCount,
                  subtitle: "Trabajos ya encajados.",
                  valueClasses: "text-red-700",
                  cardClasses: "border-red-200 bg-white/88",
                })}

                {renderSummaryCard({
                  title: `${summaryDateLabel} · Hechos`,
                  value: ownAgendaData.doneCount,
                  subtitle: "Trabajos realizados.",
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
            </section>
          </>
        ) : (
          <>
            <section
              id="mi-agenda"
              className="mt-5 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                      Mi agenda
                    </h2>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                      Editable
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Tu zona de trabajo completa.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {renderSummaryCard({
                  title: `${summaryDateLabel} · Comprometidos`,
                  value: ownAgendaData.committedCount,
                  subtitle: "Trabajos ya encajados.",
                  valueClasses: "text-red-700",
                  cardClasses: "border-red-200 bg-white/88",
                })}

                {renderSummaryCard({
                  title: `${summaryDateLabel} · Hechos`,
                  value: ownAgendaData.doneCount,
                  subtitle: "Trabajos realizados.",
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
            </section>

            {!hasActiveFilters ? (
              <section className="mt-5 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                      Semana de un vistazo
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Para ver rápido qué día conviene aprovechar.
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
                      href={`#own-day-${dayItem.date}`}
                      className={`min-w-0 overflow-hidden rounded-3xl border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-md ${getCompactDayCardClasses(
                        {
                          percentage: dayItem.occupancyPercentage,
                          hasActualFreeTime: dayItem.hasActualFreeTime,
                          hasUsableGaps: dayItem.hasUsableGaps,
                          isSunday: dayItem.isSunday,
                          isNonWorking: dayItem.isNonWorkingDay,
                        },
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
                                : getOccupancyBarClasses(
                                    dayItem.occupancyPercentage,
                                  )
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
                              : getOccupancyTextClasses(
                                  dayItem.occupancyPercentage,
                                )
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
                            <span>Hueco mayor</span>
                            <span className="font-bold text-slate-800">
                              {dayItem.longestGap
                                ? formatGapLabel(dayItem.longestGap.minutes)
                                : "0 min"}
                            </span>
                          </div>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {error ? (
              <div className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-base text-red-700 shadow-sm">
                Error al cargar trabajos: {error.message}
              </div>
            ) : !ownAgendaData.hasAnyVisibleWork ? (
              <div className="mt-8 rounded-[2rem] border border-white/70 bg-white/82 p-6 text-base text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                No hay trabajos que coincidan con los filtros actuales.
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-5">
                  {ownAgendaData.daysWithData.map((dayItem) =>
                    renderDaySection({
                      ownerKey: "own",
                      dayItem,
                      readOnly: false,
                      hasActiveFilters,
                      anchorDate,
                      selectedSharedUserId,
                    }),
                  )}
                </div>

                {renderArchivedSection({
                  ownerLabel: "Mi agenda",
                  archivedTrabajos: ownAgendaData.archivedTrabajos,
                  readOnly: false,
                })}
              </>
            )}
          </>
        )}

        {activeLinksError || inviteError ? (
          <div className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
            No se pudo cargar toda la información de las agendas compartidas.
          </div>
        ) : null}
      </div>
    </main>
  );
}
