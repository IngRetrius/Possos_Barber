"use client";

import { useEffect } from "react";
import { toast } from "@possos/ui";

/** Muestra una vez el aviso que llega en la URL (`?aviso=...`) y lo quita de la URL. */
export function NoticeToast({ id, message }: { id: string; message: string }) {
  useEffect(() => {
    // Con id: el modo estricto de React corre el efecto dos veces y Sonner no lo repite.
    toast(message, { id });
    const url = new URL(window.location.href);
    url.searchParams.delete("aviso");
    window.history.replaceState(window.history.state, "", url);
  }, [id, message]);
  return null;
}
