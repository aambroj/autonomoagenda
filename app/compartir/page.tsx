import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import InternalTopbar from "@/components/InternalTopbar";
import ShareAgendaInviteForm from "@/components/ShareAgendaInviteForm";
import SharedInviteActions from "@/components/SharedInviteActions";
import SharedLinkActions from "@/components/SharedLinkActions";
import { getSupabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Compartir",
  description: "Compartir agenda con otros profesionales en HuecoPro.",
};

export const dynamic = "force-dynamic";

type InviteRow = {
  id: string;
  inviter_user_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
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

const MADRID_LOCALE = "es-ES";
const MADRID_TIME_ZONE = "Europe/Madrid";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const dateLabel = date.toLocaleDateString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeLabel = date.toLocaleTimeString(MADRID_LOCALE, {
    timeZone: MADRID_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${dateLabel} · ${timeLabel}`;
}

function getInviteStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pending") return "Pendiente";
  if (normalized === "accepted") return "Aceptada";
  if (normalized === "rejected") return "Rechazada";
  if (normalized === "cancelled") return "Cancelada";

  return status;
}

function getInviteStatusClasses(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalized === "accepted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "rejected") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  if (normalized === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function CompartirPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedUserEmail = (user.email ?? "").trim().toLowerCase();

  const { data: sentInvitesData } = await supabase
    .from("shared_agenda_invites")
    .select("*")
    .eq("inviter_user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: receivedInvitesData } = await supabase
    .from("shared_agenda_invites")
    .select("*")
    .eq("invitee_email", normalizedUserEmail)
    .order("created_at", { ascending: false });

  const { data: activeLinksData } = await supabase
    .from("shared_agenda_links")
    .select("*")
    .eq("is_active", true)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const sentInvites = ((sentInvitesData as InviteRow[]) ?? []).filter(Boolean);
  const receivedInvites = ((receivedInvitesData as InviteRow[]) ?? [])
    .filter(Boolean)
    .filter((invite) => invite.inviter_user_id !== user.id);

  const pendingReceivedInvites = receivedInvites.filter(
    (invite) => invite.status === "pending"
  );

  const activeLinks = ((activeLinksData as LinkRow[]) ?? []).filter(Boolean);

  const sentInviteMap = new Map(sentInvites.map((invite) => [invite.id, invite]));

  function getLinkLabel(link: LinkRow) {
    if (link.created_from_invite_id) {
      const invite = sentInviteMap.get(link.created_from_invite_id);

      if (invite) {
        return invite.invitee_email;
      }
    }

    return "Otro profesional conectado";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <InternalTopbar />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Compartir
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Compartir agenda
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
            Conecta tu cuenta con otro profesional para veros mutuamente la
            agenda en solo lectura. Cada uno mantiene su propia cuenta y podrá
            dejar de compartir cuando quiera.
          </p>
        </section>

        <div className="mt-6">
          <ShareAgendaInviteForm />
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Invitaciones recibidas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Acepta o rechaza invitaciones pendientes para tu correo.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {pendingReceivedInvites.length} pendiente
              {pendingReceivedInvites.length === 1 ? "" : "s"}
            </span>
          </div>

          {pendingReceivedInvites.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600">
              No tienes invitaciones pendientes.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {pendingReceivedInvites.map((invite) => (
                <article
                  key={invite.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-slate-900">
                          Invitación pendiente
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getInviteStatusClasses(
                            invite.status
                          )}`}
                        >
                          {getInviteStatusLabel(invite.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        Esta invitación está asociada a tu correo{" "}
                        <span className="font-semibold text-slate-800">
                          {invite.invitee_email}
                        </span>
                        .
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Creada el {formatDateTime(invite.created_at)}.
                      </p>
                    </div>

                    <SharedInviteActions
                      inviteId={invite.id}
                      variant="received"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Invitaciones enviadas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Estado actual de las invitaciones que has creado.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {sentInvites.length} invitación
              {sentInvites.length === 1 ? "" : "es"}
            </span>
          </div>

          {sentInvites.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600">
              Todavía no has enviado invitaciones.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {sentInvites.map((invite) => (
                <article
                  key={invite.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-slate-900">
                          {invite.invitee_email}
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getInviteStatusClasses(
                            invite.status
                          )}`}
                        >
                          {getInviteStatusLabel(invite.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Creada el {formatDateTime(invite.created_at)}.
                      </p>

                      {invite.accepted_at ? (
                        <p className="mt-2 text-sm text-emerald-700">
                          Aceptada el {formatDateTime(invite.accepted_at)}.
                        </p>
                      ) : null}

                      {invite.responded_at && invite.status === "rejected" ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Rechazada el {formatDateTime(invite.responded_at)}.
                        </p>
                      ) : null}

                      {invite.cancelled_at ? (
                        <p className="mt-2 text-sm text-red-700">
                          Cancelada el {formatDateTime(invite.cancelled_at)}.
                        </p>
                      ) : null}
                    </div>

                    {invite.status === "pending" ? (
                      <SharedInviteActions
                        inviteId={invite.id}
                        variant="sent"
                      />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Conexiones activas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Relaciones de agenda compartida activas en este momento.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {activeLinks.length} activa
              {activeLinks.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeLinks.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600">
              No tienes conexiones compartidas activas.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {activeLinks.map((link) => (
                <article
                  key={link.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {getLinkLabel(link)}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        Agenda compartida en solo lectura.
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Activa desde {formatDateTime(link.created_at)}.
                      </p>
                    </div>

                    <SharedLinkActions linkId={link.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6">
          <Link
            href="/agenda"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Volver a la agenda
          </Link>
        </div>
      </div>
    </main>
  );
}