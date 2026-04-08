"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import PasswordField from "@/components/PasswordField";

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered")) {
    return "Ese email ya está registrado.";
  }

  if (normalized.includes("password")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }

  return message || "No se pudo crear la cuenta.";
}

export default function RegistroPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    const cleanDisplayName = displayName.trim();
    const cleanEmail = email.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) {
      setErrorMessage(getFriendlyErrorMessage(error.message));
      setSubmitting(false);
      return;
    }

    const createdUserId = data.user?.id;

    if (createdUserId && cleanDisplayName) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: createdUserId,
        display_name: cleanDisplayName,
      });

      if (profileError) {
        setErrorMessage(
          profileError.message ||
            "La cuenta se creó, pero no se pudo guardar el nombre."
        );
        setSubmitting(false);
        return;
      }
    }

    if (data.session) {
      router.replace("/agenda");
      router.refresh();
      return;
    }

    setInfoMessage(
      "Cuenta creada. Revisa tu correo si tienes activada la confirmación por email y después inicia sesión."
    );
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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
              Crear cuenta
            </h1>

            <p className="mt-3 text-base text-slate-600">
              Registra tu acceso y entra después a tu agenda de trabajo.
            </p>
          </div>

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
                htmlFor="displayName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nombre
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="Tu nombre"
                required
              />
            </div>

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
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="tuemail@ejemplo.com"
                required
              />
            </div>

            <PasswordField
              id="password"
              label="Contraseña"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setErrorMessage("");
              }}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Tu usuario será siempre el{" "}
            <span className="font-semibold text-slate-900">
              email con el que te registras
            </span>
            . Guárdalo bien para acceder y recuperar la contraseña cuando lo
            necesites.
          </div>

          <p className="mt-5 text-sm text-slate-600">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-slate-900 underline underline-offset-4"
            >
              Entra aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}