import "server-only";
import { cookies } from "next/headers";
import type { Viewer } from "@possos/auth";
import { requireAdmin, requireStaff } from "@possos/auth/server";
import type { Barber } from "@possos/barbers";
import { listBarbers } from "@possos/barbers/server";
import type { DbClient } from "@possos/supabase";
import { createClient } from "@possos/supabase/server";

/*
 * Composición del panel (F6): quién mira y de qué barbero es la agenda.
 *
 * - Un barbero ve siempre la suya.
 * - El administrador elige el barbero (puede no ser barbero: la cuenta del desarrollador en
 *   producción es administradora sin fila en barbers). La elección queda en una cookie; si no
 *   hay, ve la propia o la del primer barbero activo.
 *
 * Cada página y cada acción llama a estas funciones: la guarda se repite en todas (F3).
 */

export const PANEL_BARBER_COOKIE = "possos_panel_barbero";

export interface PanelContext {
  db: DbClient;
  viewer: Viewer;
  /** Los barberos que puede elegir: todos para el administrador, él mismo para un barbero. */
  barbers: Barber[];
  /** El barbero cuya agenda se ve, o null si no hay ninguno (administrador sin barberos). */
  barber: Barber | null;
}

async function context(db: DbClient, viewer: Viewer): Promise<PanelContext> {
  const listed = await listBarbers(db);
  const all = listed.ok ? listed.data : [];
  if (!viewer.isAdmin) {
    const own = all.filter((b) => b.id === viewer.barberId);
    return { db, viewer, barbers: own, barber: own[0] ?? null };
  }
  const chosen = (await cookies()).get(PANEL_BARBER_COOKIE)?.value;
  const barber =
    all.find((b) => b.id === chosen) ??
    all.find((b) => b.id === viewer.barberId) ??
    all.find((b) => b.active) ??
    all[0] ??
    null;
  return { db, viewer, barbers: all, barber };
}

/** Personal (administrador o barbero). Un cliente recibe 404. */
export async function loadPanel(next = "/panel"): Promise<PanelContext> {
  const db = await createClient();
  const viewer = await requireStaff(db, next);
  return context(db, viewer);
}

/** Solo el administrador. */
export async function loadAdminPanel(next = "/panel"): Promise<PanelContext> {
  const db = await createClient();
  const viewer = await requireAdmin(db, next);
  return context(db, viewer);
}

/** Un barbero sobre el que la sesión puede actuar: el propio, o cualquiera si es administrador. */
export function canActOnBarber(ctx: PanelContext, barberId: string): boolean {
  return ctx.barbers.some((b) => b.id === barberId);
}
