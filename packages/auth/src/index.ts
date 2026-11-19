/**
 * API pública de @possos/auth: sesión, roles, guardas y formularios de ingreso.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * Los roles se deciden en la base con is_admin(), has_role() y current_barber_id() (docs/06).
 * Las guardas de servidor llegan en F3.
 */
import type { Enums, Tables } from "@possos/supabase";

export type StaffRole = Enums<"staff_role">;
export type StaffRoleRow = Tables<"staff_roles">;
