import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@possos/ui";
import { MY_APPOINTMENTS_PATH } from "../../lib/session";
import { ReloadButton } from "../_components/retry-button";
import { SiteHeader } from "../_components/site-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.common");
  return { title: t("meta.suffix", { title: t("offline.metaTitle") }), robots: { index: false } };
}

/**
 * Pantalla sin conexión (F8, docs/11). El service worker la guarda al instalarse y la muestra
 * cuando una navegación falla por falta de red y la página no está guardada. Es estática: no
 * depende de la sesión, porque la misma copia sirve a cualquier cuenta.
 */
export default async function OfflinePage() {
  const t = await getTranslations("web.common.offline");
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-6 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <div className="grid gap-2">
          <h1 className="text-title">{t("title")}</h1>
          <p className="text-body text-fg-muted">{t("body")}</p>
          <p className="text-body text-fg-muted">{t("hint")}</p>
        </div>
        <div className="grid gap-3">
          <ReloadButton />
          <Button asChild variant="secondary">
            <Link href={MY_APPOINTMENTS_PATH}>{t("myAppointments")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
