import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@possos/ui";
import { MY_APPOINTMENTS_PATH } from "../../lib/session";
import { ReloadButton } from "../_components/retry-button";
import { SiteHeader } from "../_components/site-header";

export const metadata: Metadata = {
  title: "Sin conexión · Possos Barber",
  robots: { index: false },
};

/**
 * Pantalla sin conexión (F8, docs/11). El service worker la guarda al instalarse y la muestra
 * cuando una navegación falla por falta de red y la página no está guardada. Es estática: no
 * depende de la sesión, porque la misma copia sirve a cualquier cuenta.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-6 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <div className="grid gap-2">
          <h1 className="text-title">Sin conexión</h1>
          <p className="text-body text-fg-muted">
            No pudimos cargar esta página. Revisa tu conexión e intenta de nuevo.
          </p>
          <p className="text-body text-fg-muted">
            Para ver las horas libres, reservar, cambiar o cancelar necesitas conexión. Tus citas se
            pueden ver sin conexión en Mis citas si ya las abriste en este celular.
          </p>
        </div>
        <div className="grid gap-3">
          <ReloadButton />
          <Button asChild variant="secondary">
            <Link href={MY_APPOINTMENTS_PATH}>Ver mis citas</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
