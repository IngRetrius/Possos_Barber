"use client";

import { Button } from "@possos/ui";

/** Vuelve a pedir la página donde está la persona (la pantalla sin conexión no tiene ruta propia). */
export function ReloadButton() {
  return <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>;
}
