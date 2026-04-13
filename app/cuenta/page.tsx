import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import InternalTopbar from "@/components/InternalTopbar";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import CopyAccessEmailButton from "@/components/CopyAccessEmailButton";
import StartSubscriptionButton from "@/components/StartSubscriptionButton";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import { getSupabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Cuenta | AutonomoAgenda",
  description: "Cuenta de usuario en AutonomoAgenda.",
};

export const dynamic = "force-dynamic";

type CuentaPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    subscription?: string;
  }>;
};

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
};

function formatPlanLabel(plan: string | null) {
  if (!plan) return "Sin plan";
  if (plan === "autonomoagenda_monthly") return "AutonomoAgenda mensual";
  return plan;
}

function normalizeStatus(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function getStatusLabel(status: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "active") return "Activa";
  if (normalized === "trialing") return "En prueba";
  if (normalized === "past_due") return "Pago pendiente";
  if (normalized === "canceled") return "Cancelada";
  if (normalized === "unpaid") return "Impagada";
  if (normalized === "incomplete") return "Pendiente de completar";

  return "Sin activar";
}

function getStatusBadgeClasses(status: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "active" || normalized === "trialing") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "past_due" || normalized === "unpaid") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "canceled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "incomplete") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatPeriodEnd(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function CuentaPage({ searchParams }: CuentaPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const checkoutStatus = resolvedSearchParams.checkout ?? "";
  const subscriptionMessage = resolvedSearchParams.subscription ?? "";

  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accessEmail = user.email ?? "Sin email";

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, cancel_at_period_end, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle<SubscriptionRow>();

  const subscriptionStatus = subscription?.status ?? "inactive";
  const subscriptionPlan = subscription?.plan ?? null;
  const formattedPeriodEnd = formatPeriodEnd(
    subscription?.current_period_end ?? null
  );

  const normalizedSubscriptionStatus = normalizeStatus(subscriptionStatus);

  const isActiveSubscription =
    normalizedSubscriptionStatus === "active" ||
    normalizedSubscriptionStatus === "trialing";

  const isManagedSubscription = [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
  ].includes(normalizedSubscriptionStatus);

  const showCheckoutSuccessMessage =
    checkoutStatus === "success" && isManagedSubscription;

  const showCheckoutCancelledMessage =
    checkoutStatus === "cancelled" && !isManagedSubscription;

  const showSubscriptionRequiredMessage =
    subscriptionMessage === "required" && !isActiveSubscription;

  const showSubscriptionErrorMessage = subscriptionMessage === "error";

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <InternalTopbar />

        <section className="min-w-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Cuenta
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Tu cuenta
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
            Aquí tienes a mano los datos básicos de acceso, el estado de tu
            suscripción y las acciones importantes de recuperación o baja.
          </p>

          {showSubscriptionRequiredMessage ? (
            <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
                Suscripción necesaria
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Necesitas una suscripción activa para entrar
              </h2>
              <p className="mt-2 text-sm leading-6 sm:text-base">
                La agenda y la parte de compartir solo están disponibles para
                cuentas con suscripción activa o en prueba. Actívala desde aquí
                y entrarás normalmente.
              </p>
            </div>
          ) : null}

          {showSubscriptionErrorMessage ? (
            <div className="mt-6 rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-red-900 shadow-sm sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700">
                No se pudo comprobar la suscripción
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Revisa el estado de tu cuenta
              </h2>
              <p className="mt-2 text-sm leading-6 sm:text-base">
                Ha ocurrido un problema al comprobar la suscripción. Recarga la
                página o vuelve a intentarlo en unos segundos.
              </p>
            </div>
          ) : null}

          {showCheckoutSuccessMessage ? (
            <div className="mt-6 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Suscripción activada
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Todo correcto, tu suscripción ya está activa
              </h2>
              <p className="mt-2 text-sm leading-6 sm:text-base">
                El pago se ha completado bien y tu cuenta ya está conectada con
                Stripe. Desde ahora puedes gestionar tu facturación desde esta
                misma pantalla.
              </p>
            </div>
          ) : null}

          {showCheckoutCancelledMessage ? (
            <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
                Pago no completado
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                La suscripción no se activó todavía
              </h2>
              <p className="mt-2 text-sm leading-6 sm:text-base">
                Has vuelto desde Stripe sin completar el alta. Puedes intentarlo
                otra vez cuando quieras desde el botón de activación.
              </p>
            </div>
          ) : null}

          <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Email de acceso
              </p>

              <p className="mt-2 break-all text-lg font-bold text-slate-900 sm:text-xl">
                {accessEmail}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Este es tu usuario de acceso. En AutonomoAgenda el usuario
                siempre es el email con el que te registraste.
              </p>

              {user.email ? (
                <div className="mt-4">
                  <CopyAccessEmailButton email={user.email} />
                </div>
              ) : null}
            </div>

            <div className="min-w-0 rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Suscripción
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold text-slate-900 sm:text-xl">
                  {formatPlanLabel(subscriptionPlan)}
                </p>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClasses(
                    subscriptionStatus
                  )}`}
                >
                  {getStatusLabel(subscriptionStatus)}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600 sm:text-base">
                <p>
                  Estado actual de la suscripción conectado con Stripe.
                </p>

                {formattedPeriodEnd ? (
                  <p>
                    Próxima fecha relevante:{" "}
                    <span className="font-semibold text-slate-900">
                      {formattedPeriodEnd}
                    </span>
                  </p>
                ) : null}

                {subscription?.cancel_at_period_end ? (
                  <p className="font-medium text-amber-700">
                    La suscripción está marcada para cancelarse al final del
                    periodo actual.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <section className="mt-8 min-w-0 rounded-[2rem] border border-emerald-200 bg-emerald-50/95 p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Suscripción y facturación
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {isActiveSubscription
                ? "Tu suscripción ya está activa"
                : "Activar o gestionar AutonomoAgenda"}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-900 sm:text-base">
              {isActiveSubscription
                ? "Ya tienes la cuenta activada. Desde aquí puedes entrar al portal de facturación para gestionar tarjeta, cancelación y datos de pago."
                : "Desde aquí puedes activar la suscripción o entrar al portal de facturación para gestionar tarjeta, cancelación y datos de pago."}
            </p>

            <div className="mt-5 grid gap-3 sm:max-w-md">
              {!isActiveSubscription ? <StartSubscriptionButton /> : null}
              {isManagedSubscription ? <ManageSubscriptionButton /> : null}
            </div>
          </section>

          <section className="mt-8 min-w-0 rounded-[2rem] border border-sky-200 bg-sky-50/95 p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Acceso y recuperación
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              ¿No recuerdas la contraseña o el usuario?
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-900 sm:text-base">
              Tu usuario es siempre tu email de acceso. Si no recuerdas la
              contraseña, puedes pedir un enlace de recuperación y crear una
              nueva.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/recuperar-contrasena"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold !text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:!text-white"
              >
                Recuperar contraseña
              </Link>

              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-300/90 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
              >
                Ir a acceso
              </Link>
            </div>
          </section>

          <section className="mt-8 min-w-0 rounded-[2rem] border border-amber-200 bg-amber-50/95 p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
              Aviso importante
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              Baja de cuenta
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900 sm:text-base">
              Ya puedes darte de baja tú mismo escribiendo una confirmación
              manual. Esta baja eliminará tu acceso, tus trabajos y las
              conexiones compartidas activas.
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900 sm:text-base">
              La gestión de cancelación de la suscripción la haces desde
              facturación.
            </p>
          </section>

          <div className="mt-8 min-w-0">
            <DeleteAccountForm />
          </div>

          <div className="mt-6">
            <Link
              href="/agenda"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-slate-300/90 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
            >
              Volver a la agenda
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
