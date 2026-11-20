# Entrega de F3

Estado de las cuentas y los datos personales al cerrar [F3](F3-cuentas.md), el 19/11/2026. Es el punto de partida de F4 (el paso "Confirmar" pide la cuenta) y de F6 (el panel). Lo anterior sigue en [F0](F0-entrega.md), [F1](F1-entrega.md) y [F2-entrega](F2-entrega.md); las reglas, en [CLAUDE.md](../CLAUDE.md).

## Qué existe

| Pieza | Dónde | Notas |
|---|---|---|
| Pantallas | `apps/web/app/(auth)`: `/ingresar`, `/registrarse`, `/recuperar-contrasena`, `/nueva-contrasena`, `/completar-perfil` | Formularios de `@possos/auth/ui` y `@possos/customers/ui`; acciones en `(auth)/actions.ts` y `(customer)/actions.ts` |
| Vueltas de Supabase | `/auth/callback` (Google) y `/auth/confirmar` (enlaces del correo) | Route handlers en `app/(auth)/auth/` |
| Perfil | `/perfil` | Editar nombre, celular y WhatsApp; cerrar sesión; borrar la cuenta |
| Panel | `/panel` | Solo la guarda de rol y "Cerrar sesión". La agenda es de F6 |
| Política de datos | `/politica-de-datos` | Versión `borrador-2026-11-19`. El texto legal es **[PENDIENTE]** |
| Proxy | `apps/web/proxy.ts` | Renueva la sesión y manda a ingresar a quien abre sin sesión `/perfil`, `/mis-citas`, `/panel`, `/completar-perfil` o `/nueva-contrasena` |
| Destino después de ingresar | `apps/web/lib/session.ts` | Compone auth y customers: personal al panel; cliente a completar el perfil si le falta, y después a `next` |
| `@possos/auth` | `.`, `/server`, `/ui` | `safeNext`, `withNext`, textos de error; `getViewer`, `requireViewer`, `requireStaff`, `requireAdmin`, ingreso, registro, contraseña, `deleteMyAccount`; formularios y `DeleteAccount` |
| `@possos/customers` | `.`, `/server`, `/ui` | `parseColombianMobile`, `validateProfile`, `DATA_POLICY_VERSION`, `needsConsent`; `getMyProfile`, `saveMyProfile`; `ProfileForm` |
| `@possos/supabase/proxy` | `updateSession`, `copySessionCookies` | Entrada nueva, agregada a `PUBLIC_ENTRY` de dependency-cruiser |
| `@possos/booking` | `getNextAppointment` (server), `parsePeriod`, `UPCOMING_STATUSES` | Para no borrar una cuenta con una cita próxima. F5 los usa en "Mis citas" |
| Migraciones | `20261119130000_auth_delete_account.sql`, `20261119130100_customers_consent_and_deletion.sql` | `delete_my_account()`; la base pone la hora de la autorización y anonimiza el perfil de una cuenta borrada |
| Plantillas de correo | `supabase/templates/` | Activar la cuenta y cambiar la contraseña, en español. En local las carga `config.toml`; en producción se copian a mano |
| Primer administrador | `supabase/scripts/primer-administrador.sql`, `pnpm db:primer-admin` | Ver [abajo](#primer-administrador) |
| Pruebas | `supabase/tests/database/05_accounts.test.sql` (26), Vitest en auth, customers y booking, `apps/web/e2e/cuentas.spec.ts` (9) | Playwright a 390 px contra Supabase local y Mailpit. El job `e2e` de CI ahora levanta Supabase |

No se tocó `packages/ui`.

## Cómo se usa desde F4 y F6

```ts
// Paso "Confirmar" (F4): sin sesión, los botones de cuenta vuelven aquí con lo elegido.
import { AUTH_ROUTES, withNext } from "@possos/auth";
const back = `/reservar/confirmar?servicio=${id}&hora=${encodeURIComponent(startAt)}`;
<Button asChild variant="secondary"><Link href={withNext(AUTH_ROUTES.signIn, back)}>Usar mi correo</Link></Button>
// "Continuar con Google": <GoogleSignIn action={googleAction} next={back} /> de @possos/auth/ui,
// con googleAction de app/(auth)/actions.ts, solo si isGoogleEnabled().

// Página de cliente: exige sesión y perfil completo, y vuelve a la ruta.
const { viewer, profile } = await requireCustomer(db, "/mis-citas"); // apps/web/lib/session.ts

// Página del panel (F6): cada página repite la guarda.
const viewer = await requireStaff(await createClient());
```

- Después de ingresar, `next` vuelve con su consulta intacta (`/reservar?servicio=1&hora=...`). Se probó con el registro por correo, que es el camino más largo (correo de activación y perfil).
- `CUSTOMER_HOME` es `/` desde el 19/11/2026 (antes `/perfil`, que es otro formulario y hacía creer que faltaba un paso): después de ingresar, y al guardar el perfil, el cliente llega al inicio con la sesión abierta (con "Guardamos tus cambios." si viene del perfil). El enlace "Tu perfil" del inicio usa `PROFILE_PATH`. F5 decidió dejarlo en el inicio y agregar ahí el acceso "Mis citas" (los motivos, en [F5-entrega](F5-entrega.md#por-qué-el-inicio-sigue-siendo-el-inicio-del-cliente)).

## Lo que no es evidente

### Sesión y guardas

- **Los roles salen de la base**, no de la sesión: `getViewer` verifica el JWT con `getClaims` y llama a `is_admin()` y `current_barber_id()`. Si la base no responde, trata a la persona como cliente (menos permisos, nunca más).
- **Un cliente que abre el panel recibe 404** (`notFound()`), no una redirección: el panel no existe para él.
- **El proxy solo mira si hay sesión.** Las páginas y las acciones verifican por su cuenta: Next advierte que una acción de servidor puede quedar fuera del `matcher` del proxy, y un layout no se vuelve a ejecutar al navegar entre sus páginas. Por eso el panel tiene la guarda en el layout y también en la página.
- **Si el proxy redirige, debe copiar las cookies** de la sesión renovada (`copySessionCookies`); si no, el usuario sale.
- **El personal no necesita perfil de cliente.** Va directo al panel. Si el dueño quiere reservar como cliente, lo hace con otra cuenta (docs/06).

### El parámetro `next`

- `safeNext` acepta solo rutas internas (`/algo`) y rechaza `//otro.com`, `/\otro.com`, URL absolutas y las rutas de ingreso (para no hacer bucles).
- **Los enlaces del correo traen `next` como URL absoluta**, porque las plantillas usan `{{ .RedirectTo }}`. `/auth/confirmar` la acepta solo si es del mismo origen (`safeNext(valor, origin)`). Supabase escapa bien ese valor dentro del enlace (usa `html/template`); se comprobó con una consulta de varios parámetros.

### Correos y Google

- **Hay dos clases de enlace de correo, y la app acepta las dos.** Los correos vuelven a `/auth/callback?via=correo&next=...`:
  - **Plantillas de Supabase** (producción hoy): el enlace va a `/auth/v1/verify` de Supabase, que activa la cuenta y vuelve al callback con `?code=`. El código PKCE solo se cambia en el navegador donde se pidió. En otro navegador la cuenta queda activada y la app pide ingresar ("Tu correo quedó confirmado. Ingresa con tu contraseña para seguir."); el cambio de contraseña pide abrir el enlace en el mismo navegador.
  - **Plantillas propias** (`supabase/templates`, en local): el enlace va a `/auth/confirmar?token_hash=...`, que no depende de una cookie y funciona en cualquier navegador. `next` llega como la URL del callback (`{{ .RedirectTo }}`) y la ruta saca de ahí el destino. Con PKCE el token empieza por `pkce_`, y `verifyOtp` lo acepta igual.
  - Playwright prueba las dos: las de Supabase, armando el enlace `/auth/v1/verify` con el mismo token del correo de Mailpit.
- **El plan gratuito de Supabase no deja cambiar las plantillas** sin SMTP propio (la API responde "Email template modification is not available for free tier projects"). Cuando haya SMTP, se suben las de `supabase/templates` y los enlaces pasan a funcionar en cualquier navegador.
- **Google con PKCE guarda el verificador en una cookie** del navegador que empezó el ingreso. Si Google vuelve a otro navegador (la PWA de iOS que abre Safari, [riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)), el cambio del código falla y la persona vuelve a "Ingresa" con "No pudimos ingresar con Google. Intenta de nuevo o usa tu correo".
- **El botón de Google solo aparece si Supabase lo tiene activo** (`isGoogleEnabled`, que lee `/auth/v1/settings` y lo guarda 5 minutos). Con el proveedor apagado, `signInWithOAuth` igual arma la URL y el navegador terminaría en un JSON de error de Supabase.
- **Supabase limita los reenvíos** del correo de activación: uno por segundo en local (`max_frequency`), 60 s en producción. La pantalla muestra "Hiciste muchos intentos seguidos...".
- **Si el correo ya tiene cuenta**, el registro responde igual que si fuera nuevo y no manda nada (Supabase no revela qué correos existen). "Recuperar contraseña" tampoco.

### Datos personales (Ley 1581)

- **La hora de la autorización la pone la base** (`customers_stamp_consent`), no la app. Solo cambia al crear el perfil o al aceptar otra versión de la política.
- **Versión de la política:** `DATA_POLICY_VERSION` en `packages/customers/src/internal/profile.ts`. Si el perfil tiene otra, al ingresar se pide de nuevo la autorización ("Actualizamos la política de datos"). Cuando llegue el texto del dueño, se cambian la versión y la página. La semilla usa la misma versión; si no coinciden, `cliente@ejemplo.test` tendrá que volver a autorizar.
- **Borrar la cuenta** borra el usuario de Auth. El perfil queda como "Cuenta borrada", sin celular, correo ni autorizaciones, y se borran las notas del barbero; las citas y los cobros pasados se conservan para la liquidación. Si hay una cita próxima, la app no deja borrar ("Cancélala antes de borrar tu cuenta"); cancelar desde la app llega en F5. Borrar el usuario desde el panel de Supabase también anonimiza.
- **El personal no puede borrar su cuenta desde la app** (`FORBIDDEN`): quitar a un barbero deja agenda y cobros sin dueño.
- **El celular se revisa en dos capas:** `parseColombianMobile` pide 10 dígitos que empiecen por 3 (celular, no fijo) y la base exige `+57` y 10 dígitos. El campo acepta un número pegado con +57 y espacios y lo deja en 10 dígitos.

### Componentes

- **El botón de Google va en su propio `<form>`**, antes del de correo. Dentro del mismo formulario, Enter en un campo dispararía "Continuar con Google", que sería el primer botón.
- **"Borrar mi cuenta" envía después de que la hoja se cierra del todo.** La hoja quita su entrada del historial con `history.back()`; si la acción sale antes de ese `popstate`, el router de Next la descarta junto con su redirección (pasó en la primera versión). `DeleteAccount` espera el `popstate` o 500 ms. Cualquier hoja cuya acción redirija (F5, F6) necesita lo mismo.
- **Los paquetes que usan `@possos/ui` incluyen su declaración de los PNG** en su `tsconfig.json` (`"../ui/src/internal/assets.d.ts"`). Una referencia desde `logo.tsx` chocaría con la declaración de Next en la app.
- **`validate.ts` de auth no importa `index.ts`**, que lo reexporta: dependency-cruiser cuenta los imports de tipos y lo marcaría como ciclo. Lo mismo `profile.ts` de customers.

### Supabase local y pruebas

- **`config.toml` cambió en F3:** `site_url` es `http://localhost:3000` (antes `127.0.0.1`, y las cookies de uno no sirven en el otro), redirecciones permitidas para localhost, 127.0.0.1 y la red Wi-Fi, contraseña de 8 caracteres, confirmación por correo, plantillas en español y límites de envío altos solo en local. Hay que reiniciar Supabase (`pnpm db:stop && pnpm db:start`) para que tome los cambios.
- **Playwright necesita Supabase local con la semilla.** Los correos los lee de Mailpit (`apps/web/e2e/support/mailpit.ts`); cada prueba usa un correo nuevo, así que se pueden repetir sin reiniciar la base.
- **La espera de `expect` es de 15 s**: `next dev` compila cada ruta la primera vez, y con el servidor en frío (siempre en CI) la primera visita tarda más de 5 s.
- **Después de una navegación del cliente, Next cambia el `<title>` después de pintar.** Antes de correr axe hay que esperar el título; si no, axe a veces marca `document-title`.
- **`web#build` espera a `web#typecheck`** (`turbo.json`). Corrían a la vez y el build borraba `.next/types` mientras `tsc` los leía: el CI falló así una vez. También en Vercel el build corre antes los tipos.
- **El job `e2e` de CI levanta Supabase** sin Realtime, Storage, Studio ni funciones, y pasa la URL, la clave publicable y la URL de Mailpit por `GITHUB_ENV`.

## Despliegue

- Las dos migraciones de F3 se aplicaron a producción el 19/11/2026 con `pnpm db:push`, después del CI en verde. Producción y el repo tienen las mismas 9 migraciones.
- En `https://possos-web.vercel.app` ya están `/ingresar`, `/registrarse` y `/politica-de-datos`; `/panel` sin sesión manda a ingresar. Google está activo desde el 19/11/2026 y ya hubo un ingreso de punta a punta (Google, completar perfil con las dos autorizaciones).

## Configurar en producción

Nada de esto va en el repo.

### Supabase: URL y correos

Hecho el 19/11/2026 con `supabase config push --workdir <carpeta temporal> --remote=<ref>`, con un `config.toml` que solo declara estas propiedades (la CLI no toca lo que el archivo no declara; un `config push` desde `supabase/` subiría los valores locales, como la Site URL `localhost`):

1. *Site URL* `https://possos-web.vercel.app`. Antes era `possos-web-juan-pereas-projects.vercel.app`, que pide iniciar sesión en Vercel: los enlaces de los correos habrían llevado a los clientes a ese inicio de sesión. Las *Redirect URLs* ya incluían `https://possos-web.vercel.app/**` y no se tocaron. Cuando haya dominio ([decisión 9](../docs/10-riesgos-decisiones-abiertas.md)), se agrega y pasa a ser la *Site URL*.
2. Contraseña mínima de 8 caracteres (era 6). La confirmación por correo ya estaba activa.

Pendiente:

3. **SMTP propio** en *Authentication > SMTP Settings*, antes de abrir el registro al público (F9). El correo por omisión de Supabase es de prueba, con un límite muy bajo por hora ([riesgo 13](../docs/10-riesgos-decisiones-abiertas.md)).
4. **Con el SMTP, las plantillas** de `supabase/templates/` en *Authentication > Emails > Templates* (asuntos "Confirma tu correo en Possos Barber" y "Cambia tu contraseña de Possos Barber"). Antes de eso, Supabase no deja cambiarlas.

### Google en producción

Hecho el 19/11/2026. El cliente de Google es del proyecto de Google Cloud de la barbería; el proveedor se activó con `supabase config push` desde una carpeta temporal con un `config.toml` que solo declaraba `[auth.external.google]` y el *Client ID* y el secreto por variables de entorno. El JSON que descarga Google (`client_secret_*.json`) está en `.gitignore`: no se guarda dentro del repo. En *Branding*, la página de inicio es `https://possos-web.vercel.app` y la política de privacidad `/politica-de-datos`.

1. En Google Cloud Console, un proyecto para Possos Barber. En *Google Auth Platform*: *Branding* con el nombre "Possos Barber" y un correo de soporte; *Audience* externo y **publicado** (si queda en prueba, solo entran los usuarios de prueba); *Data access* con `openid`, `userinfo.email` y `userinfo.profile` (no piden verificación de Google).
2. *Clients > Create client > Web application*. *Authorized JavaScript origins*: `https://possos-web.vercel.app`. *Authorized redirect URIs*: la URL de callback que muestra Supabase en *Authentication > Sign In / Providers > Google* (`https://<ref del proyecto>.supabase.co/auth/v1/callback`).
3. En Supabase, *Authentication > Sign In / Providers > Google*: activarlo y pegar el *Client ID* y el *Client Secret*. El secreto queda solo en Supabase (regla 6).
4. Con el dominio propio: agregarlo a los *JavaScript origins* y a *Branding* (página de inicio y política de privacidad).

En unos 5 minutos el botón "Continuar con Google" aparece solo en `/ingresar` y `/registrarse`.

### Primer administrador

1. El dueño crea su cuenta en `https://possos-web.vercel.app/registrarse` (con Google o con correo, y la activa). La app le pedirá completar el perfil como cliente; puede hacerlo.
2. Juan corre el script contra producción. La cadena de conexión sale de *Connect > Session pooler* en Supabase; sin la contraseña en la cadena, `psql` la pide y no queda en el historial:

   ```sh
   DATABASE_URL='postgresql://postgres.<ref>@<host del pooler>:5432/postgres' \
   ADMIN_EMAIL='<correo del dueño>' ADMIN_NAME='<nombre visible>' pnpm db:primer-admin
   ```

3. El script crea las filas en `staff_roles` (admin y barber), `barbers` y `commission_rates` (50 %), en una transacción. Si el correo no tiene cuenta, se detiene sin cambiar nada; si se corre dos veces, no cambia lo que ya existe. Al volver a ingresar, el dueño entra al panel.

La cuenta de Juan (desarrollador, con Google) es administradora en producción desde el 19/11/2026, sin rol de barbero ni fila en `barbers`, para no aparecer en la agenda ni en "cualquiera disponible". Se dio con un `insert` en `staff_roles`, no con el script, que también la volvería barbero. Como administrador ve los datos de todos los clientes: es encargado del tratamiento (Ley 1581) y la política del dueño debe contemplarlo.

El 19/11/2026 el dueño creó su cuenta con Google y quedó como administrador y barbero ("Santiago Possos", 50 %), con el mismo SQL del script corrido con `supabase db query --remote`. En la misma transacción se cargaron sus 9 servicios de Beunik con precio y duración, enlazados en `barber_services`. Falta su horario, cuando lo dé.

## Pendiente

- **Del dueño:** el texto de la política de tratamiento de datos, con razón social, NIT, dirección, contacto y el canal de consultas y reclamos (hoy **[PENDIENTE]** en `/politica-de-datos`), revisado por un abogado si se puede, incluido si hay que registrar la base en el RNBD ([riesgo 8](../docs/10-riesgos-decisiones-abiertas.md)). El dominio, para la URL de Google ([decisión 9](../docs/10-riesgos-decisiones-abiertas.md)).
- **De Juan:** crear el primer administrador y, antes de F9, el SMTP propio y las plantillas de correo.
- **En un iPhone real** ([riesgo 6](../docs/10-riesgos-decisiones-abiertas.md)): instalar la PWA (F8) o, mientras tanto, abrir el sitio desde la pantalla de inicio, y probar "Continuar con Google". Si vuelve a Safari en vez de a la app, el ingreso falla con el aviso de arriba; la mitigación es abrir el OAuth en una ventana emergente o recomendar el correo en iOS. Probar también que el enlace del correo abierto desde la app Mail active la cuenta. Se repite en F8 con la PWA completa.
- **"Menos de 4 toques desde Confirmar"** se mide en F4, con Google activo (ver el [cierre de F3](F3-cuentas.md#cierre-19112026)).
