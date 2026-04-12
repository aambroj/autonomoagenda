"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type LiveTone = "idle" | "sky" | "emerald" | "amber";

type InvitePayloadRow = {
  inviter_user_id?: string | null;
  inviter_email?: string | null;
  invitee_user_id?: string | null;
  invitee_email?: string | null;
  status?: string | null;
};

type LinkPayloadRow = {
  user_a_id?: string | null;
  user_b_id?: string | null;
  is_active?: boolean | null;
};

function getLinkClasses(isActive: boolean) {
  return isActive
    ? "inline-flex w-full items-center justify-center rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-bold !text-white shadow-lg shadow-slate-900/10 sm:py-2.5"
    : "inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-900 sm:py-2.5";
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getLivePillClasses(tone: LiveTone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (tone === "sky") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function getLiveDotClasses(tone: LiveTone) {
  if (tone === "emerald") {
    return "bg-emerald-500";
  }

  if (tone === "amber") {
    return "bg-amber-500";
  }

  if (tone === "sky") {
    return "bg-sky-500";
  }

  return "bg-slate-400";
}

export default function InternalTopbar() {
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);
  const [liveTone, setLiveTone] = useState<LiveTone>("idle");
  const [liveLabel, setLiveLabel] = useState("Conectando tiempo real...");

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAgendaRoute =
    pathname === "/agenda" || pathname.startsWith("/agenda/");
  const isCompartirRoute =
    pathname === "/compartir" || pathname.startsWith("/compartir/");
  const isCuentaRoute =
    pathname === "/cuenta" || pathname.startsWith("/cuenta/");

  useEffect(() => {
    let isMounted = true;

    async function loadPendingInvitesCount(nextUserEmail: string) {
      const { count } = await supabase
        .from("shared_agenda_invites")
        .select("*", { count: "exact", head: true })
        .eq("invitee_email", nextUserEmail)
        .eq("status", "pending");

      if (isMounted) {
        setPendingInvitesCount(count ?? 0);
      }
    }

    async function loadSessionState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const normalizedUserEmail = normalizeEmail(user?.email);
      const nextUserId = user?.id ?? "";

      if (!normalizedUserEmail || !nextUserId) {
        if (isMounted) {
          setUserEmail("");
          setUserId("");
          setPendingInvitesCount(0);
          setIsRealtimeReady(false);
          setLiveTone("idle");
          setLiveLabel("Sin sesión");
        }
        return;
      }

      if (isMounted) {
        setUserEmail(normalizedUserEmail);
        setUserId(nextUserId);
      }

      await loadPendingInvitesCount(normalizedUserEmail);
    }

    loadSessionState();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userEmail || !userId) return;

    async function reloadPendingInvitesCount() {
      const { count } = await supabase
        .from("shared_agenda_invites")
        .select("*", { count: "exact", head: true })
        .eq("invitee_email", userEmail)
        .eq("status", "pending");

      setPendingInvitesCount(count ?? 0);
    }

    function scheduleReload() {
      if (refreshTimeoutRef.current) return;

      refreshTimeoutRef.current = setTimeout(async () => {
        refreshTimeoutRef.current = null;
        await reloadPendingInvitesCount();
      }, 120);
    }

    function pulse(label: string, tone: LiveTone) {
      setLiveTone(tone);
      setLiveLabel(label);

      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }

      pulseTimeoutRef.current = setTimeout(() => {
        setLiveTone("idle");
        setLiveLabel("Todo al día");
      }, 3200);
    }

    const channel = supabase.channel(`topbar-shared-live:${userId}:${userEmail}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shared_agenda_invites",
      },
      (payload) => {
        const nextRow = (payload.new ?? {}) as InvitePayloadRow;
        const prevRow = (payload.old ?? {}) as InvitePayloadRow;

        const nextInviteeEmail = normalizeEmail(nextRow.invitee_email);
        const prevInviteeEmail = normalizeEmail(prevRow.invitee_email);
        const nextInviterEmail = normalizeEmail(nextRow.inviter_email);
        const prevInviterEmail = normalizeEmail(prevRow.inviter_email);

        const nextInviteeUserId = nextRow.invitee_user_id ?? "";
        const prevInviteeUserId = prevRow.invitee_user_id ?? "";
        const nextInviterUserId = nextRow.inviter_user_id ?? "";
        const prevInviterUserId = prevRow.inviter_user_id ?? "";

        const affectsCurrentUser =
          nextInviteeEmail === userEmail ||
          prevInviteeEmail === userEmail ||
          nextInviterEmail === userEmail ||
          prevInviterEmail === userEmail ||
          nextInviteeUserId === userId ||
          prevInviteeUserId === userId ||
          nextInviterUserId === userId ||
          prevInviterUserId === userId;

        if (!affectsCurrentUser) return;

        scheduleReload();

        const nextStatus = (nextRow.status ?? "").trim().toLowerCase();
        const prevStatus = (prevRow.status ?? "").trim().toLowerCase();
        const eventType = payload.eventType;

        if (
          eventType === "INSERT" &&
          nextInviteeEmail === userEmail &&
          nextStatus === "pending"
        ) {
          pulse("Nueva invitación recibida", "sky");
          return;
        }

        if (
          eventType === "INSERT" &&
          nextInviterEmail === userEmail &&
          nextStatus === "pending"
        ) {
          pulse("Invitación enviada", "sky");
          return;
        }

        if (
          nextInviterEmail === userEmail &&
          prevStatus === "pending" &&
          nextStatus === "accepted"
        ) {
          pulse("Invitación aceptada", "emerald");
          return;
        }

        if (
          nextInviterEmail === userEmail &&
          prevStatus === "pending" &&
          nextStatus === "rejected"
        ) {
          pulse("Invitación rechazada", "amber");
          return;
        }

        if (
          nextInviteeEmail === userEmail &&
          prevStatus === "pending" &&
          nextStatus === "cancelled"
        ) {
          pulse("Invitación cancelada", "amber");
          return;
        }

        pulse("Invitaciones actualizadas", "sky");
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shared_agenda_links",
      },
      (payload) => {
        const nextRow = (payload.new ?? {}) as LinkPayloadRow;
        const prevRow = (payload.old ?? {}) as LinkPayloadRow;

        const affectsCurrentUser =
          nextRow.user_a_id === userId ||
          nextRow.user_b_id === userId ||
          prevRow.user_a_id === userId ||
          prevRow.user_b_id === userId;

        if (!affectsCurrentUser) return;

        if (payload.eventType === "INSERT" && nextRow.is_active === true) {
          pulse("Nueva conexión activa", "emerald");
          return;
        }

        if (
          payload.eventType === "UPDATE" &&
          prevRow.is_active === true &&
          nextRow.is_active === false
        ) {
          pulse("Conexión desactivada", "amber");
          return;
        }

        pulse("Conexiones actualizadas", "sky");
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsRealtimeReady(true);
        setLiveTone("idle");
        setLiveLabel("Todo al día");
      }
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [supabase, userEmail, userId]);

  const hasPendingInvites = pendingInvitesCount > 0;

  return (
    <header className="mb-6 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <Link href="/agenda" className="inline-flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-lg shadow-slate-900/10">
              AA
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black leading-none text-slate-900 sm:text-lg">
                AutonomoAgenda
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Agenda de trabajo
              </p>
            </div>
          </Link>

          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>

        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link href="/agenda" className={getLinkClasses(isAgendaRoute)}>
            Agenda
          </Link>

          <Link
            href="/compartir"
            className={`${getLinkClasses(isCompartirRoute)} gap-2.5`}
          >
            <span>Compartir agenda</span>

            {hasPendingInvites ? (
              <span className="relative inline-flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                </span>

                <span
                  className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-black ${
                    isCompartirRoute
                      ? "bg-white !text-red-600"
                      : "bg-red-600 !text-white"
                  }`}
                >
                  {pendingInvitesCount}
                </span>
              </span>
            ) : null}
          </Link>

          <Link href="/cuenta" className={getLinkClasses(isCuentaRoute)}>
            Cuenta
          </Link>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {hasPendingInvites ? (
              <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm">
                {pendingInvitesCount} invitación
                {pendingInvitesCount === 1 ? "" : "es"} pendiente
                {pendingInvitesCount === 1 ? "" : "s"}
              </div>
            ) : (
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                Sin invitaciones pendientes
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm ${getLivePillClasses(
                liveTone
              )}`}
            >
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${getLiveDotClasses(
                  isRealtimeReady ? liveTone : "idle"
                )}`}
              />
              {isRealtimeReady ? "En directo" : "Conectando..."}
            </span>

            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm [overflow-wrap:anywhere] break-words">
              {liveLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
