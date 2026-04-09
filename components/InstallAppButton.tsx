"use client";

import { useEffect, useMemo, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isIOSDevice() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";

  const isIPhoneOrIPad =
    /iphone|ipad|ipod/.test(userAgent) ||
    (platform === "macintel" && window.navigator.maxTouchPoints > 1);

  return isIPhoneOrIPad;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const byMediaQuery = window.matchMedia?.("(display-mode: standalone)")
    ?.matches;
  const byNavigator = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );

  return Boolean(byMediaQuery || byNavigator);
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  const ios = useMemo(() => isIOSDevice(), []);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIOSHelp(false);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (isInstalled) return;

    if (deferredPrompt) {
      setBusy(true);

      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        setDeferredPrompt(null);
        setBusy(false);
      }

      return;
    }

    setShowIOSHelp((current) => !current);
  }

  if (isInstalled) {
    return null;
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex min-h-[64px] w-full items-center justify-center rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-5 py-3 text-center shadow-[0_12px_30px_rgba(14,165,233,0.10)] transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_16px_36px_rgba(14,165,233,0.16)] sm:w-auto"
      >
        {busy ? (
          <span className="text-sm font-bold text-sky-900 sm:text-base">
            Abriendo instalación...
          </span>
        ) : (
          <span className="flex flex-col items-center justify-center leading-tight">
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 shadow-sm">
              App
            </span>
            <span className="mt-1.5 text-base font-bold text-slate-900">
              Instalar en móvil o tablet
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500">
              Android, iPhone y iPad
            </span>
          </span>
        )}
      </button>

      <p className="mt-2 text-center text-xs leading-5 text-slate-500 sm:text-left">
        Añádela a tu pantalla de inicio para abrirla como app.
      </p>

      {showIOSHelp ? (
        <div className="mt-3 rounded-[1.5rem] border border-white/70 bg-white/88 px-4 py-4 text-left text-sm leading-6 text-slate-700 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          {ios ? (
            <>
              <p className="font-bold text-slate-900">
                Instalar en iPhone o iPad
              </p>
              <p className="mt-2">
                Abre AutonomoAgenda en <span className="font-semibold">Safari</span>,
                pulsa <span className="font-semibold">Compartir</span> y luego{" "}
                <span className="font-semibold">
                  Añadir a pantalla de inicio
                </span>
                .
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-900">
                Instalar en Android o tablet
              </p>
              <p className="mt-2">
                Si no aparece el cuadro automático, abre el menú del navegador y
                busca <span className="font-semibold">Instalar aplicación</span>{" "}
                o <span className="font-semibold">Añadir a pantalla de inicio</span>.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}