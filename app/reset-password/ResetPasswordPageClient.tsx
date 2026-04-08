"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("same password")) {
    return "La nueva contraseña no puede ser igual que la anterior.";
  }

  if (
    normalized.includes("password should be at least") ||
    normalized.includes("weak password")
  ) {
    return "La contraseña debe ser más segura.";
  }

  if (normalized.includes("session")) {
    return "El enlace ya no es válido o ha caducado. Vuelve a pedir uno nuevo.";
  }

  return message || "No se pudo cambiar la contraseña.";
}

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState(
    "Comprobando el enlace de recuperación..."
  );

  useEffect(() => {
    let isMounted = true;

    async function checkRecoveryAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session) {
        setLinkReady(true);
        setCheckingLink(false);
        setInfoMessage(
          "Ya puedes escribir una contraseña nueva para tu cuenta."
        );
        return;
      }

      setCheckingLink(false);
      setLinkReady(false);
      setInfoMessage(
        "Abre el enlace que te llegó por correo para poder cambiar la contraseña."
      );
    }

    checkRecoveryAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session)
      ) {
        setLinkReady(true);
        setCheckingLink(false);
        setErrorMessage("");
        setInfoMessage(
          "Ya puedes escribir una contraseña nueva para tu cuenta."
        );
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!linkReady) {
      setErrorMessage(
        "Necesitas abrir el enlace de recuperación del correo para continuar."
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las dos contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      router.replace("/login?passwordUpdated=1");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? getFriendlyErrorMessage(error.message)
          : "No se pudo cambiar la contraseña.";

      setErrorMessage(message);
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
              Crear nueva contraseña
            </h1>

            <p className="mt-3 text-base text-slate-600">
              Usa una contraseña nueva para volver a entrar a tu agenda.
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
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nueva contraseña
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="Mínimo 6 caracteres"
                required
                disabled={!linkReady || checkingLink || submitting}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Repetir contraseña
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500"
                placeholder="Repite la nueva contraseña"
                required
                disabled={!linkReady || checkingLink || submitting}
              />
            </div>

            <button
              type="submit"
              disabled={!linkReady || checkingLink || submitting}
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Si este enlace ha caducado o no funciona, vuelve a pedir otro desde{" "}
            <Link
              href="/recuperar-contrasena"
              className="font-semibold text-slate-900 underline underline-offset-4"
            >
              recuperar contraseña
            </Link>
            .
          </div>
        </div>
      </div>
    </main>
  );
}