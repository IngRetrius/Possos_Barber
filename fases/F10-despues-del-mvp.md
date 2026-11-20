# F10. Después del MVP

Las fases de producto 2 y 3 de [docs/05-alcance.md](../docs/05-alcance.md). No se planean en detalle hasta terminar F9; cuando una se vuelva prioridad, se escribe su propio archivo con el mismo formato de F0 a F9.

## Fase de producto 2: retención y comodidad

Ordenadas por el valor que se espera para el barbero:

| Tema | Por qué importa | Nota |
|---|---|---|
| Lista de espera | Llena las horas que se liberan por cancelaciones | Aviso por push o WhatsApp de utilidad |
| Aviso para volver cada 15 a 20 días (pedido del dueño el 20/11/2026; lo prefiere a los cumpleaños) | Trae de vuelta al cliente que no ha reservado su siguiente corte | Es una plantilla de **marketing**, no de utilidad: unos 46 COP por mensaje ([docs/03](../docs/03-recordatorios-whatsapp.md)). Va aparte de los recordatorios, que siguen siendo de utilidad (regla 5). Necesita una autorización propia y opcional (Ley 1581 y política de Meta) y una forma de dejar de recibirlo. Solo a quien no tenga una cita futura, uno por ciclo. **[PENDIENTE]** el intervalo exacto (dueño). Paso gratis antes: lista "Por volver" en Clientes con un enlace a su WhatsApp y el texto listo |
| Cumpleaños (pedido del dueño el 20/11/2026) | El barbero lo ve en la ficha y en la cita, y el cliente recibe un corte de cortesía | Pedir solo día y mes: sin el año no se sabe la edad ni se tratan datos de menores. Contra las cuentas creadas con la fecha del día: la fecha no se cambia después de guardarla (solo la corrige el personal), y la cortesía es para quien tenga cortes atendidos (**[PENDIENTE]** cuántos, dueño) y la fecha guardada desde hace más de un mes; una por año y por celular. El barbero la aplica al cobrar. El mensaje también es de marketing |
| Verificar el celular con un código por WhatsApp | Menos recordatorios a números mal escritos | Plantilla de autenticación |
| Vincular clientes creados por el personal con su cuenta | Un solo historial por persona | Necesita la verificación del celular |
| Reportes simples | Medir si los recordatorios bajaron las inasistencias | Citas por semana, tasa de inasistencia y costo de WhatsApp |
| Tarjeta de sellos | Fidelización | Detalles en la [decisión 12](../docs/10-riesgos-decisiones-abiertas.md) |
| Reseña en Google | Clientes nuevos | Revisar la categoría de la plantilla en Meta |
| Coexistencia con el número actual | Un solo número para el cliente | Ver [docs/03](../docs/03-recordatorios-whatsapp.md) |
| Push al cliente y correo de respaldo | Otro canal además de WhatsApp | |
| Importar clientes de Beunik | Si no se hizo en F9 | |
| Nota del cliente al reservar | Fresha la ofrece en el resumen ([docs/11](../docs/11-interfaz.md)) | Necesita una columna nueva en `appointments` |

## Fase de producto 3: si el negocio crece

- Anticipos o cobro por inasistencia con Wompi, solo si los recordatorios no bastan.
- Gastos y reportes de ingresos más allá de la liquidación (que ya está en F6).
- Factura electrónica de la DIAN, si un contador confirma que el negocio la necesita.
- Porcentajes distintos por servicio, si el dueño los pide.
- Varias sedes.
- Productos y combos.
- Modo claro de la interfaz, con acentos que sirvan sobre blanco ([docs/11](../docs/11-interfaz.md#color)).
