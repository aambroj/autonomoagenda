import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import InternalTopbar from "@/components/InternalTopbar";
import { getSupabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Cuenta",
  description: "Cuenta de usuario en HuecoPro.",
};

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <InternalTopbar />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Cuenta
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Tu cuenta
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
            Aquí irá la información de acceso, plan y ajustes básicos. De
            momento lo dejamos simple para no recargar la agenda de trabajo.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Email de acceso
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {user.email ?? "Sin email"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Este es el usuario con el que entras a tu agenda.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Próximo bloque
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                Cuenta y suscripción
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Más adelante aquí pondremos plan, facturación y ajustes de
                acceso.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/agenda"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Volver a la agenda
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}