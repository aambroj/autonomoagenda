import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateInviteBody = {
  action?: "accept" | "reject" | "cancel";
};

type InviteRow = {
  id: string;
  inviter_user_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  status: string;
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

function sortUserPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
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

    const body = (await request.json()) as UpdateInviteBody;
    const action = body.action;
    const { id } = await context.params;
    const currentUserEmail = normalizeEmail(user.email);

    if (!id) {
      return NextResponse.json(
        { error: "La invitación no es válida." },
        { status: 400 }
      );
    }

    if (!action || !["accept", "reject", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "La acción solicitada no es válida." },
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

    const inviteRow = invite as InviteRow | null;

    if (!inviteRow) {
      return NextResponse.json(
        { error: "No se encontró la invitación." },
        { status: 404 }
      );
    }

    const isInviter = inviteRow.inviter_user_id === user.id;
    const isInvitee = normalizeEmail(inviteRow.invitee_email) === currentUserEmail;
    const now = new Date().toISOString();

    if (action === "cancel") {
      if (!isInviter) {
        return NextResponse.json(
          { error: "Solo quien envía la invitación puede cancelarla." },
          { status: 403 }
        );
      }

      if (inviteRow.status !== "pending") {
        return NextResponse.json(
          { error: "Solo se puede cancelar una invitación pendiente." },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("shared_agenda_invites")
        .update({
          status: "cancelled",
          responded_at: now,
          cancelled_at: now,
          cancelled_by_user_id: user.id,
        })
        .eq("id", inviteRow.id)
        .select("*")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: error.message || "No se pudo cancelar la invitación." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, invite: data });
    }

    if (action === "reject") {
      if (!isInvitee) {
        return NextResponse.json(
          { error: "Solo el destinatario puede rechazar la invitación." },
          { status: 403 }
        );
      }

      if (inviteRow.status !== "pending") {
        return NextResponse.json(
          { error: "Solo se puede rechazar una invitación pendiente." },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("shared_agenda_invites")
        .update({
          status: "rejected",
          responded_at: now,
          invitee_user_id: user.id,
        })
        .eq("id", inviteRow.id)
        .select("*")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: error.message || "No se pudo rechazar la invitación." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, invite: data });
    }

    if (action === "accept") {
      if (!isInvitee) {
        return NextResponse.json(
          { error: "Solo el destinatario puede aceptar la invitación." },
          { status: 403 }
        );
      }

      if (inviteRow.status !== "pending") {
        return NextResponse.json(
          { error: "Solo se puede aceptar una invitación pendiente." },
          { status: 400 }
        );
      }

      const [userA, userB] = sortUserPair(inviteRow.inviter_user_id, user.id);

      const { data: existingLink, error: existingLinkError } = await supabase
        .from("shared_agenda_links")
        .select("*")
        .eq("user_a_id", userA)
        .eq("user_b_id", userB)
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

      const existingLinkRow = existingLink as LinkRow | null;

      if (existingLinkRow) {
        const { error: linkUpdateError } = await supabase
          .from("shared_agenda_links")
          .update({
            is_active: true,
            created_from_invite_id: inviteRow.id,
            deactivated_at: null,
            deactivated_by_user_id: null,
          })
          .eq("id", existingLinkRow.id);

        if (linkUpdateError) {
          return NextResponse.json(
            {
              error:
                linkUpdateError.message ||
                "No se pudo reactivar la conexión compartida.",
            },
            { status: 500 }
          );
        }
      } else {
        const { error: linkInsertError } = await supabase
          .from("shared_agenda_links")
          .insert({
            user_a_id: userA,
            user_b_id: userB,
            created_from_invite_id: inviteRow.id,
            is_active: true,
          });

        if (linkInsertError) {
          return NextResponse.json(
            {
              error:
                linkInsertError.message ||
                "No se pudo crear la conexión compartida.",
            },
            { status: 500 }
          );
        }
      }

      const { data, error } = await supabase
        .from("shared_agenda_invites")
        .update({
          status: "accepted",
          invitee_user_id: user.id,
          responded_at: now,
          accepted_at: now,
        })
        .eq("id", inviteRow.id)
        .select("*")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: error.message || "No se pudo aceptar la invitación." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, invite: data });
    }

    return NextResponse.json(
      { error: "La acción solicitada no es válida." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la invitación." },
      { status: 400 }
    );
  }
}