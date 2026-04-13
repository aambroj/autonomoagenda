import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import EditSharedLinkAliasForm from "@/components/EditSharedLinkAliasForm";
import InviteSharedAgendaForm from "@/components/InviteSharedAgendaForm";
import SharedInviteActions from "@/components/SharedInviteActions";
import SharedInvitesLiveStrip from "@/components/SharedInvitesLiveStrip";
import DeactivateSharedLinkForm, {
  type ActiveLinkOption,
} from "@/components/DeactivateSharedLinkForm";

export const dynamic = "force-dynamic";

type CompartirPageProps = {
  searchParams?: Promise<{
    q?: string;
    editAlias?: string;
    focusLink?: string;
  }>;
};

type InviteRow = {
  id: string;
  inviter_user_id: string;
  inviter_email: string | null;
  invitee_email: string;
  invitee_user_id: string | null;
  status: string;
  alias_for_inviter: string | null;
  alias_for_invitee: string | null;
  created_at: string | null;
};

type LinkRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  is_active: boolean;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type ActiveLinkCard = {
  id: string;
  inviteId: string | null;
  partnerUserId: string;
  title: string;
  baseName: string;
  partnerEmail: string | null;
  createdAt: string | null;
  aliasPlaceholder: string;
  hasCustomAlias: boolean;
};

function normalizeEmail(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Fecha no disponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function getDisplayNameFromProfile(profile: ProfileRow | null | undefined) {
  const name = profile?.full_name?.trim();
  return name || null;
}

function getPendingIncomingLabel(invite: InviteRow) {
  return invite.alias_for_invitee?.trim()
    ? invite.alias_for_invitee.trim()
    : invite.inviter_email?.trim()
      ? invite.inviter_email.trim()
      : "Profesional pendiente";
}

function getPendingOutgoingLabel(invite: InviteRow) {
  return invite.alias_for_inviter?.trim()
    ? invite.alias_for_inviter.trim()
    : invite.invitee_email?.trim()
      ? invite.invitee_email.trim()
      : "Profesional invitado";
}

function buildCompartirHref(params: {
  q?: string;
  editAlias?: string;
  focusLink?: string;
  hash?: string;
}) {
  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.editAlias?.trim()) {
    search.set("editAlias", params.editAlias.trim());
  }

  if (params.focusLink?.trim()) {
    search.set("focusLink", params.focusLink.trim());
  }

  const queryString = search.toString();
  const base = queryString ? `/compartir?${queryString}` : "/compartir";

  return params.hash ? `${base}#${params.hash}` : base;
}

function getSecondaryButtonClasses() {
  return "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 sm:w-auto";
}

function getPrimaryButtonClasses() {
  return "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 sm:w-auto";
}

function getStatCardClasses() {
  return "rounded-2xl border border-slate-200 bg-slate-50 p-4";
}

function getEmptyState(message: string) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

