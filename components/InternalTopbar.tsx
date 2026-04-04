"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

function getLinkClasses(isActive: boolean) {
  return isActive
    ? "inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
    : "inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";
}

export default function InternalTopbar() {
  const pathname = usePathname();

  return (
    <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/agenda" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
              HP
            </div>

            <div>
              <p className="text-base font-black leading-none text-slate-900">
                HuecoPro
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Agenda de trabajo
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/agenda"
              className={getLinkClasses(pathname === "/agenda")}
            >
              Agenda
            </Link>

            <Link
              href="/compartir"
              className={getLinkClasses(pathname === "/compartir")}
            >
              Compartir
            </Link>

            <Link
              href="/cuenta"
              className={getLinkClasses(pathname === "/cuenta")}
            >
              Cuenta
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}