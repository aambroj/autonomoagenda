"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type SharedInvitesRealtimeNoticeProps = {
  userEmail: string;
};

type NoticeTone = "sky" | "emerald" | "amber";

type NoticeState = {
  message: string;
  tone: NoticeTone;
} | null;

type InvitePayloadRow = {
  inviter_user_id?: string | null;
  inviter_email?: string | null;
  invitee_email?: string | null;
  status?: string | null;
};

type LinkPayloadRow = {
  user_a_id?: string | null;
  user_b_id?: string | null;
  is_active?: boolean | null;
};

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getNoticeClasses(tone: NoticeTone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50/95";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50/95";
  }

  return "border-sky-200 bg-sky-50/95";
}

function getDotClasses(tone: NoticeTone) {
  if (tone === "emerald") {
    return "bg-emerald-500";
  }

  if (tone === "amber") {
    return "bg-amber-500";
  }

  return "bg-sky-500";
}

export default function SharedInvitesRealtimeNotice({
  userEmail,
}: SharedInvitesRealtimeNoticeProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const normalizedUserEmail = normalizeEmail(userEmail);

  const [notice, setNotice] = useState<NoticeState>(null);

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    let cleanupRealtime: (() => void) | undefined;

    async function setupRealtime() {
      if (!normalizedUserEmail) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const currentUserId = user?.id ?? "";
      const currentUserEmail = normalizeEmail(user?.email ?? normalizedUserEmail);

      if (!isMounted || !currentUserId || !currentUserEmail) {
        return;
      }

      function scheduleRefresh() {
        if (refreshTimeoutRef.current) return;

        refreshTimeoutRef.current = setTimeout(() => {
          refreshTimeoutRef.current = null;
          router.refresh();
        }, 150);
      }

      function showNotice(message: string, tone: NoticeTone) {
        setNotice({ message, tone });

        if (noticeTimeoutRef.current) {
          clearTimeout(noticeTimeoutRef.current);
        }

        noticeTimeoutRef.current = setTimeout(() => {
          setNotice(null);
        }, 4200);
      }

      const channel = supabase.channel(
        `shared-invites-notice:${currentUserId}:${currentUserEmail}`
      );

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shared_agenda_invites",
        },
        (payload) => {
          const invite = (payload.new ?? {}) as InvitePayloadRow;
          const inviteeEmail = normalizeEmail(invite.invitee_email);
          const inviterEmail = normalizeEmail(invite.inviter_email);
          const status = (invite.status ?? "").trim().toLowerCase();

          if (inviteeEmail === currentUserEmail && status === "pending") {
            showNotice(
              inviterEmail
                ? `Nueva invitación de ${inviterEmail}.`
                : "Nueva invitación recibida.",
              "sky"
            );
            scheduleRefresh();
            return;
          }

          if (inviterEmail === currentUserEmail) {
            scheduleRefresh();
          }
        }
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shared_agenda_invites",
        },
        (payload) => {
          const nextInvite = (payload.new ?? {}) as InvitePayloadRow;
          const prevInvite = (payload.old ?? {}) as InvitePayloadRow;

          const nextInviteeEmail = normalizeEmail(nextInvite.invitee_email);
          const nextInviterEmail = normalizeEmail(nextInvite.inviter_email);
          const nextStatus = (nextInvite.status ?? "").trim().toLowerCase();
          const prevStatus = (prevInvite.status ?? "").trim().toLowerCase();

          const affectsCurrentUser =
            nextInviteeEmail === currentUserEmail ||
            nextInviterEmail === currentUserEmail;

          if (affectsCurrentUser) {
            scheduleRefresh();
          }

          if (
            nextInviterEmail === currentUserEmail &&
            prevStatus === "pending" &&
            nextStatus === "accepted"
          ) {
            showNotice(
              nextInviteeEmail && nextInviteeEmail !== currentUserEmail
                ? `${nextInviteeEmail} aceptó tu invitación.`
                : "Invitación aceptada.",
              "emerald"
            );
            return;
          }

          if (
            nextInviterEmail === currentUserEmail &&
            prevStatus === "pending" &&
            nextStatus === "rejected"
          ) {
            showNotice(
              nextInviteeEmail && nextInviteeEmail !== currentUserEmail
                ? `${nextInviteeEmail} rechazó tu invitación.`
                : "Invitación rechazada.",
              "amber"
            );
            return;
          }

          if (
            nextInviteeEmail === currentUserEmail &&
            prevStatus === "pending" &&
            nextStatus === "cancelled"
          ) {
            showNotice("La invitación fue cancelada.", "amber");
          }
        }
      );

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shared_agenda_links",
        },
        (payload) => {
          const nextLink = (payload.new ?? {}) as LinkPayloadRow;

          const affectsCurrentUser =
            nextLink.user_a_id === currentUserId ||
            nextLink.user_b_id === currentUserId;

          if (!affectsCurrentUser) return;

          scheduleRefresh();
        }
      );

      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shared_agenda_links",
        },
        (payload) => {
          const nextLink = (payload.new ?? {}) as LinkPayloadRow;
          const prevLink = (payload.old ?? {}) as LinkPayloadRow;

          const affectsCurrentUser =
            nextLink.user_a_id === currentUserId ||
            nextLink.user_b_id === currentUserId ||
            prevLink.user_a_id === currentUserId ||
            prevLink.user_b_id === currentUserId;

          if (!affectsCurrentUser) return;

          scheduleRefresh();

          if (prevLink.is_active === true && nextLink.is_active === false) {
            showNotice("La conexión compartida se ha desactivado.", "amber");
          }
        }
      );

      channel.subscribe();

      cleanupRealtime = () => {
        supabase.removeChannel(channel);
      };
    }

    setupRealtime();

    return () => {
      isMounted = false;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }

      if (cleanupRealtime) {
        cleanupRealtime();
      }
    };
  }, [normalizedUserEmail, router, supabase]);

  if (!notice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl ${getNoticeClasses(
          notice.tone
        )}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getDotClasses(
              notice.tone
            )}`}
            aria-hidden="true"
          />

          <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-slate-800">
            {notice.message}
          </p>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="pointer-events-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 text-sm font-semibold text-slate-500 transition hover:bg-white"
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
