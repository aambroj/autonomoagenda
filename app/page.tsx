import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "HuecoPro | La forma rápida de encajar trabajos",
  description:
    "Agenda simple y visual para autónomos de reparaciones, instalaciones y reformas. Encaja trabajos rápido, detecta huecos libres y trabaja sin complicaciones.",
};

const benefits = [
  {
    title: "Agenda visual de un vistazo",
    description:
      "Mira rápido los próximos días, detecta huecos reales y decide en segundos dónde encajar otro trabajo.",
  },
  {
    title: "Hecha para trabajar, no para perder tiempo",
    description:
      "Dentro tendrás una zona ligera y funcional, con lo justo para el día a día: agenda, trabajos y seguimiento.",
  },
  {
    title: "Pensada para autónomos y pequeños equipos",
    description:
      "Ideal para electricistas, fontaneros, reparaciones y reformas que necesitan orden sin complicarse con programas pesados.",
  },
  {
    title: "Cada profesional con su propia cuenta",
    description:
      "Cada autónomo tendrá su propia agenda y podrá compartir visibilidad con otro profesional activo sin perder el control de la suya.",
  },
];

const steps = [
  {
    title: "Mira tus huecos",
    description:
      "Consulta los próximos días y detecta enseguida dónde todavía cabe un trabajo más.",
  },
  {
    title: "Encaja el trabajo",
    description:
      "Apunta cliente, día, hora y duración de forma rápida para no depender de papel, WhatsApp o memoria.",
  },
  {
    title: "Haz seguimiento",
    description:
      "Marca el trabajo como comprometido, hecho, facturado o archivado y mantén la agenda limpia.",
  },
];

const audience = [
  "Electricistas",
  "Fontaneros",
  "Reparaciones",
  "Reformas",
  "Mantenimiento",
  "Autónomos y socios",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow-sm">
              HP
            </div>

            <div>
              <p className="text-base font-black leading-none text-slate-900">
                HuecoPro
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                La forma rápida de encajar trabajos
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Entrar
            </Link>

            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              Agenda simple para trabajar más rápido
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Encaja trabajos sin liarte con una agenda pesada
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              HuecoPro está pensado para autónomos que necesitan ver rápido sus
              próximos huecos, apuntar trabajos sin perder tiempo y mantener su
              jornada ordenada de forma simple.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {audience.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-bold text-white transition hover:bg-slate-800"
              >
                Crear cuenta
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              La parte comercial vive aquí fuera. Dentro, la agenda de trabajo
              será rápida, ligera y sin ruido.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Vista rápida
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    Próximos huecos
                  </p>
                </div>

                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Ligero
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Martes 7
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Primer hueco libre
                      </p>
                    </div>

                    <p className="text-2xl font-black text-emerald-700">
                      11:30
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Trabajo comprometido
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Instalación · 09:00 - 10:30
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      Ocupado
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Trabajo hecho
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Reparación · 12:00 - 13:00
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                      Hecho
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-500">
                    Dentro no hace falta marketing, solo una herramienta rápida
                    para trabajar mejor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Qué vas a encontrar
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Un producto claro por fuera y útil por dentro
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              La portada sirve para explicar y captar. La cuenta sirve para
              trabajar. Así HuecoPro sigue siendo sencillo, rápido y fácil de
              entender.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {benefits.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-xl font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Menos pasos, menos lío
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((item, index) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                  {index + 1}
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Acceso compartido entre profesionales
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Cada autónomo con su cuenta. Cada uno paga la suya.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              HuecoPro está pensado para que cada profesional tenga su propia
              agenda y, si ambos tienen cuenta activa, puedan verse en modo solo
              lectura. Sin editar la agenda ajena. Sin perder control. Y con
              opción de dejar de compartir cuando quieran.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-lg font-bold">Cuenta propia</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Cada autónomo entra con su usuario y trabaja sobre su propia
                agenda.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-lg font-bold">Visibilidad cruzada</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Si ambos tienen cuenta activa, podrán ver la agenda del otro en
                solo lectura.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-lg font-bold">Control reversible</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Compartir, dejar de compartir y volver a compartir cuando
                quieran.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Empieza hoy
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Organiza tu jornada sin recargar tu cabeza
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Regístrate, entra a tu agenda de trabajo, está pensada para
            ver huecos, encajar trabajos y seguir el estado sin complicaciones.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-bold text-white transition hover:bg-slate-800"
            >
              Registrarme
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Entrar a mi cuenta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}