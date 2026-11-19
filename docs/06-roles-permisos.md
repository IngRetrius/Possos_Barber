# 06. Roles y permisos

## Roles

| Rol | Quién | Cómo se obtiene |
|---|---|---|
| **Cliente** | Cualquier persona registrada | Por defecto al registrarse. No hace falta una fila de rol |
| **Barbero** | Quien corta | Fila en `staff_roles` con `role = 'barber'` más su fila en `barbers` |
| **Administrador** | El dueño | Fila en `staff_roles` con `role = 'admin'` |

- Una persona puede tener varios roles. Hoy el dueño es **administrador y barbero**, y también puede reservar como cliente desde otra cuenta si quiere probar el flujo.
- Los roles se asignan solo desde el panel del administrador o con una migración (el primer administrador). Nadie se asigna un rol a sí mismo.
- El rol se lee en la base de datos con funciones `security definer` (`is_admin()`, `current_barber_id()`) que usan las políticas RLS. No se confía en lo que diga el navegador.

## Matriz de permisos

| Recurso | Cliente | Barbero | Administrador |
|---|---|---|---|
| Servicios y barberos activos, portafolio | Ver | Ver | Ver, crear, editar y desactivar |
| Horas libres | Ver (solo horas, sin datos de quién ocupa) | Ver | Ver |
| Sus propias citas | Ver, crear, cancelar y reprogramar dentro de la política | | |
| Citas de su agenda | | Ver, crear, mover, cancelar, aprobar y marcar asistencia | |
| Citas de cualquier agenda | | | Todo |
| Perfil propio | Ver y editar | Ver y editar | Ver y editar |
| Clientes | Solo su propio registro | **Solo los que tienen al menos una cita con él**: nombre, celular, historial con él y sus notas | Todos |
| Notas del barbero sobre un cliente | No las ve | Solo las suyas | Todas |
| Contador de inasistencias | No lo ve (solo ve el aviso si necesita aprobación) | Lo ve en sus clientes | Lo ve y lo reinicia |
| Horario y bloqueos | | Los suyos | Los de todos |
| Configuración de la agenda y de los recordatorios | | | Editar |
| Registro de mensajes | | Los de sus citas | Todos |
| Cobros | | Registrar los de sus citas y corregir el monto el mismo día | Todos; anular con motivo |
| Porcentaje del barbero | | Ver el suyo | Fijarlo por barbero |
| Liquidación | | La suya | La de cada barbero y la de la barbería |
| Roles | | | Asignar y quitar |

## Notas

- **"Solo el barbero puede ver sus propios clientes"** (decisión del dueño) se cumple con RLS: un barbero lee un registro de `customers` solo si existe la relación en `barber_customers`. Esa relación se crea cuando el cliente tiene su primera cita con él o cuando el barbero lo registra a mano ([09](09-modelo-datos.md)). El administrador, que hoy es el mismo barbero, ve todos.
- Un cliente **nunca** ve el nombre ni el celular de otro. Las horas libres salen de `get_available_slots`, que solo devuelve horas de inicio.
- Las operaciones sensibles (reservar, cancelar, reprogramar, aprobar, marcar asistencia) se hacen con funciones de Postgres que validan el rol y la política adentro. El cliente no puede hacer `UPDATE` directo sobre `appointments`.
- **En la app (F3)**, las guardas de servidor de `@possos/auth/server` (`requireViewer`, `requireStaff`, `requireAdmin`) leen el rol con `is_admin()` y `current_barber_id()`. Un cliente que abre `/panel` recibe 404. El proxy de Next solo revisa que haya sesión; cada página y cada acción vuelve a verificar.
- Después de ingresar, el personal va al panel y el cliente a completar su perfil (si le falta) o a donde iba (`next`, solo rutas internas).
- **Borrar la cuenta** (Ley 1581): el cliente la borra desde su perfil con `delete_my_account()`, salvo que tenga una cita próxima. El personal no puede borrar su cuenta desde la app.
- **El primer administrador** se crea con `supabase/scripts/primer-administrador.sql` (`pnpm db:primer-admin`), sobre una cuenta que ya existe. Ver [F3-entrega](../fases/F3-entrega.md).
