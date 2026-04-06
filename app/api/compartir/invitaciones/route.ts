import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type CreateInviteBody = {
  invitee_email?: string;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para compartir agenda." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CreateInviteBody;
    const inviteeEmail = normalizeEmail(body.invitee_email);
    const currentUserEmail = normalizeEmail(user.email);

    if (!inviteeEmail) {
      return NextResponse.json(
        { error: "El email del compañero es obligatorio." },
        { status: 400 }
      );
    }

    if (inviteeEmail === currentUserEmail) {
      return NextResponse.json(
        { error: "No puedes invitarte a ti mismo." },
        { status: 400 }
      );
    }

    const { data: existingPendingInvite, error: existingInviteError } =
      await supabase
        .from("shared_agenda_invites")
        .select("id")
        .eq("inviter_user_id", user.id)
        .eq("invitee_email", inviteeEmail)
        .eq("status", "pending")
        .maybeSingle();

    if (existingInviteError) {
      return NextResponse.json(
        {
          error:
            existingInviteError.message ||
            "No se pudo comprobar si ya existía una invitación.",
        },
        { status: 500 }
      );
    }

    if (existingPendingInvite) {
      return NextResponse.json(
        {
          error: "Ya tienes una invitación pendiente para ese correo.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("shared_agenda_invites")
      .insert({
        inviter_user_id: user.id,
        inviter_email: currentUserEmail,
        invitee_email: inviteeEmail,
        status: "pending",
        alias_for_inviter: null,
        alias_for_invitee: null,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo crear la invitación." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, invite: data });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la invitación." },
      { status: 400 }
    );
  }
}