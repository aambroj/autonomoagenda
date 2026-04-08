import type { Metadata } from "next";
import ResetPasswordPageClient from "./ResetPasswordPageClient";

export const metadata: Metadata = {
  title: "Nueva contraseña | AutonomoAgenda",
  description:
    "Crea una contraseña nueva para volver a entrar en tu cuenta de AutonomoAgenda.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}