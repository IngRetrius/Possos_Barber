"use client";

import { offlineCacheKey, PRIVATE_CACHE } from "../../lib/pwa";

/**
 * Lo que se guarda para ver sin conexión es de una cuenta (regla 7). Si en este navegador entra
 * otra cuenta, o la persona cierra sesión, se borra lo guardado y se apaga el push de este
 * navegador antes de guardar nada nuevo. La cuenta se lee de la cookie de Supabase, sin red.
 *
 * Solo se decide con conexión: sin red, una sesión vencida no se puede renovar y parecería que
 * la persona cerró sesión.
 */
const OWNER_KEY = "possos:cache-owner";

let last: Promise<void> = Promise.resolve();

function readOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(owner: string) {
  try {
    window.localStorage.setItem(OWNER_KEY, owner);
  } catch {
    // Sin almacenamiento (ventana privada): no se guarda nada para sin conexión.
  }
}

async function currentUserId(): Promise<string | null | undefined> {
  const { createClient } = await import("@possos/supabase/client");
  const { data, error } = await createClient().auth.getSession();
  if (error) return undefined;
  return data.session?.user.id ?? null;
}

async function unsubscribePush() {
  const registration = await navigator.serviceWorker?.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  await subscription?.unsubscribe();
}

async function check() {
  if (!navigator.onLine || !("caches" in window)) return;
  const user = await currentUserId();
  if (user === undefined) return;
  const owner = user ?? "";
  const previous = readOwner();
  if (previous !== null && previous !== owner) {
    await caches.delete(PRIVATE_CACHE);
    // El aviso push de un barbero no debe llegarle a otra persona en este celular.
    if (previous !== "") await unsubscribePush();
  }
  writeOwner(owner);
}

/** Revisa de quién es lo guardado. Las llamadas van en fila: nunca dos a la vez. */
export function checkCacheOwner(): Promise<void> {
  last = last.then(check).catch(() => {});
  return last;
}

/**
 * Guarda estas páginas para verlas sin conexión (por ejemplo, "Mis citas" y las citas próximas,
 * aunque se hayan abierto con un enlace de la app y no como página completa). Solo si el
 * service worker ya está activo, que es quien las sirve sin conexión.
 */
export async function keepOffline(urls: string[]) {
  await checkCacheOwner();
  if (!navigator.onLine || !navigator.serviceWorker?.controller || !("caches" in window)) return;
  const cache = await caches.open(PRIVATE_CACHE);
  await Promise.all(
    urls.map(async (path) => {
      const url = new URL(path, window.location.origin).href;
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.status === 200 && !response.redirected && response.type === "basic") {
          await cache.put(offlineCacheKey(url), response);
        }
      } catch {
        // Sin red a mitad de camino: queda lo que ya estaba guardado.
      }
    }),
  );
}
