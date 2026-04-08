"use client";

import { useId, useState } from "react";

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
};

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "",
  autoComplete = "current-password",
  required = false,
  disabled = false,
  minLength,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-slate-700"
        >
          {label}
        </label>

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="text-sm font-semibold text-slate-600 underline underline-offset-4 transition hover:text-slate-900"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <input
        id={inputId}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-100"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        minLength={minLength}
      />
    </div>
  );
}