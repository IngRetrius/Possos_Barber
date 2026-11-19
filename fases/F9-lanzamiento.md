# F9. Lanzamiento y salida de Beunik

## Objetivo

Pasar de Beunik al sitio propio sin perder citas. Al terminar, los clientes reservan en el dominio de Possos Barber, los recordatorios salen por la Cloud API y el dueño puede cancelar su plan de Beunik.

**Depende de:** F0 a F8.

## Tareas

### Datos reales

- [ ] Cargar servicios, precios, duraciones, horario, dirección, foto, portafolio y textos confirmados por el dueño. Buscar que no quede ningún **[PENDIENTE]** visible en la interfaz.
- [ ] Política de tratamiento de datos publicada con su versión.
- [ ] Logo en SVG (si ya llegó) en la página y en los íconos.

### Infraestructura

- [ ] Dominio ([decisión 9](../docs/10-riesgos-decisiones-abiertas.md)) conectado en Vercel con HTTPS.
- [ ] URL de redirección de Google y URL del webhook de Meta actualizadas al dominio.
- [ ] Migraciones aplicadas con `supabase db push` desde CI, antes del despliegue.
- [ ] Respaldo de la base de datos activado en Supabase.
- [ ] Alertas: trabajos de `message_jobs` atrasados y errores del webhook ([riesgo 10](../docs/10-riesgos-decisiones-abiertas.md)).

### Pruebas finales

- [ ] Recorrido completo en un iPhone y un Android reales: reservar, recibir los WhatsApp, confirmar con el botón, cambiar la hora, cancelar.
- [ ] El barbero usa el panel una semana completa en paralelo con Beunik.
- [ ] Tabla oficial de tarifas de Meta en COP confirmada ([riesgo 3](../docs/10-riesgos-decisiones-abiertas.md)) y comparación del costo total mensual frente a Beunik ([riesgo 11](../docs/10-riesgos-decisiones-abiertas.md)).

### Migración

- [ ] Citas futuras de Beunik: el barbero las crea en el panel (F6) o se importan si Beunik permite exportarlas ([decisión 10](../docs/10-riesgos-decisiones-abiertas.md)).
- [ ] Clientes: importar si se puede; si no, se registran solos al reservar o el barbero los crea.
- [ ] Reseñas de Beunik: averiguar si se pueden exportar o enlazar ([decisión 14](../docs/10-riesgos-decisiones-abiertas.md)).

### Anuncio

- [ ] Enlace en la bio de Instagram y en el perfil de WhatsApp Business.
- [ ] Código QR para el mostrador.
- [ ] Mensaje para los clientes habituales, enviado por el dueño desde su WhatsApp, no por la API (un mensaje así sería marketing).

### Salida de Beunik

- [ ] Fecha de corte acordada con el dueño: desde ese día las reservas en línea solo entran por el sitio nuevo.
- [ ] Cancelar el plan de Beunik cuando no queden citas allá.

## Criterios de aceptación

- Durante la semana en paralelo no hubo citas duplicadas ni recordatorios perdidos.
- El dueño confirma que puede trabajar sin abrir Beunik.
- El costo mensual real queda anotado en [docs/03](../docs/03-recordatorios-whatsapp.md).

## Necesita del dueño

- Todos los datos marcados como **[PENDIENTE]**, el dominio, la fecha de corte y el mensaje para sus clientes.
