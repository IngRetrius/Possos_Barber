/**
 * Correos de Supabase Auth en local: llegan a Mailpit (supabase/config.toml, [local_smtp]).
 * https://mailpit.axllent.org/docs/api-v1/
 */
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:55324";

interface Summary {
  ID: string;
  Subject: string;
}

/** Espera el último correo con ese asunto para `to` y devuelve el enlace que lleva a `path`. */
export async function linkFromEmail(
  to: string,
  subject: RegExp,
  path = "/auth/confirmar",
): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    if (search.ok) {
      const { messages } = (await search.json()) as { messages: Summary[] };
      const message = messages.find((m) => subject.test(m.Subject));
      if (message) {
        const full = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`);
        const { HTML } = (await full.json()) as { HTML: string };
        const hrefs = [...HTML.matchAll(/href="([^"]+)"/g)].map((m) =>
          m[1]!.replace(/&amp;/g, "&"),
        );
        const link = hrefs.find((href) => new URL(href).pathname === path);
        if (link) return link;
        throw new Error(`El correo "${message.Subject}" no tiene un enlace a ${path}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No llegó a Mailpit un correo para ${to}`);
}

/** Cuántos correos tiene `to` con ese asunto. */
export async function countEmails(to: string, subject: RegExp): Promise<number> {
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const { messages } = (await search.json()) as { messages: Summary[] };
  return messages.filter((m) => subject.test(m.Subject)).length;
}

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:55321";

/**
 * El mismo enlace como lo arma la plantilla por omisión de Supabase (la que usa producción en el
 * plan gratuito): `/auth/v1/verify?token=...&type=...&redirect_to=...`. Supabase verifica y
 * vuelve a `redirect_to` con `?code=`.
 */
export function asSupabaseDefaultLink(ownLink: string, type: "signup" | "recovery"): string {
  const own = new URL(ownLink);
  const verify = new URL(`${SUPABASE}/auth/v1/verify`);
  verify.searchParams.set("token", own.searchParams.get("token_hash") ?? "");
  verify.searchParams.set("type", type);
  verify.searchParams.set("redirect_to", own.searchParams.get("next") ?? "");
  return verify.toString();
}