export default async function CompartirPage({
  searchParams,
}: CompartirPageProps) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?redirectTo=/compartir");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const searchQuery = (resolvedSearchParams.q ?? "").trim();
  const requestedEditAlias = (resolvedSearchParams.editAlias ?? "").trim();
  const requestedFocusLink = (resolvedSearchParams.focusLink ?? "").trim();
  const normalizedSearchQuery = normalizeText(searchQuery);

  const currentUserId = user.id;
  const currentUserEmail = normalizeEmail(user.email);

  const [{ data: invitesData }, { data: linksData }, { data: profilesData }] =
    await Promise.all([
      supabase
        .from("shared_agenda_invites")
        .select(
          "id, inviter_user_id, inviter_email, invitee_email, invitee_user_id, status, alias_for_inviter, alias_for_invitee, created_at"
        )
        .or(
          `inviter_user_id.eq.${currentUserId},invitee_user_id.eq.${currentUserId},invitee_email.eq.${currentUserEmail}`
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("shared_agenda_links")
        .select("id, user_a_id, user_b_id, is_active, created_at")
        .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const invites = ((invitesData as InviteRow[] | null) ?? []).filter(Boolean);
  const links = ((linksData as LinkRow[] | null) ?? []).filter(Boolean);
  const profiles = ((profilesData as ProfileRow[] | null) ?? []).filter(Boolean);

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of profiles) {
    profileMap.set(profile.id, profile);
  }

  const incomingPendingInvites = invites.filter((invite) => {
    const isPending = invite.status === "pending";
    const belongsToCurrentUser =
      invite.invitee_user_id === currentUserId ||
      normalizeEmail(invite.invitee_email) === currentUserEmail;

    return (
      isPending &&
      belongsToCurrentUser &&
      invite.inviter_user_id !== currentUserId
    );
  });

  const outgoingPendingInvites = invites.filter((invite) => {
    return invite.status === "pending" && invite.inviter_user_id === currentUserId;
  });

  const activeLinks = links.filter((link) => link.is_active);

  const activeLinkCards: ActiveLinkCard[] = activeLinks.map((link) => {
    const partnerUserId =
      link.user_a_id === currentUserId ? link.user_b_id : link.user_a_id;

    const partnerProfile = profileMap.get(partnerUserId);

    const matchingInvite = invites.find((invite) => {
      const samePair =
        (invite.inviter_user_id === currentUserId &&
          invite.invitee_user_id === partnerUserId) ||
        (invite.inviter_user_id === partnerUserId &&
          invite.invitee_user_id === currentUserId);

      return samePair && invite.status === "accepted";
    });

    const aliasForCurrentUser =
      matchingInvite?.inviter_user_id === currentUserId
        ? matchingInvite.alias_for_inviter
        : matchingInvite?.alias_for_invitee;

    const partnerEmail =
      matchingInvite?.inviter_user_id === currentUserId
        ? matchingInvite.invitee_email
        : matchingInvite?.inviter_email;

    const fallbackName =
      getDisplayNameFromProfile(partnerProfile) ||
      partnerEmail?.trim() ||
      "Profesional conectado";

    const trimmedAlias = aliasForCurrentUser?.trim() || "";
    const visibleName = trimmedAlias || fallbackName;

    return {
      id: String(link.id),
      inviteId: matchingInvite?.id ?? null,
      partnerUserId,
      title: visibleName,
      baseName: fallbackName,
      partnerEmail: partnerEmail?.trim() || null,
      createdAt: link.created_at ?? null,
      aliasPlaceholder: partnerEmail?.trim()
        ? `Ejemplo: ${partnerEmail.trim()}`
        : "Nombre para este compañero",
      hasCustomAlias: Boolean(trimmedAlias),
    };
  });

  const filteredActiveLinkCards = activeLinkCards
    .filter((link) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const haystack = normalizeText(
        [link.title, link.baseName, link.partnerEmail].filter(Boolean).join(" ")
      );

      return haystack.includes(normalizedSearchQuery);
    })
    .sort((a, b) => {
      const aIsHighlighted = requestedEditAlias
        ? a.inviteId === requestedEditAlias
        : requestedFocusLink
          ? a.id === requestedFocusLink
          : false;

      const bIsHighlighted = requestedEditAlias
        ? b.inviteId === requestedEditAlias
        : requestedFocusLink
          ? b.id === requestedFocusLink
          : false;

      if (aIsHighlighted && !bIsHighlighted) return -1;
      if (!aIsHighlighted && bIsHighlighted) return 1;

      return 0;
    });

  const activeLinkOptions: ActiveLinkOption[] = activeLinkCards.map((link) => ({
    id: link.id,
    label: link.title,
    aliasPlaceholder: link.aliasPlaceholder,
  }));

  const activeAliasOptions = activeLinkCards
    .filter((link) => Boolean(link.inviteId))
    .map((link) => ({
      id: String(link.inviteId),
      label: link.partnerEmail?.trim() || link.baseName || link.title,
      placeholder: link.aliasPlaceholder,
      currentAlias: link.hasCustomAlias ? link.title : "",
    }));

  const highlightedLink =
    (requestedEditAlias
      ? activeLinkCards.find((link) => link.inviteId === requestedEditAlias)
      : null) ??
    (requestedFocusLink
      ? activeLinkCards.find((link) => link.id === requestedFocusLink)
      : null) ??
    filteredActiveLinkCards[0] ??
    activeLinkCards[0] ??
    null;

  const initialSelectedAliasId = activeAliasOptions.some((link) => {
    if (requestedEditAlias) {
      return link.id === requestedEditAlias;
    }

    return highlightedLink?.inviteId ? link.id === highlightedLink.inviteId : false;
  })
    ? requestedEditAlias || highlightedLink?.inviteId || undefined
    : undefined;

  const highlightedAgendaHref = highlightedLink
    ? `/agenda?shared=${encodeURIComponent(highlightedLink.partnerUserId)}#agenda-compartida`
    : "/agenda#agenda-compartida";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Compartir agenda
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Conecta tu agenda con otros profesionales
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Invita, consulta en solo lectura y desactiva la conexión cuando quieras.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className={getStatCardClasses()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Conexiones activas
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {activeLinks.length}
            </p>
          </div>

          <div className={getStatCardClasses()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recibidas
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {incomingPendingInvites.length}
            </p>
          </div>

          <div className={getStatCardClasses()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Enviadas
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {outgoingPendingInvites.length}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/agenda#mi-agenda" className={getSecondaryButtonClasses()}>
            Ir a mi agenda
          </Link>

          <Link
            href={highlightedAgendaHref}
            className={getPrimaryButtonClasses()}
          >
            Ver compartida
          </Link>
        </div>

        {highlightedLink ? (
          <div className="mt-6 rounded-3xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  Conexión activa
                </span>

                <h2 className="mt-3 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {highlightedLink.title}
                </h2>

                {highlightedLink.hasCustomAlias ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Nombre base: <span className="font-medium text-slate-800">{highlightedLink.baseName}</span>
                  </p>
                ) : null}

                {highlightedLink.partnerEmail ? (
                  <p className="mt-1 break-all text-sm text-slate-600">
                    {highlightedLink.partnerEmail}
                  </p>
                ) : null}

                <p className="mt-2 text-sm text-slate-600">
                  Desde {formatDate(highlightedLink.createdAt)}
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                <Link
                  href={highlightedAgendaHref}
                  className={getPrimaryButtonClasses()}
                >
                  Abrir agenda
                </Link>

                {highlightedLink.inviteId ? (
                  <Link
                    href="#edit-shared-link-alias-form"
                    className={getSecondaryButtonClasses()}
                  >
                    Cambiar alias
                  </Link>
                ) : null}

                <Link
                  href={buildCompartirHref({
                    q: searchQuery,
                    focusLink: highlightedLink.id,
                    hash: "deactivate-shared-link-form",
                  })}
                  className={getSecondaryButtonClasses()}
                >
                  Desactivar
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-6">
        <SharedInvitesLiveStrip userEmail={currentUserEmail} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <InviteSharedAgendaForm />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Conexiones activas
                </h2>
                <p className="text-sm text-slate-600">
                  Busca, entra o cambia el alias.
                </p>
              </div>

              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {activeLinkCards.length}
              </span>
            </div>

            {activeLinkCards.length ? (
              <>
                <form method="get" className="mt-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="connections-search"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Buscar
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="connections-search"
                        type="text"
                        name="q"
                        defaultValue={searchQuery}
                        placeholder="Alias, nombre o email"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />

                      <div className="grid grid-cols-1 gap-2 sm:flex">
                        <button type="submit" className={getPrimaryButtonClasses()}>
                          Buscar
                        </button>

                        {searchQuery ? (
                          <Link
                            href="/compartir"
                            className={getSecondaryButtonClasses()}
                          >
                            Limpiar
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      {filteredActiveLinkCards.length} de {activeLinkCards.length} visibles
                    </p>
                  </div>
                </form>

                {filteredActiveLinkCards.length ? (
                  <div className="mt-5 space-y-4">
                    {filteredActiveLinkCards.map((link) => (
                      <article
                        key={link.id}
                        className={`rounded-2xl border p-4 ${
                          highlightedLink?.id === link.id
                            ? "border-sky-300 bg-sky-50 shadow-sm"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-base font-semibold text-slate-900">
                                {link.title}
                              </h3>

                              {link.hasCustomAlias ? (
                                <span className="inline-flex rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                  Alias
                                </span>
                              ) : null}
                            </div>

                            {link.hasCustomAlias ? (
                              <p className="mt-1 text-sm text-slate-600">
                                {link.baseName}
                              </p>
                            ) : null}

                            {link.partnerEmail ? (
                              <p className="mt-1 break-all text-sm text-slate-600">
                                {link.partnerEmail}
                              </p>
                            ) : null}

                            <p className="mt-2 text-xs text-slate-500">
                              Desde {formatDate(link.createdAt)}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                            <Link
                              href={`/agenda?shared=${encodeURIComponent(
                                link.partnerUserId
                              )}#agenda-compartida`}
                              className={getPrimaryButtonClasses()}
                            >
                              Ver agenda
                            </Link>

                            {link.inviteId ? (
                              <Link
                                href={buildCompartirHref({
                                  q: searchQuery,
                                  focusLink: link.id,
                                  hash: "edit-shared-link-alias-form",
                                })}
                                className={getSecondaryButtonClasses()}
                              >
                                Editar alias
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  getEmptyState("No hay conexiones que coincidan con la búsqueda.")
                )}
              </>
            ) : (
              getEmptyState("Todavía no tienes conexiones activas.")
            )}
          </section>

          <div className="min-w-0">
            <EditSharedLinkAliasForm
              links={activeAliasOptions}
              initialSelectedLinkId={initialSelectedAliasId}
            />
          </div>

          <div className="min-w-0">
            <DeactivateSharedLinkForm
              links={activeLinkOptions}
              initialSelectedLinkId={highlightedLink?.id ?? undefined}
            />
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Invitaciones recibidas
                </h2>
                <p className="text-sm text-slate-600">
                  Acepta o rechaza.
                </p>
              </div>

              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {incomingPendingInvites.length}
              </span>
            </div>

            {incomingPendingInvites.length ? (
              <div className="mt-5 space-y-4">
                {incomingPendingInvites.map((invite) => (
                  <article
                    key={invite.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="break-words text-base font-semibold text-slate-900">
                      {getPendingIncomingLabel(invite)}
                    </h3>

                    {invite.inviter_email ? (
                      <p className="mt-1 break-all text-sm text-slate-600">
                        {invite.inviter_email}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(invite.created_at)}
                    </p>

                    <SharedInviteActions
                      inviteId={invite.id}
                      variant="incoming"
                    />
                  </article>
                ))}
              </div>
            ) : (
              getEmptyState("No tienes invitaciones pendientes.")
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Invitaciones enviadas
                </h2>
                <p className="text-sm text-slate-600">
                  Pendientes de respuesta.
                </p>
              </div>

              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {outgoingPendingInvites.length}
              </span>
            </div>

            {outgoingPendingInvites.length ? (
              <div className="mt-5 space-y-4">
                {outgoingPendingInvites.map((invite) => (
                  <article
                    key={invite.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="break-words text-base font-semibold text-slate-900">
                      {getPendingOutgoingLabel(invite)}
                    </h3>

                    <p className="mt-1 break-all text-sm text-slate-600">
                      {invite.invitee_email}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(invite.created_at)}
                    </p>

                    <SharedInviteActions
                      inviteId={invite.id}
                      variant="outgoing"
                    />
                  </article>
                ))}
              </div>
            ) : (
              getEmptyState("No tienes invitaciones enviadas pendientes.")
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
