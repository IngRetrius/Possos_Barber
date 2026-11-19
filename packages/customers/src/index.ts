/**
 * API pública de @possos/customers: clientes, notas e inasistencias.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * Un barbero solo ve a los clientes con barber_customers con él (docs/06). El teléfono de un
 * cliente nunca se muestra a otro cliente (regla 7).
 */
import type { Tables } from "@possos/supabase";

export type Customer = Tables<"customers">;
export type BarberCustomer = Tables<"barber_customers">;
export type CustomerNote = Tables<"customer_notes">;
