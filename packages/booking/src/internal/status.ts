/*
 * Cómo se muestra cada estado de una cita (docs/11 y la página de muestras de F1). El tono es el
 * de `StatusBadge` de @possos/ui. No importa ./index para que dependency-cruiser no vea un ciclo.
 */
import type { StatusTone } from "@possos/ui";
import type { Enums } from "@possos/supabase";

type AppointmentStatus = Enums<"appointment_status">;

export const APPOINTMENT_STATUS_DISPLAY: Record<
  AppointmentStatus,
  { label: string; tone: StatusTone }
> = {
  confirmed: { label: "Confirmada", tone: "success" },
  booked: { label: "Sin confirmar", tone: "warning" },
  pending_approval: { label: "Pendiente de aprobación", tone: "warning" },
  no_show: { label: "No vino", tone: "danger" },
  completed: { label: "Completada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  rejected: { label: "Rechazada", tone: "neutral" },
};

/** "Por cerrar": cita pasada que el barbero todavía no marca (no es un estado de la base). */
export const TO_CLOSE_DISPLAY = { label: "Por cerrar", tone: "warning" } as const;
