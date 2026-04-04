import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateLinkBody = {
  action?: "deactivate";
};

type LinkRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  is_active: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para gestionar conexiones." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as UpdateLinkBody;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "La conexión no es válida." },
        { status: 400 }
      );
    }

    if (body.action !== "deactivate") {
      return NextResponse.json(
        { error: "La acción solicitada no es válida." },
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

    if (!linkRow.is_active) {
      return NextResponse.json({ ok: true, link: linkRow });
    }

    const { data, error } = await supabase
      .from("shared_agenda_links")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by_user_id: user.id,
      })
      .eq("id", linkRow.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo desactivar la conexión." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, link: data });
  } catch {
    return NextResponse.json(
      { error: "No se pudo desactivar la conexión." },
      { status: 400 }
    );
  }
}