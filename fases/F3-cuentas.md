# F3. Cuentas y datos personales

**Estado:** terminada en código el 19/11/2026. Lo que existe y lo que no es evidente está en [F3-entrega.md](F3-entrega.md). Falta configurar Google y los correos en producción, el texto de la política y la prueba en un iPhone real.

## Objetivo

Que un cliente pueda registrarse con Google o con correo, completar su perfil con celular y dar las autorizaciones que exige la Ley 1581, y que el personal entre a su panel. Al terminar, el paso "Confirmar" de F4 puede pedir la cuenta y volver sin perder lo elegido.

**Depende de:** F1 y F2. **Toca:** `packages/auth`, `packages/customers` y las rutas `(auth)` y la política de datos en `(public)`.

## Tareas

### Ingreso

- [x] Supabase Auth con Google (OAuth) y con correo y contraseña, con confirmación por correo.
- [x] Pantallas: ingresar, registrarse, recuperar contraseña y el callback de OAuth.
- [x] Parámetro `next` seguro (solo rutas internas) para volver al paso donde estaba el cliente.
- [x] Middleware que refresca la sesión y protege `(customer)` y `(staff)/panel`.
- [x] Guardas de rol en el servidor con `is_admin()` y `current_barber_id()`; nada se decide en el navegador.

### Perfil y autorizaciones

- [x] Completar perfil en el primer ingreso: nombre, celular en formato E.164 con prefijo +57, y dos casillas separadas sin marcar: tratamiento de datos (con enlace a la política) y recibir WhatsApp.
- [x] Guardar `data_consent_at` y `data_policy_version`.
- [x] Editar perfil, cambiar la autorización de WhatsApp y borrar la cuenta.
- [x] Página pública de la política de tratamiento de datos, versionada. **[PENDIENTE]** el texto, revisado por el dueño y, si se puede, por un abogado ([riesgo 8](../docs/10-riesgos-decisiones-abiertas.md)).

### Personal

- [x] El primer administrador se crea con una migración o un script, nunca desde la interfaz.
- [x] Redirección al panel si quien entra tiene rol de personal.

### Verificación de [docs/10](../docs/10-riesgos-decisiones-abiertas.md#verificaciones-pendientes-antes-de-escribir-código)

- [ ] El OAuth de Google desde la PWA instalada en un iPhone real. Si saca al usuario de la app, aplicar la mitigación del [riesgo 6](../docs/10-riesgos-decisiones-abiertas.md). Esta prueba se repite en F8 con la PWA completa.

## Criterios de aceptación

- Un cliente nuevo se registra con Google en menos de 4 toques desde "Confirmar" y vuelve al resumen con lo que había elegido.
- Sin la autorización de tratamiento de datos no se puede guardar el perfil. La de WhatsApp es opcional, y junto a la casilla se explica que sin ella no llegan los recordatorios.
- Un celular mal escrito se rechaza con un mensaje claro antes de enviar el formulario.
- Un cliente no puede abrir rutas del panel ni por URL directa.

## Pruebas

- Playwright a 390 px: registro con correo, completar perfil, cerrar sesión e ingresar de nuevo.
- Vitest de la validación del celular colombiano y del parámetro `next`.
- pgTAP: un usuario sin rol no puede insertarse en `staff_roles`.

## Cierre (19/11/2026)

- Google: el código está (`/auth/callback`, botón "Continuar con Google"), pero el proveedor está apagado en local y sin configurar en producción. El botón solo aparece cuando Supabase lo tiene activo. Los pasos están en [F3-entrega](F3-entrega.md#google-en-producción).
- "Menos de 4 toques desde Confirmar": "Confirmar" es de F4. Con una cuenta de Google ya usada en el celular, ingresar son 2 toques ("Continuar con Google" y elegir la cuenta) y vuelve a `next` con la consulta intacta (probado con correo). La primera vez se suma completar el perfil, que la Ley 1581 y la regla del celular exigen: escribir el celular, marcar la autorización y "Guardar y continuar". Se mide de verdad en F4, con Google activo.
- La autorización de datos, el celular mal escrito y el panel cerrado para clientes se prueban con Playwright a 390 px (`apps/web/e2e/cuentas.spec.ts`).
- "Un usuario sin rol no puede insertarse en `staff_roles`" ya estaba en `03_rls`; `05_accounts` agrega que un cliente no se da el rol de barbero.

## Necesita del dueño

- Texto de la política de tratamiento de datos.
- El dominio, para registrar la URL de redirección de Google ([decisión 9](../docs/10-riesgos-decisiones-abiertas.md)). Mientras tanto, se usa la de Vercel.
