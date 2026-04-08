"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function getSafeRedirect(value: string | null) {
  if (!value) return "/agenda";
  if (!value.startsWith("/")) return "/agenda";
  if (value.startsWith("//")) return "/agenda";
  return value;
}

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Email o contraseña incorrectos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Tu email todavía no está confirmado.";
  }

  return message || "No se pudo iniciar sesión.";
}

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const redirectTo = useMemo(
    () => getSafeRedirect(searchParams.get("redirectTo")),
    [searchParams]
  );

  const registered = searchParams.get("registered") === "1";
  const resetSent = searchParams.get("resetSent") === "1";
  const passwordUpdated = searchParams.get("passwordUpdated") === "1";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(getFriendlyErrorMessage(error.message));
      setSubmitting(false);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  function handleUseAnotherEmail() {
    setEmail("");
    setPassword("");
    setErrorMessage("");
    setInfoMessage("Puedes probar ahora con otro correo.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              ← Volver a la portada
            </Link>

            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              AutonomoAgenda
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Entrar
            </h1>

            <p className="mt-3 text-base text-slate-600">
              Accede a tu agenda de trabajo para ver tus huecos libres y tus
              trabajos.
            </p>
          </div>

          {registered ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Cuenta creada correctamente. Ya puedes entrar.
            </div>
          ) : null}

          {resetSent ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
              Revisa tu correo. Te hemos enviado las instrucciones para
              recuperar la contraseña.
            </div>
          ) : null}

          {passwordUpdated ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Contraseña actualizada correctamente. Ya puedes entrar.
            </div>
          ) : null}

          {infoMessage ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
              {infoMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="tuemail@ejemplo.com"
                required
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Contraseña
                </label>

                <Link
                  href="/recuperar-contrasena"
                  className="text-sm font-semibold text-slate-700 underline underline-offset-4 transition hover:text-slate-900"
                >
                  He olvidado mi contraseña
                </Link>
              </div>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="Tu contraseña"
                required
              />
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>

              <button
                type="button"
                onClick={handleUseAnotherEmail}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Usar otro email
              </button>
            </div>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Tu usuario es el <span className="font-semibold text-slate-900">email con el que te registraste</span>. Si no recuerdas cuál era, prueba con tus correos habituales o usa la recuperación de contraseña.
          </div>

          <p className="mt-5 text-sm text-slate-600">
            ¿Todavía no tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-semibold text-slate-900 underline underline-offset-4"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}