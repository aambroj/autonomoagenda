"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid email")) {
    return "Introduce un email válido.";
  }

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("rate limit")
  ) {
    return "Has hecho demasiados intentos. Espera un poco y vuelve a probar.";
  }

  return message || "No se pudo enviar el correo de recuperación.";
}

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}

export default function RecuperarContrasenaPageClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const baseUrl = getBaseUrl();

      if (!baseUrl) {
        throw new Error(
          "No se pudo preparar la recuperación de contraseña."
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${baseUrl}/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Te hemos enviado un correo para recuperar la contraseña. Revisa tu bandeja de entrada y el spam."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? getFriendlyErrorMessage(error.message)
          : "No se pudo enviar el correo de recuperación.";

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              ← Volver al acceso
            </Link>

            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              AutonomoAgenda
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Recuperar contraseña
            </h1>

            <p className="mt-3 text-base text-slate-600">
              Introduce el email con el que te registraste y te enviaremos un
              enlace para crear una contraseña nueva.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email de acceso
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="tuemail@ejemplo.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            En AutonomoAgenda tu usuario es siempre el{" "}
            <span className="font-semibold text-slate-900">email con el que te registraste</span>.
            Si no recuerdas cuál era, prueba con tus correos habituales.
          </div>

          <p className="mt-5 text-sm text-slate-600">
            ¿Ya la recuerdas?{" "}
            <Link
              href="/login"
              className="font-semibold text-slate-900 underline underline-offset-4"
            >
              Volver a entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}