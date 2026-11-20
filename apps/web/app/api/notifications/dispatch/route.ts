import { timingSafeEqual } from "node:crypto";
import { runDispatch } from "../../../../lib/dispatch";

/**
 * Despacho de booking_events (F8). La llama la base: pg_net con cada evento y pg_cron cada
 * minuto si algo quedó atrás (ver la migración notifications_dispatch y docs/07). También
 * acepta GET, que es lo que manda Vercel Cron, por si algún día se usa.
 *
 * Exige `Authorization: Bearer <CRON_SECRET>`. El mismo valor vive en Supabase Vault
 * (`notifications_dispatch_secret`); nunca en el repo (regla 6).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
  if (!authorized(request, secret)) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const report = await runDispatch();
  return Response.json({ ok: true, ...report });
}

export const GET = handle;
export const POST = handle;
