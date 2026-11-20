"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@possos/ui";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Límite de error de la app (F8). Lo más común en la PWA es tocar "Reservar", "Cancelar" o
 * "Cambiar la hora" sin conexión: la acción de servidor no llega y React la trata como error.
 * En vez de la pantalla genérica de Next, dice qué pasó y deja intentar de nuevo.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  return (
    <main className="grid min-h-dvh content-start gap-6 px-gutter pt-safe pb-10 md:mx-auto md:w-full md:max-w-2xl">
      <div className="grid gap-2 pt-10">
        <h1 className="text-title">{online ? "Algo salió mal" : "Sin conexión"}</h1>
        <p className="text-body text-fg-muted">
          {online
            ? "No pudimos completar la acción. Intenta de nuevo."
            : "No pudimos completar la acción. Para reservar, cambiar o cancelar necesitas conexión."}
        </p>
      </div>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </main>
  );
}
