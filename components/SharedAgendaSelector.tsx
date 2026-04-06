"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SharedAgendaOption = {
  userId: string;
  label: string;
};

type SharedAgendaSelectorProps = {
  options: SharedAgendaOption[];
  selectedUserId: string;
};

export default function SharedAgendaSelector({
  options,
  selectedUserId,
}: SharedAgendaSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeSelectedUserId = useMemo(() => {
    if (options.length === 0) return "";
    const exists = options.some((option) => option.userId === selectedUserId);
    return exists ? selectedUserId : options[0]?.userId ?? "";
  }, [options, selectedUserId]);

  const [value, setValue] = useState(safeSelectedUserId);

  useEffect(() => {
    setValue(safeSelectedUserId);
  }, [safeSelectedUserId]);

  function handleChange(nextUserId: string) {
    setValue(nextUserId);

    const params = new URLSearchParams(searchParams.toString());

    if (nextUserId) {
      params.set("shared", nextUserId);
    } else {
      params.delete("shared");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <label
        htmlFor="shared"
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        Ver agenda compartida de
      </label>

      <select
        id="shared"
        name="shared"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        className="min-w-0 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-500"
      >
        {options.map((option) => (
          <option key={option.userId} value={option.userId}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}