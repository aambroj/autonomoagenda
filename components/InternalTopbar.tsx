"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function getLinkClasses(isActive: boolean) {
  return isActive
    ? "inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm"
    : "inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export default function InternalTopbar() {
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAgendaRoute = pathname === "/agenda" || pathname.startsWith("/agenda/");
  const isCompartirRoute =
    pathname === "/compartir" || pathname.startsWith("/compartir/");
  const isCuentaRoute = pathname === "/cuenta" || pathname.startsWith("/cuenta/");

  useEffect(() => {
    let isMounted = true;

    async function loadPendingInvitesCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const normalizedUserEmail = normalizeEmail(user?.email);

      if (!normalizedUserEmail) {
        if (isMounted) {
          setUserEmail("");
          setPendingInvitesCount(0);
        }
        return;
      }

      if (isMounted) {
        setUserEmail(normalizedUserEmail);
      }

      const { count } = await supabase
        .from("shared_agenda_invites")
        .select("*", { count: "exact", head: true })
        .eq("invitee_email", normalizedUserEmail)
        .eq("status", "pending");

      if (isMounted) {
        setPendingInvitesCount(count ?? 0);
      }
    }

    loadPendingInvitesCount();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userEmail) return;

    function scheduleReload() {
      if (refreshTimeoutRef.current) return;

      refreshTimeoutRef.current = setTimeout(async () => {
        refreshTimeoutRef.current = null;

        const { count } = await supabase
          .from("shared_agenda_invites")
          .select("*", { count: "exact", head: true })
          .eq("invitee_email", userEmail)
          .eq("status", "pending");

        setPendingInvitesCount(count ?? 0);
      }, 120);
    }

    const channel = supabase.channel(`topbar-shared-invites:${userEmail}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shared_agenda_invites",
      },
      (payload) => {
        const nextRow = (payload.new ?? {}) as {
          invitee_email?: string | null;
        };

        const prevRow = (payload.old ?? {}) as {
          invitee_email?: string | null;
        };

        const nextInviteeEmail = normalizeEmail(nextRow.invitee_email);
        const prevInviteeEmail = normalizeEmail(prevRow.invitee_email);

        const affectsCurrentUser =
          nextInviteeEmail === userEmail || prevInviteeEmail === userEmail;

        if (!affectsCurrentUser) return;

        scheduleReload();
      }
    );

    channel.subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [supabase, userEmail]);

  const hasPendingInvites = pendingInvitesCount > 0;

  return (
    <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/agenda" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
              AA
            </div>

            <div>
              <p className="text-base font-black leading-none text-slate-900">
                AutonomoAgenda
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Agenda de trabajo
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-2">
            <Link href="/agenda" className={getLinkClasses(isAgendaRoute)}>
              Agenda
            </Link>

            <Link
              href="/compartir"
              className={`${getLinkClasses(isCompartirRoute)} gap-2`}
            >
              <span>Compartir agenda</span>

              {hasPendingInvites ? (
                <span className="relative inline-flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                  </span>

                  <span
                    className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-black ${
                      isCompartirRoute
                        ? "bg-white text-red-600"
                        : "bg-red-600 text-white"
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

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}