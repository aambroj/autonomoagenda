import type { Metadata } from "next";
import Link from "next/link";
import InstallAppButton from "@/components/InstallAppButton";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AutonomoAgenda | La agenda más simple para autónomos",
  description:
    "Agenda simple y visual para autónomos de reparaciones, electricistas, fontaneros, instalaciones y reformas. Encaja trabajos rápido, detecta huecos libres y trabaja sin complicaciones.",
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

const faqItems = [
  {
    question: "¿Mi usuario es un email o un nombre?",
    answer:
      "Tu usuario de acceso es siempre el email con el que te registraste.",
  },
  {
    question: "¿Puedo compartir mi agenda con otro profesional?",
    answer:
      "Sí. La agenda compartida está pensada para ver la agenda del otro en solo lectura, sin editarla.",
  },
  {
    question: "¿Cada profesional necesita su propia cuenta?",
    answer:
      "Sí. Cada uno trabaja con su propia cuenta y su propia agenda.",
  },
  {
    question: "¿Qué pasa si olvido la contraseña?",
    answer:
      "Puedes recuperarla desde la pantalla de acceso y crear una nueva en pocos pasos.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <section className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-blue-500/20">
              AA
            </div>

            <div className="min-w-0">
              <p className="text-base font-black leading-none text-slate-900 sm:text-lg">
                <span className="block sm:inline">Autonomo</span>
                <span className="block sm:ml-1 sm:inline">Agenda</span>
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                La agenda más simple para autónomos
              </p>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
            >
              Entrar
            </Link>

            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:!text-white"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-3 pt-8 sm:px-6 sm:pb-4 sm:pt-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
              Agenda simple para trabajar más rápido
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Encaja trabajos sin liarte con una agenda pesada
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              AutonomoAgenda está pensado para autónomos que necesitan ver rápido
              sus próximos huecos, apuntar trabajos sin perder tiempo y mantener
              su jornada ordenada de forma simple, clara y profesional.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {audience.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-white/70 bg-white/75 px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-bold !text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:!text-white"
              >
                Crear cuenta
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300/80 bg-white/85 px-6 py-3.5 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
              >
                Ya tengo cuenta
              </Link>

              <InstallAppButton />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/78 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
            <div className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Vista rápida
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                    Próximos huecos
                  </p>
                </div>

                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Ligero
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 sm:text-base">
                        Martes 7
                      </p>
                      <p className="mt-1 text-sm text-slate-500 sm:text-base">
                        Primer hueco libre
                      </p>
                    </div>

                    <p className="text-2xl font-black text-emerald-700 sm:text-3xl">
                      11:30
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-red-200/80 bg-gradient-to-r from-red-50 to-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 sm:text-base">
                        Trabajo comprometido
                      </p>
                      <p className="mt-1 text-sm text-slate-500 sm:text-base">
                        Instalación · 09:00 - 10:30
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Ocupado
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 sm:text-base">
                        Trabajo hecho
                      </p>
                      <p className="mt-1 text-sm text-slate-500 sm:text-base">
                        Reparación · 12:00 - 13:00
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                      Hecho
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                    Dentro no hace falta marketing, solo una herramienta rápida
                    para trabajar mejor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-2 sm:px-6 sm:py-3">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Qué vas a encontrar
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Un producto claro por fuera y útil por dentro
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              La portada sirve para explicar y captar. La cuenta sirve para
              trabajar. Así AutonomoAgenda sigue siendo sencillo, rápido y fácil
              de entender.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {benefits.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Menos pasos, menos lío
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((item, index) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-black text-white shadow-sm">
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
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-800 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.28)] sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] !text-sky-100">
              Acceso compartido entre profesionales
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight !text-white sm:text-4xl">
              Cada autónomo con su cuenta. Cada uno paga la suya.
            </h2>

            <p className="mt-4 text-base leading-7 !text-slate-100 sm:text-lg">
              AutonomoAgenda está pensado para que cada profesional tenga su
              propia agenda y, si ambos tienen cuenta activa, puedan verse en
              modo solo lectura. Sin editar la agenda ajena. Sin perder control.
              Y con opción de dejar de compartir cuando quieran.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/20 bg-slate-900/40 p-5 backdrop-blur">
              <p className="text-lg font-bold !text-white">Cuenta propia</p>
              <p className="mt-2 text-sm leading-6 !text-slate-100">
                Cada autónomo entra con su usuario y trabaja sobre su propia
                agenda.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-slate-900/40 p-5 backdrop-blur">
              <p className="text-lg font-bold !text-white">Visibilidad cruzada</p>
              <p className="mt-2 text-sm leading-6 !text-slate-100">
                Si ambos tienen cuenta activa, podrán ver la agenda del otro en
                solo lectura.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-slate-900/40 p-5 backdrop-blur">
              <p className="text-lg font-bold !text-white">Control reversible</p>
              <p className="mt-2 text-sm leading-6 !text-slate-100">
                Compartir, dejar de compartir y volver a compartir cuando
                quieran.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Dudas habituales
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              FAQ rápida
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Respuestas cortas a las preguntas más normales antes de empezar.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-900">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 sm:text-base">
              Si quieres ver más información, puedes ir a la página completa de
              preguntas frecuentes.
            </p>

            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300/80 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
            >
              Ver FAQ completa
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/78 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Información y soporte
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              ¿Necesitas escribirnos?
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Puedes usar cualquiera de estos dos correos para información
              general o soporte del software.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <a
              href="mailto:alber.ambroj@gmail.com"
              className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Correo 1
              </p>
              <p className="mt-3 break-all text-lg font-bold text-slate-900 sm:text-xl">
                alber.ambroj@gmail.com
              </p>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Información y soporte de AutonomoAgenda.
              </p>
            </a>

            <a
              href="mailto:aambroj@yahoo.es"
              className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Correo 2
              </p>
              <p className="mt-3 break-all text-lg font-bold text-slate-900 sm:text-xl">
                aambroj@yahoo.es
              </p>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Información y soporte de AutonomoAgenda.
              </p>
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-white/82 p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Empieza hoy
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Organiza tu jornada sin recargar tu cabeza
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Regístrate, entra a tu agenda de trabajo y trabaja con una
            herramienta pensada para ver huecos, encajar trabajos y seguir el
            estado sin complicaciones.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-bold !text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:!text-white"
            >
              Registrarme
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300/80 bg-white px-6 py-3.5 text-base font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
            >
              Entrar a mi cuenta
            </Link>

            <InstallAppButton />
          </div>
        </div>
      </section>
    </main>
  );
}