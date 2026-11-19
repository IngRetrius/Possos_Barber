# 08. Estructura del monorepo

## Árbol propuesto

```
possos-web/
├── apps/
│   └── web/                         # Next.js: página pública, cliente y panel. Raíz de composición
│       ├── app/
│       │   ├── (public)/            # inicio, servicios, barberos, política de datos
│       │   ├── (auth)/              # ingresar, registrarse, recuperar contraseña, callback OAuth
│       │   ├── (customer)/          # reservar, mis-citas, perfil
│       │   ├── (staff)/panel/       # agenda, clientes, horario, servicios, barberos, ajustes
│       │   ├── api/
│       │   │   ├── cron/dispatch/   # Vercel Cron → notifications.dispatchDue()
│       │   │   └── whatsapp/webhook/# Meta → notifications.handleWebhook()
│       │   ├── manifest.ts          # manifiesto de la PWA
│       │   ├── serwist/[path]/      # ruta que compila y sirve el service worker (@serwist/turbopack)
│       │   └── sw.ts                # service worker (Serwist)
│       ├── lib/session.ts           # destino después de ingresar (compone auth y customers)
│       ├── proxy.ts                 # refresca la sesión (auth) y protege rutas (antes middleware.ts)
│       └── vercel.json              # crons
├── packages/
│   ├── ui/                          # sistema de diseño: tokens, componentes shadcn. Sin dominio
│   ├── supabase/                    # fábrica de clientes (navegador, servidor, admin, proxy) y tipos generados
│   ├── auth/                        # sesión, roles, guardas, formularios de ingreso
│   ├── catalog/                     # servicios: consultas, acciones y componentes
│   ├── barbers/                     # barberos, horario, bloqueos y portafolio
│   ├── customers/                   # clientes, notas e inasistencias
│   ├── booking/                     # disponibilidad, reservar, cancelar, reprogramar, estados y eventos
│   ├── commissions/                 # cobros por servicio y liquidación barbero / barbería
│   ├── notifications/               # WhatsApp, push, plantillas, despacho y webhook
│   └── config/                      # tsconfig, eslint y reglas de dependency-cruiser compartidas
├── supabase/
│   ├── config.toml
│   ├── migrations/                  # un prefijo por módulo: ..._booking_*.sql, ..._notifications_*.sql
│   ├── tests/                       # pgTAP: exclusión, RLS por rol, funciones
│   └── seed.sql                     # datos de desarrollo (servicio "Corte normal 60 min", un barbero)
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
├── .dependency-cruiser.cjs
├── CLAUDE.md
└── README.md
```

## Anatomía de un paquete de dominio

```
packages/booking/
├── package.json        # "name": "@possos/booking", con "exports" (ver abajo)
├── src/
│   ├── index.ts        # API pública: tipos y contratos (sin efectos)
│   ├── server.ts       # API pública de servidor: getAvailableSlots, book, cancel, reschedule...
│   ├── ui.ts           # API pública de UI: <BookingFlow/>, <MyAppointments/>, <StaffAgenda/>
│   ├── events.ts       # contrato de los eventos que publica (versionado)
│   └── internal/       # todo lo demás; nadie de afuera lo importa
└── sql/README.md       # qué tablas y funciones de Postgres le pertenecen
```

```json
{
  "name": "@possos/booking",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./ui": "./src/ui.ts"
  }
}
```

Con `exports` declarado, `import "@possos/booking/src/internal/x"` no resuelve: TypeScript con `moduleResolution: "bundler"` y Node respetan el campo.

## Reglas de modularidad

1. **Solo API pública.** Un paquete solo importa de otro lo que este declara en `exports`. dependency-cruiser falla en CI si alguien importa una ruta interna o un archivo fuera de `exports`.
2. **Dependencias en un solo sentido.** El grafo permitido es:
   ```
   ui, supabase, config          ← base, sin dominio
   auth                          ← ui, supabase
   catalog, barbers, customers   ← ui, supabase, auth
   booking                       ← ui, supabase, auth, catalog, barbers, customers
   commissions                   ← ui, supabase, auth, barbers, booking (solo su API pública)
   notifications                 ← supabase, booking (solo su contrato de eventos y sus acciones públicas)
   apps/web                      ← todos (raíz de composición)
   ```
   No hay ciclos. `booking` no conoce a `notifications` ni a `commissions`.
3. **Comunicación por eventos, no por llamadas cruzadas.** Cuando cambia una cita, un trigger del módulo `booking` escribe en `booking_events` (`appointment.created`, `appointment.rescheduled`, `appointment.cancelled`, `appointment.status_changed`), con un payload versionado y descrito en `packages/booking/src/events.ts`. `notifications` lee esos eventos con un cursor propio y programa los mensajes. Si se quita `notifications`, `booking` sigue funcionando igual. Si se reemplaza (por ejemplo, otro proveedor de WhatsApp), solo cambia ese paquete.
4. **Las acciones entrantes usan la API pública.** Cuando el cliente toca "Confirmo" en WhatsApp, `notifications` llama a `confirmAppointment()` de `@possos/booking/server`, que por debajo usa la función SQL `confirm_appointment`. No toca la tabla directamente.
5. **Cada módulo es dueño de sus tablas.** Sus migraciones llevan su prefijo y solo crean o alteran sus propias tablas. Para relacionarse con otro módulo usan una clave foránea al identificador público de la otra tabla (por ejemplo, `appointments.service_id → services.id`) y nunca escriben en tablas ajenas. En [09](09-modelo-datos.md) cada tabla tiene su módulo dueño.
6. **La app compone y no contiene lógica de dominio.** `apps/web` arma rutas con componentes y acciones de los paquetes. Agregar o quitar un módulo cambia la app (una ruta, un enlace en el menú), pero no los otros paquetes.
7. **Los tipos de la base son de `supabase`.** `packages/supabase` genera `database.types.ts` con la Supabase CLI. Cada módulo reexporta solo los tipos de sus tablas en su API pública.

## Despliegue en Vercel

- Un proyecto de Vercel con *Root Directory* `apps/web` y el comando de build `turbo run build --filter=web...`.
- Turborepo omite el build cuando los cambios no afectan a `web` ni a sus dependencias.
- Las migraciones de Supabase no se aplican en el build de Vercel ni con la integración de GitHub de Supabase (comprobado el 19/11/2026). Hoy se aplican a mano con `pnpm db:push` (`supabase db push --remote` sobre el proyecto enlazado), después de que pasen `pnpm db:test` y el CI. Con la CLI 3, los comandos `db` y `migration` apuntan a la base local si no llevan `--remote`. Pasarlo a un paso de CI exigiría guardar un token de acceso de Supabase en los secrets de GitHub; está pendiente de decidir.
- Variables de entorno en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la clave publicable, antes "anon key"), `SUPABASE_SECRET_KEY` (la clave secreta, antes "service role"; solo en el servidor), token y phone number ID de WhatsApp, token de verificación del webhook, secreto de la app de Meta (para validar la firma `X-Hub-Signature-256`), claves VAPID y `CRON_SECRET`.
