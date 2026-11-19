"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@possos/supabase/client";

/** Espera antes de pedir la agenda otra vez: varios cambios seguidos piden una sola vez. */
const REFRESH_DELAY_MS = 250;

/**
 * Agenda en vivo del panel: escucha Postgres Changes sobre appointments filtrado por barbero y
 * vuelve a pedir la página al servidor (`router.refresh`). La fila que llega no se usa: no trae
 * nombres, y el servidor arma la agenda con RLS. Al volver a la pestaña también se refresca,
 * por si se perdió un aviso.
 *
 * El canal se llama `agenda:<barber_id>`. Realtime aplica RLS con el token de la sesión: antes
 * de suscribirse se le pasa, porque el cliente del navegador lo carga de las cookies y la
 * suscripción podría salir antes como anónima (y no recibir nada).
 */
export function useLiveAgenda(barberId: string | null) {
  const router = useRouter();

  useEffect(() => {
    if (!barberId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    };
    const channel = supabase.channel(`agenda:${barberId}`);

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `barber_id=eq.${barberId}`,
          },
          refresh,
        )
        .subscribe();
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [barberId, router]);
}
