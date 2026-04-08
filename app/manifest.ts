import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutonomoAgenda",
    short_name: "AutonomoAgenda",
    description:
      "Agenda simple y visual para autónomos de reparaciones, instalaciones, fontanería, electricidad y reformas.",
    start_url: "/agenda",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "es-ES",
    orientation: "portrait",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Abrir agenda",
        short_name: "Agenda",
        description: "Ir directamente a la agenda",
        url: "/agenda",
      },
      {
        name: "Entrar",
        short_name: "Login",
        description: "Ir al acceso",
        url: "/login",
      },
    ],
  };
}