import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchInviteBody = {
  action?: "accept" | "reject" | "cancel" | "update_alias";
  alias?: string;
  alias_for_invitee?: string;
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
};

type LinkRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  is_active: boolean;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeAlias(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized ? normalized.slice(0, 60) : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para gestionar invitaciones." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as PatchInviteBody;
    const action = body.action;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el identificador de la invitación." },
        { status: 400 }
      );
    }

    if (
      !action ||
      !["accept", "reject", "cancel", "update_alias"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Acción no válida." },
        { status: 400 }
      );
    }

    const { data: invite, error: inviteError } = await supabase
      .from("shared_agenda_invites")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message || "No se pudo leer la invitación." },
        { status: 500 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: "La invitación no existe." },
        { status: 404 }
      );
    }

    const typedInvite = invite as InviteRow;
    const currentUserEmail = normalizeEmail(user.email);

    const currentUserIsInviter = typedInvite.inviter_user_id === user.id;
    const currentUserIsInvitee =
      typedInvite.invitee_user_id === user.id ||
      normalizeEmail(typedInvite.invitee_email) === currentUserEmail;

    if (action === "update_alias") {
      if (!currentUserIsInviter && !currentUserIsInvitee) {
        return NextResponse.json(
          { error: "No puedes cambiar el nombre de esta invitación." },
          { status: 403 }
        );
      }

      if (typedInvite.status === "cancelled") {
        return NextResponse.json(
          { error: "No se puede cambiar el nombre de una invitación cancelada." },
          { status: 409 }
        );
      }

      const normalizedAlias = normalizeAlias(body.alias ?? body.alias_for_invitee);

      const updatePayload = currentUserIsInviter
        ? { alias_for_inviter: normalizedAlias }
        : { alias_for_invitee: normalizedAlias };

      const { error: updateAliasError } = await supabase
        .from("shared_agenda_invites")
        .update(updatePayload)
        .eq("id", typedInvite.id);

      if (updateAliasError) {
        return NextResponse.json(
          {
            error:
              updateAliasError.message || "No se pudo guardar el nombre.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        saved_alias: normalizedAlias,
      });
    }

    if (action === "cancel") {
      if (!currentUserIsInviter) {
        return NextResponse.json(
          { error: "Solo quien envió la invitación puede cancelarla." },
          { status: 403 }
        );
      }

      if (typedInvite.status !== "pending") {
        return NextResponse.json(
          { error: "Solo se pueden cancelar invitaciones pendientes." },
          { status: 409 }
        );
      }

      const { error: updateError } = await supabase
        .from("shared_agenda_invites")
        .update({
          status: "cancelled",
          responded_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
          cancelled_by_user_id: user.id,
        })
        .eq("id", typedInvite.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "No se pudo cancelar la invitación." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      if (!currentUserIsInvitee) {
        return NextResponse.json(
          { error: "Solo quien la recibe puede rechazar la invitación." },
          { status: 403 }
        );
      }

      if (typedInvite.status !== "pending") {
        return NextResponse.json(
          { error: "Solo se pueden rechazar invitaciones pendientes." },
          { status: 409 }
        );
      }

      const { error: updateError } = await supabase
        .from("shared_agenda_invites")
        .update({
          status: "rejected",
          invitee_user_id: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", typedInvite.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "No se pudo rechazar la invitación." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (!currentUserIsInvitee) {
      return NextResponse.json(
        { error: "Solo quien la recibe puede aceptar la invitación." },
        { status: 403 }
      );
    }

    if (typedInvite.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden aceptar invitaciones pendientes." },
        { status: 409 }
      );
    }

    const aliasForInvitee = normalizeAlias(
      body.alias_for_invitee ?? body.alias
    );

    const { data: existingLink, error: existingLinkError } = await supabase
      .from("shared_agenda_links")
      .select("*")
      .or(
        `and(user_a_id.eq.${typedInvite.inviter_user_id},user_b_id.eq.${user.id}),and(user_a_id.eq.${user.id},user_b_id.eq.${typedInvite.inviter_user_id})`
      )
      .maybeSingle();

    if (existingLinkError) {
      return NextResponse.json(
        {
          error:
            existingLinkError.message ||
            "No se pudo comprobar la conexión compartida.",
        },
        { status: 500 }
      );
    }

    if (existingLink) {
      const typedLink = existingLink as LinkRow;

      const { error: reactivateError } = await supabase
        .from("shared_agenda_links")
        .update({
          is_active: true,
          created_from_invite_id: typedInvite.id,
          deactivated_at: null,
          deactivated_by_user_id: null,
        })
        .eq("id", typedLink.id);

      if (reactivateError) {
        return NextResponse.json(
          {
            error:
              reactivateError.message ||
              "No se pudo reactivar la conexión compartida.",
          },
          { status: 500 }
        );
      }
    } else {
      const { error: insertLinkError } = await supabase
        .from("shared_agenda_links")
        .insert({
          user_a_id: typedInvite.inviter_user_id,
          user_b_id: user.id,
          created_from_invite_id: typedInvite.id,
          is_active: true,
        });

      if (insertLinkError) {
        return NextResponse.json(
          {
            error:
              insertLinkError.message ||
              "No se pudo crear la conexión compartida.",
          },
          { status: 500 }
        );
      }
    }

    const { error: acceptError } = await supabase
      .from("shared_agenda_invites")
      .update({
        status: "accepted",
        invitee_user_id: user.id,
        accepted_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
        alias_for_invitee: aliasForInvitee,
      })
      .eq("id", typedInvite.id);

    if (acceptError) {
      return NextResponse.json(
        { error: acceptError.message || "No se pudo aceptar la invitación." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la invitación." },
      { status: 400 }
    );
  }
}
