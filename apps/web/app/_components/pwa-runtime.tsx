"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@possos/ui";
import { SKIP_WAITING, SW_URL } from "../../lib/pwa";
import { checkCacheOwner } from "./offline-cache";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * La PWA en cada página (F8): registra el service worker, avisa "Sin conexión" y "Hay una
 * versión nueva", y en cada cambio de ruta revisa de quién es lo guardado para ver sin conexión
 * (regla 7). Los avisos son de estado: quedan visibles mientras dure el estado, no roban el
 * foco y los lectores de pantalla los anuncian (`role="status"`).
 */
export function PwaRuntime() {
  const t = useTranslations("web.common.pwa");
  const pathname = usePathname();
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;

    // Una versión nueva queda "installed" y espera. Si no hay un worker activo (primera vez),
    // no es una actualización: se activa sola.
    const track = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const onState = () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
      };
      onState();
      worker.addEventListener("statechange", onState);
    };

    navigator.serviceWorker
      .register(SW_URL, { scope: "/", type: "module", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        track(reg.installing);
        reg.addEventListener("updatefound", () => track(reg.installing));
      })
      .catch(() => {
        // Sin service worker la app funciona igual, solo que no sin conexión.
      });

    // La app instalada puede quedar abierta días: al volver a ella, busca una versión nueva.
    const onVisible = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    void checkCacheOwner();
  }, [pathname]);

  const update = () => {
    if (!waiting) return;
    setUpdating(true);
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage({ type: SKIP_WAITING });
  };

  if (!online) {
    return (
      <StatusBanner icon={<CloudOff aria-hidden="true" strokeWidth={1.5} />}>
        {t("offline")}
      </StatusBanner>
    );
  }

  if (waiting) {
    return (
      <StatusBanner
        icon={<RefreshCw aria-hidden="true" strokeWidth={1.5} />}
        action={
          <Button
            variant="secondary"
            className="shrink-0 px-4"
            onClick={update}
            disabled={updating}
            aria-busy={updating}
          >
            {updating ? t("updating") : t("update")}
          </Button>
        }
      >
        {t("newVersion")}
      </StatusBanner>
    );
  }

  return null;
}

function StatusBanner({
  icon,
  action,
  children,
}: {
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className="border-b border-border bg-surface pt-safe">
      <div className="flex min-h-12 items-center gap-3 px-gutter py-2 md:mx-auto md:max-w-2xl">
        <span className="text-fg-muted [&_svg]:size-5">{icon}</span>
        <p className="flex-1 text-body">{children}</p>
        {action}
      </div>
    </div>
  );
}
