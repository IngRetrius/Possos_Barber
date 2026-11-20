/// <reference lib="webworker" />
/**
 * Service worker de la PWA (F8). Lo compila la ruta de Serwist (`app/serwist/[path]/route.ts`)
 * y se registra desde `app/_components/pwa-runtime.tsx`.
 *
 * - Cáscara: los archivos del build (`__SW_MANIFEST`, solo en producción) y la pantalla sin
 *   conexión.
 * - "Mis citas" y cada cita: de la red y, sin conexión, la última versión guardada.
 * - Todo lo demás (horas libres, reservar, cancelar, cambiar, el panel): siempre de la red. Sin
 *   conexión, una navegación muestra la pantalla sin conexión.
 * - Una versión nueva espera hasta que la persona toca "Actualizar" (aviso "Hay una versión
 *   nueva"), para no cambiarle la app a mitad de una reserva.
 * - Push al barbero: muestra el aviso y, al tocarlo, abre la cita en "Hoy".
 */
import {
  NetworkFirst,
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type RouteHandlerCallback,
  type SerwistGlobalConfig,
  type Strategy,
} from "serwist";
import {
  isOfflineRoute,
  OFFLINE_PATH,
  offlineCacheKey,
  PRIVATE_CACHE,
  SHELL_CACHE,
  SKIP_WAITING,
} from "../lib/pwa";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

async function offlinePage(): Promise<Response> {
  const cached = await caches.match(OFFLINE_PATH, { cacheName: SHELL_CACHE });
  return cached ?? Response.error();
}

/**
 * Sin red (y sin copia guardada), la pantalla sin conexión. No se usa el gancho
 * `handlerDidError` de Serwist: en 9.5.15, fuera de producción, lanza después de obtener la
 * respuesta de respaldo, y la navegación falla igual.
 */
function withOfflinePage(strategy: Strategy): RouteHandlerCallback {
  return async (options) => {
    try {
      const response = await strategy.handle(options);
      return response.type === "error" ? await offlinePage() : response;
    } catch {
      return offlinePage();
    }
  };
}

/** Solo respuestas completas de la misma app: nunca una redirección (sesión vencida). */
async function onlyOk({ response }: { response: Response }) {
  return response.status === 200 && response.type === "basic" && !response.redirected
    ? response
    : null;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
  runtimeCaching: [
    {
      matcher: ({ request, url, sameOrigin }) =>
        sameOrigin && request.mode === "navigate" && isOfflineRoute(url.pathname),
      handler: withOfflinePage(
        new NetworkFirst({
          cacheName: PRIVATE_CACHE,
          plugins: [
            { cacheKeyWillBeUsed: async ({ request }) => offlineCacheKey(request.url) },
            { cacheWillUpdate: onlyOk },
          ],
        }),
      ),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: withOfflinePage(new NetworkOnly()),
    },
  ],
});

// La pantalla sin conexión se guarda con cada versión del worker (también en desarrollo, donde
// Serwist no precarga nada).
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_PATH, { cache: "reload" }))),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === SKIP_WAITING) void self.skipWaiting();
});

// ---------------------------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------------------------

interface PushData {
  title: string;
  body: string;
  url: string;
  tag: string;
}

function readPush(event: PushEvent): PushData {
  const fallback: PushData = { title: "Possos Barber", body: "", url: "/panel", tag: "possos" };
  try {
    const data = event.data?.json() as Partial<PushData> | undefined;
    return {
      title: data?.title || fallback.title,
      body: data?.body ?? "",
      url: data?.url?.startsWith("/") ? data.url : fallback.url,
      tag: data?.tag || fallback.tag,
    };
  } catch {
    return fallback;
  }
}

// iOS exige mostrar un aviso por cada push: nunca se ignora uno.
self.addEventListener("push", (event) => {
  const data = readPush(event);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon-192.png",
      lang: "es-CO",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data as { url?: string } | null)?.url;
  const url = new URL(path?.startsWith("/") ? path : "/panel", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        try {
          const focused = await open.focus();
          await focused.navigate(url);
          return;
        } catch {
          // navigate() falla si la ventana no está controlada por este worker: se abre otra.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

serwist.addEventListeners();
