"use client";

import { useEffect } from "react";
import { keepOffline } from "./offline-cache";

/**
 * Guarda estas páginas para verlas sin conexión (F8). Va en "Mis citas" y en cada cita: el
 * service worker guarda una página solo cuando se abre completa, y aquí también se guardan las
 * que se abren con un enlace de la app y las citas próximas que todavía no se abrieron.
 */
export function KeepOffline({ urls }: { urls: string[] }) {
  const key = urls.join("\n");
  useEffect(() => {
    void keepOffline(key.split("\n").filter(Boolean));
  }, [key]);
  return null;
}
