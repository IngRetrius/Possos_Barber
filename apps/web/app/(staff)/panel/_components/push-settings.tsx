"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button, InlineError, toast } from "@possos/ui";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "../_actions/push";

type State =
  "checking" | "unsupported" | "ios-install" | "not-configured" | "denied" | "off" | "on";

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** La clave pública VAPID viene en base64url; el navegador la pide en bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function payload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}

/** El service worker activo, o null si no queda listo en 10 s (registro bloqueado o fallido). */
async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10_000)),
  ]);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * "Avisos" en "Más" (F8). El permiso del navegador se pide solo al tocar "Activar avisos",
 * nunca al abrir la app. En iPhone, los avisos solo existen con la app instalada (iOS 16.4 o
 * posterior), así que primero se explica cómo instalarla.
 */
export function PushSettings({ publicKey }: { publicKey: string | null }) {
  const t = useTranslations("web.admin.push");
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const set = (next: State) => {
      if (!cancelled) setState(next);
    };
    (async () => {
      if (!pushSupported()) return set(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      if (!publicKey) return set("not-configured");
      const registration = await readyRegistration();
      if (!registration) return set("unsupported");
      // El permiso de push (no Notification.permission, que algunos navegadores informan distinto).
      const permission = await registration.pushManager.permissionState({ userVisibleOnly: true });
      if (permission === "denied") return set("denied");
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return set("off");
      // Al día con la base: este celular pudo quedar con otra cuenta del personal.
      await savePushSubscriptionAction(payload(subscription));
      set("on");
    })().catch(() => set("off"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const fail = (message: string) => setError(message);

  const enable = () => {
    setError(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(publicKey ?? ""),
          }));
        const result = await savePushSubscriptionAction(payload(subscription));
        if (!result.ok) {
          await subscription.unsubscribe();
          fail(result.error);
          return;
        }
        setState("on");
        toast(t("enabled"));
      } catch {
        fail(navigator.onLine ? t("enableFailed") : t("enableOffline"));
      }
    });
  };

  const disable = () => {
    setError(null);
    startTransition(async () => {
      try {
        const subscription = await currentSubscription();
        if (subscription) {
          await deletePushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setState("off");
        toast(t("disabled"));
      } catch {
        fail(t("disableFailed"));
      }
    });
  };

  const test = () => {
    setError(null);
    startTransition(async () => {
      try {
        const subscription = await currentSubscription();
        if (!subscription) {
          setState("off");
          return;
        }
        const result = await sendTestPushAction(subscription.endpoint);
        if (result.ok) toast(t("testSent"));
        else fail(result.error);
      } catch {
        fail(t("testFailed"));
      }
    });
  };

  return (
    <div className="grid gap-3" aria-busy={state === "checking"}>
      <p className="text-body text-fg-muted">{t(`states.${state}`)}</p>
      {state === "off" ? (
        <Button onClick={enable} disabled={pending} aria-busy={pending}>
          {pending ? t("enabling") : t("enable")}
        </Button>
      ) : null}
      {state === "on" ? (
        <>
          <Button variant="secondary" onClick={test} disabled={pending} aria-busy={pending}>
            {t("test")}
          </Button>
          <Button variant="ghost" onClick={disable} disabled={pending}>
            {t("disable")}
          </Button>
        </>
      ) : null}
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}
