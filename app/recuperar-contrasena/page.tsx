import type { Metadata } from "next";
import RecuperarContrasenaPageClient from "./RecuperarContrasenaPageClient";

export const metadata: Metadata = {
  title: "Recuperar contraseña | AutonomoAgenda",
  description:
    "Recupera el acceso a tu cuenta de AutonomoAgenda enviando un enlace para crear una contraseña nueva.",
};

export default function RecuperarContrasenaPage() {
  return <RecuperarContrasenaPageClient />;
}