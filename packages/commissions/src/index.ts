/**
 * API pública de @possos/commissions: cobros por servicio y liquidación barbero / barbería.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * No es factura electrónica de la DIAN: en la interfaz se habla de cobros y liquidación.
 */
import type { Database, Tables } from "@possos/supabase";

export type CommissionRate = Tables<"commission_rates">;
/** Un cobro. `barber_amount_cop` y `business_amount_cop` los calcula la base y suman `amount_cop`. */
export type Charge = Tables<"charges">;
/** Totales de un barbero en un periodo, sin los cobros anulados. */
export type SettlementRow = Database["public"]["Functions"]["get_settlement"]["Returns"][number];

export {
  COMMISSIONS_ERROR_CODES,
  commissionsErrorMessage,
  type CommissionsErrorCode,
} from "./internal/errors";
export {
  formatPercent,
  periodRange,
  SETTLEMENT_PERIODS,
  splitAmount,
  type SettlementPeriod,
} from "./internal/split";
