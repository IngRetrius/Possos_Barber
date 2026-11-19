/**
 * API pública de @possos/catalog: servicios: consultas, acciones y componentes.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 */
import type { Tables } from "@possos/supabase";

/** Un servicio. `price_cop` es null mientras el dueño no confirme el precio ([PENDIENTE]). */
export type Service = Tables<"services">;
