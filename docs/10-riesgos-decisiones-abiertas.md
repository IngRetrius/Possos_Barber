# 10. Riesgos y decisiones abiertas

Actualizado el 19/11/2026.

## Decisiones abiertas

Ordenadas por lo que bloquean. Cada una trae un valor por omisión para no detener el desarrollo.

| # | Decisión | Quién decide | Valor por omisión | Bloquea |
|---|---|---|---|---|
| 1 | **Resuelta el 19/11/2026: A.** El número actual del dueño está en su cuenta personal y sigue siendo su contacto; va a sacar un número nuevo solo para la API. Falta la SIM nueva. Ver [03](03-recordatorios-whatsapp.md#qué-número-envía-los-mensajes) | Dueño | | Alta en Meta y plantillas, hasta que exista la SIM |
| 2 | **Servicios, precios y duraciones** además del corte normal (barba, cejas, combos…) | Dueño | Resuelta el 19/11/2026: los 9 servicios de Beunik, con precio y duración, cargados en producción (la semilla local sigue con "Corte normal"). El 20/11/2026 los combos pasan a adicionales del corte (barba, cejas, diseño) que se suman en cualquier combinación, y el color va en su grupo: `supabase/scripts/adicionales-produccion.sql` | Catálogo y semillas |
| 3 | **Horario de atención** por día, descansos y si trabaja festivos | Dueño | [PENDIENTE] | Disponibilidad |
| 4 | **Dirección** de la barbería para la página y el recordatorio de 2 h | Dueño | Resuelta el 19/11/2026: Manzana 26 Casa 13, barrio Kennedy, Girardot (casa esquinera naranja) | Plantilla `recordatorio_2h` |
| 5 | **Texto de las plantillas** de WhatsApp, con su habla | Dueño | Borrador neutro y corto, en tuteo | Aprobación de plantillas |
| 6 | Enviar o no la **confirmación inmediata** por WhatsApp (cuesta unos 3 COP más por cita) | Dueño | Sí | Ninguno |
| 7 | Avisar por WhatsApp al cliente cuando **el barbero cancela** | Dueño | Sí (plantilla `cita_cancelada`) | Plantillas |
| 8 | **Intervalo de inicio** cuando haya servicios de 30 o 45 min | Dueño | 60 min hasta que lo cambie | Disponibilidad |
| 9 | **Dominio** del sitio | Dueño y Juan | [PENDIENTE] | Lanzamiento, OAuth de Google y webhook de Meta |
| 10 | **Migrar clientes de Beunik:** ¿Beunik permite exportarlos? | Juan (preguntar a Beunik) | Sin migración en el MVP | Fase 2 |
| 11 | **Logo en vector (SVG)** y fotos propias para la página y el portafolio | Dueño | El PNG de [marca/logo-possos-negro.png](marca/logo-possos-negro.png), recortado ([11](11-interfaz.md#logo)) | Diseño de la página |
| 12 | Detalles de la **tarjeta de sellos** (cuántos cortes, qué premio) | Dueño | 10 cortes, 1 gratis | Fase 2 |
| 13 | **Resuelta el 19/11/2026.** Porcentaje del barbero: 50 % para todos los servicios ([09](09-modelo-datos.md#commissions)) | Dueño | | |
| 14 | **Reseñas de Beunik** (161, con 5,0): ¿se pueden exportar o enlazar? | Juan (preguntar a Beunik) | Se pierden; se piden reseñas en Google en la fase 2 | Ninguno |
| 15 | **Tipografía de la app:** Geist en lugar de Poppins ([11](11-interfaz.md#tipografía)) | Dueño | Geist | Sistema de diseño (F1) |

## Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| 1 | **Meta pasa una plantilla a marketing**, que cuesta unas 15 veces más | Se pierde la ventaja de costo frente a Beunik | Plantillas solo transaccionales ([03](03-recordatorios-whatsapp.md)). Revisar la categoría de cada plantilla al aprobarla y en los webhooks de precios |
| 2 | **El trámite con Meta tarda** (portafolio de negocio, nombre visible, verificación, método de pago) | Retrasa el lanzamiento | Empezarlo en paralelo con el desarrollo, desde la semana 1 |
| 3 | **Tarifas de Meta distintas a las investigadas.** Las cifras salen de sitios de terceros, y Meta cambia precios cada trimestre | La estimación de costo cambia | Confirmar la tabla oficial en COP antes de lanzar. Mostrar en el panel el costo del mes, calculado con el registro de mensajes |
| 4 | **Celulares mal escritos** o sin WhatsApp | Recordatorios que no llegan | Validar el formato E.164 colombiano, registrar los estados de entrega y marcar en la agenda los teléfonos que fallan. En la fase 2, verificar el celular con un código |
| 5 | **Fricción por exigir cuenta.** Los clientes están acostumbrados a reservar por WhatsApp | Menos reservas en línea al principio | Citas manuales del personal, registro con Google en un toque, el paso de cuenta solo al final del flujo y volver a reservar con un toque |
| 6 | **El inicio de sesión con Google dentro de la PWA instalada en iOS** puede salir de la app y no volver con la sesión | El cliente queda sin sesión dentro de la app | Probarlo en un iPhone real temprano. Si falla, abrir el OAuth en una ventana emergente o recomendar correo y contraseña en iOS. F3: si Google vuelve a otro navegador, el cambio del código falla (la cookie de PKCE no está) y la app vuelve a "Ingresa" con "No pudimos ingresar con Google. Intenta de nuevo o usa tu correo". Los enlaces del correo sí funcionan en cualquier navegador. Falta la prueba en un iPhone real |
| 7 | **Push en iOS solo con la app instalada** | El barbero no recibe avisos si no instala la PWA | El barbero instala la PWA en la configuración inicial. Al cliente le llega WhatsApp, que no depende de la instalación |
| 8 | **Habeas data (Ley 1581 de 2012).** Se tratan nombre, celular e historial | Sanciones de la SIC | Autorización explícita al registrarse, política de tratamiento publicada y versionada, opción de borrar la cuenta y datos mínimos. Revisar con un abogado si la barbería debe registrar la base en el RNBD. F3: casillas separadas y sin marcar, hora de la autorización puesta por la base, versión de la política guardada (si cambia, se vuelve a pedir), página `/politica-de-datos` y borrar la cuenta. 20/11/2026: el texto de la política quedó escrito según el artículo 13 del Decreto 1377 de 2013 y describe lo que la app hace (datos, finalidades, quién los ve, proveedores en Estados Unidos, derechos, plazos de consultas y reclamos, borrado). **Faltan** el nombre o razón social, la cédula o NIT, el correo y el teléfono del responsable y la fecha de vigencia ([PENDIENTE] del dueño), y la revisión de un abogado. Cuando estén, se cambia `DATA_POLICY_VERSION` (quita "borrador") y a cada cliente se le vuelve a pedir la autorización |
| 9 | **Romper la modularidad** con atajos (importar archivos internos o escribir en tablas ajenas) | El sistema se vuelve difícil de cambiar | `exports` en cada paquete y dependency-cruiser en CI. En la revisión de código, las migraciones solo tocan tablas de su módulo |
| 10 | **Recordatorios duplicados o fuera de tiempo** si el cron falla o corre dos veces | Mala experiencia y costo extra | Clave única por trabajo, estado `sending` con bloqueo `for update skip locked`, se vuelve a leer la cita antes de enviar y hay alertas si un trabajo pasa de su hora |
| 11 | **Costo total** frente a Beunik: además de los mensajes está la infraestructura del sitio | La comparación con Beunik puede salir distinta de lo esperado | Hacer la comparación con el total mensual, no solo con el costo por mensaje |
| 12 | **Un solo desarrollador** | Riesgo de que el proyecto dependa de una persona | Documentación en `docs/`, `CLAUDE.md` con las reglas y pruebas pgTAP de las reglas críticas |
| 13 | **Correos de Supabase sin SMTP propio.** El servicio de correo por omisión de Supabase es de prueba: límite muy bajo por hora y puede no entregar a cualquier dirección | Clientes que se registran con correo y nunca reciben el enlace de activación. Además, sin SMTP propio el plan gratuito no deja usar las plantillas en español | Configurar un SMTP propio en Supabase (Authentication > SMTP) antes de abrir el registro al público (F9) y subir las plantillas de `supabase/templates/`. Mientras tanto, Google no depende del correo |

## Verificaciones pendientes antes de escribir código

- [ ] La tabla oficial de tarifas de WhatsApp en COP para Colombia (utilidad y marketing).
- [ ] Los requisitos actuales de la coexistencia y si exige un Tech Provider, en la documentación de Meta.
- [ ] El límite de mensajes por día de un negocio sin verificar.
- [x] El mecanismo de Broadcast desde la base de datos en Supabase (19/11/2026: `realtime.send` con canal público; ver [07](07-stack.md#decisiones-y-alternativas-descartadas)).
- [x] Serwist con Turbopack en la versión de Next.js que se use (19/11/2026: `@serwist/turbopack` 9.5.15 compila con Next 16.4.6; ver [07](07-stack.md)).
- [ ] El OAuth de Google en una PWA instalada en iOS (en un dispositivo real).
- [x] Capturas del inicio de Beunik PRO desde la cuenta del barbero (19/11/2026, descritas en [11](11-interfaz.md#beunik-lo-que-muestran-las-capturas-del-dueño)).
- [ ] Capturas del flujo de reserva del cliente en la app de Beunik.
