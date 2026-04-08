import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import InternalTopbar from "@/components/InternalTopbar";
import ShareAgendaInviteForm from "@/components/ShareAgendaInviteForm";
import SharedInviteActions from "@/components/SharedInviteActions";
import DeactivateSharedLinkForm from "@/components/DeactivateSharedLinkForm";
import SharedInvitesRealtimeNotice from "@/components/SharedInvitesRealtimeNotice";
import SharedReceivedInvitesAutoFocus from "@/components/SharedReceivedInvitesAutoFocus";
import { getSupabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Compartir agenda | AutonomoAgenda",
  description:
    "Invita a otro profesional, comparte visibilidad de agenda en solo lectura y deja de compartir cuando quieras en AutonomoAgenda.",
};

export const dynamic = "force-dynamic";

type InviteRow = {
  id: string;
  inviter_user_id: string;
  inviter_email: string | null;
  invitee_email: string;
  invitee_user_id: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
  alias_for_inviter: string | null;
  alias_for_invitee: string | null;
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

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

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

function getSentInviteLabel(invite: InviteRow) {
  return invite.alias_for_inviter?.trim() || invite.invitee_email;
}

function getReceivedInviteLabel(invite: InviteRow) {
  return (
    invite.alias_for_invitee?.trim() ||
    invite.inviter_email ||
    "Otro profesional"
  );
}

function shouldShowSecondaryEmailLine(params: {
  primaryLabel: string;
  email: string | null | undefined;
}) {
  const { primaryLabel, email } = params;
  const normalizedPrimary = normalizeText(primaryLabel);
  const normalizedEmail = normalizeText(email);

  return Boolean(
    normalizedPrimary &&
      normalizedEmail &&
      normalizedPrimary !== normalizedEmail
  );
}

function getBestLinkLabel(params: {
  invite: InviteRow | null;
  normalizedUserEmail: string;
}) {
  const { invite, normalizedUserEmail } = params;

  if (!invite) {
    return "Otro profesional conectado";
  }

  const inviterEmail = normalizeText(invite.inviter_email);
  const inviteeEmail = normalizeText(invite.invitee_email);
  const aliasForInviter = (invite.alias_for_inviter ?? "").trim();
  const aliasForInvitee = (invite.alias_for_invitee ?? "").trim();

  const currentUserIsInvitee =
    inviteeEmail && inviteeEmail === normalizedUserEmail;

  const currentUserIsInviter =
    inviterEmail && inviterEmail === normalizedUserEmail;

  if (currentUserIsInvitee) {
    if (aliasForInvitee) return aliasForInvitee;
    if (invite.inviter_email) return invite.inviter_email;
  }

  if (currentUserIsInviter) {
    if (aliasForInviter) return aliasForInviter;
    if (invite.invitee_email) return invite.invitee_email;
  }

  if (inviteeEmail && inviteeEmail !== normalizedUserEmail) {
    if (aliasForInviter) return aliasForInviter;
    return invite.invitee_email;
  }

  if (inviterEmail && inviterEmail !== normalizedUserEmail) {
    if (aliasForInvitee) return aliasForInvitee;
    return invite.inviter_email ?? "Otro profesional conectado";
  }

  return "Otro profesional conectado";
}

function renderSummaryCard(params: {
  title: string;
  value: number;
  subtitle: string;
  valueClasses: string;
  cardClasses: string;
}) {
  const { title, value, subtitle, valueClasses, cardClasses } = params;

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${cardClasses}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className={`mt-2 text-4xl font-black leading-none ${valueClasses}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </article>
  );
}

export default async function CompartirPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedUserEmail = normalizeText(user.email);

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

  const pendingSentInvites = sentInvites.filter(
    (invite) => invite.status === "pending"
  );

  const activeLinks = ((activeLinksData as LinkRow[]) ?? []).filter(Boolean);

  const allKnownInvites = [...sentInvites, ...receivedInvites];
  const inviteMap = new Map(
    allKnownInvites.map((invite) => [invite.id, invite])
  );

  function getLinkLabel(link: LinkRow) {
    if (!link.created_from_invite_id) {
      return "Otro profesional conectado";
    }

    const invite = inviteMap.get(link.created_from_invite_id) ?? null;

    return getBestLinkLabel({
      invite,
      normalizedUserEmail,
    });
  }

  const activeLinkOptions = activeLinks.map((link) => ({
    id: link.id,
    label: getLinkLabel(link),
    description: `Conexión mutua en solo lectura. Ambos podéis ver la agenda del otro desde ${formatDateTime(
      link.created_at
    )}. La conexión seguirá activa aunque cerréis sesión y volváis otro día, hasta que uno de los dos deje de compartir.`,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SharedInvitesRealtimeNotice userEmail={normalizedUserEmail} />
        <SharedReceivedInvitesAutoFocus userEmail={normalizedUserEmail} />
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
            agenda en solo lectura.
            <span className="font-semibold text-slate-800">
              {" "}
              Cuando una invitación se acepta, ambas cuentas pueden ver la
              agenda de la otra
            </span>
            . Nadie puede editar la agenda ajena y cualquiera de los dos puede
            dejar de compartir cuando quiera.
          </p>

          <p className="mt-3 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            La conexión compartida
            <span className="font-semibold">
              {" "}
              no se pierde por cerrar sesión
            </span>
            . Seguirá activa aunque volváis al día siguiente, hasta que uno de
            los dos pulse <span className="font-semibold">“Dejar de compartir”</span>.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {renderSummaryCard({
            title: "Conexiones activas",
            value: activeLinks.length,
            subtitle:
              "Profesionales con los que ya tienes visibilidad mutua en solo lectura.",
            valueClasses: "text-emerald-700",
            cardClasses: "border-emerald-200 bg-white",
          })}

          {renderSummaryCard({
            title: "Pendientes recibidas",
            value: pendingReceivedInvites.length,
            subtitle:
              "Invitaciones que puedes aceptar o rechazar ahora mismo.",
            valueClasses: "text-amber-700",
            cardClasses: "border-amber-200 bg-white",
          })}

          {renderSummaryCard({
            title: "Pendientes enviadas",
            value: pendingSentInvites.length,
            subtitle:
              "Invitaciones que aún dependen de la respuesta del otro profesional.",
            valueClasses: "text-sky-700",
            cardClasses: "border-sky-200 bg-white",
          })}
        </section>

        <div className="mt-6">
          <ShareAgendaInviteForm />
        </div>

        <section className="mt-6 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Conexiones activas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Estas conexiones ya están funcionando.
                <span className="font-semibold text-slate-800">
                  {" "}
                  Ambos podéis ver la agenda del otro en solo lectura
                </span>{" "}
                y seguirán activas hasta que uno de los dos deje de compartir.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              {activeLinks.length} conexión
              {activeLinks.length === 1 ? "" : "es"} activa
              {activeLinks.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeLinkOptions.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-600">
              Todavía no tienes conexiones activas.
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {activeLinkOptions.map((link) => (
                <article
                  key={link.id}
                  className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-slate-900">
                          {link.label}
                        </p>
                        <span className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                          Activa
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6">
          <DeactivateSharedLinkForm links={activeLinkOptions} />
        </div>

        <section
          id="invitaciones-recibidas"
          className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Invitaciones recibidas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Si aceptas una invitación,
                <span className="font-semibold text-slate-800">
                  {" "}
                  tú verás la agenda del otro profesional y él verá la tuya
                </span>
                , siempre en solo lectura.
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
              {pendingReceivedInvites.map((invite) => {
                const receivedLabel = getReceivedInviteLabel(invite);

                return (
                  <article
                    key={invite.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-slate-900">
                            {receivedLabel}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getInviteStatusClasses(
                              invite.status
                            )}`}
                          >
                            {getInviteStatusLabel(invite.status)}
                          </span>
                        </div>

                        {shouldShowSecondaryEmailLine({
                          primaryLabel: receivedLabel,
                          email: invite.inviter_email,
                        }) ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Correo del profesional:{" "}
                            <span className="font-semibold text-slate-800">
                              {invite.inviter_email}
                            </span>
                            .
                          </p>
                        ) : null}

                        <p className="mt-2 text-sm text-slate-600">
                          Esta invitación está asociada a tu correo{" "}
                          <span className="font-semibold text-slate-800">
                            {invite.invitee_email}
                          </span>
                          .
                        </p>

                        <p className="mt-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                          Si aceptas, la visibilidad será mutua:
                          <span className="font-semibold">
                            {" "}
                            ambos veréis la agenda del otro en solo lectura
                          </span>
                          .
                        </p>

                        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Después seguirá compartida aunque cerréis sesión, hasta
                          que uno de los dos deje de compartir.
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
                );
              })}
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
                Cuando la otra persona acepte,
                <span className="font-semibold text-slate-800">
                  {" "}
                  ambos podréis ver la agenda del otro
                </span>{" "}
                en solo lectura.
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
              {sentInvites.map((invite) => {
                const sentLabel = getSentInviteLabel(invite);

                return (
                  <article
                    key={invite.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-slate-900">
                            {sentLabel}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getInviteStatusClasses(
                              invite.status
                            )}`}
                          >
                            {getInviteStatusLabel(invite.status)}
                          </span>
                        </div>

                        {shouldShowSecondaryEmailLine({
                          primaryLabel: sentLabel,
                          email: invite.invitee_email,
                        }) ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Correo del profesional:{" "}
                            <span className="font-semibold text-slate-800">
                              {invite.invitee_email}
                            </span>
                            .
                          </p>
                        ) : null}

                        <p className="mt-2 text-sm text-slate-500">
                          Creada el {formatDateTime(invite.created_at)}.
                        </p>

                        {invite.status === "pending" ? (
                          <p className="mt-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                            Si la acepta, la conexión será mutua y
                            <span className="font-semibold">
                              {" "}
                              ambos veréis la agenda del otro
                            </span>
                            .
                          </p>
                        ) : null}

                        {invite.status === "pending" ? (
                          <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            Después la conexión seguirá activa aunque cerréis
                            sesión, hasta que uno de los dos deje de compartir.
                          </p>
                        ) : null}

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
                );
              })}
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