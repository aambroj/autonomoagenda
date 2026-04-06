import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateAliasBody = {
  alias?: string | null;
};

type LinkRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_from_invite_id: string | null;
  is_active: boolean;
};

type InviteRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  inviter_email: string | null;
  invitee_email: string;
  alias_for_inviter: string | null;
  alias_for_invitee: string | null;
};

function normalizeAlias(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
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
        { error: "Debes iniciar sesión para editar el nombre de la conexión." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateAliasBody;
    const alias = normalizeAlias(body.alias);

    if (!id) {
      return NextResponse.json(
        { error: "La conexión no es válida." },
        { status: 400 }
      );
    }

    if (alias.length > 80) {
      return NextResponse.json(
        { error: "El nombre personalizado no puede superar 80 caracteres." },
        { status: 400 }
      );
    }

    const { data: link, error: linkError } = await supabase
      .from("shared_agenda_links")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (linkError) {
      return NextResponse.json(
        { error: linkError.message || "No se pudo leer la conexión." },
        { status: 500 }
      );
    }

    const linkRow = link as LinkRow | null;

    if (!linkRow) {
      return NextResponse.json(
        { error: "No se encontró la conexión compartida." },
        { status: 404 }
      );
    }

    const isParticipant =
      linkRow.user_a_id === user.id || linkRow.user_b_id === user.id;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "No puedes editar una conexión que no es tuya." },
        { status: 403 }
      );
    }

    if (!linkRow.created_from_invite_id) {
      return NextResponse.json(
        {
          error:
            "Esta conexión no tiene una invitación asociada para guardar alias.",
        },
        { status: 400 }
      );
    }

    const { data: invite, error: inviteError } = await supabase
      .from("shared_agenda_invites")
      .select("*")
      .eq("id", linkRow.created_from_invite_id)
      .maybeSingle();

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message || "No se pudo leer la invitación." },
        { status: 500 }
      );
    }

    const inviteRow = invite as InviteRow | null;

    if (!inviteRow) {
      return NextResponse.json(
        { error: "No se encontró la invitación asociada a esta conexión." },
        { status: 404 }
      );
    }

    const isInviter = inviteRow.inviter_user_id === user.id;
    const isInvitee = inviteRow.invitee_user_id === user.id;

    if (!isInviter && !isInvitee) {
      return NextResponse.json(
        { error: "No puedes editar esta conexión." },
        { status: 403 }
      );
    }

    const updatePayload = isInviter
      ? { alias_for_invitee: alias || null }
      : { alias_for_inviter: alias || null };

    const { data, error } = await supabase
      .from("shared_agenda_invites")
      .update(updatePayload)
      .eq("id", inviteRow.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message || "No se pudo guardar el nombre personalizado.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      invite: data,
      saved_alias: alias || null,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar el nombre de la conexión." },
      { status: 400 }
    );
  }
}