import type { Metadata } from "next";
import { SignOutButton } from "@possos/auth/ui";
import { List, ListRow } from "@possos/ui";
import { signOutAction } from "../../../(auth)/actions";
import { loadPanel } from "../../../../lib/panel";
import { PushSettings } from "../_components/push-settings";

export const metadata: Metadata = { title: "Más · Panel · Possos Barber" };

/**
 * "Más" (docs/11): lo que no se usa todos los días. Lo del administrador solo lo ve él.
 * "Avisos" (F8) va primero y solo para quien es barbero: es lo único que se hace una vez por
 * celular y el dueño lo busca al instalar la app.
 */
export default async function MorePage() {
  const ctx = await loadPanel("/panel/mas");
  const { viewer } = ctx;
  const roles = [viewer.isAdmin ? "Administrador" : null, viewer.barberId ? "barbero" : null]
    .filter(Boolean)
    .join(" y ");

  return (
    <main className="grid content-start gap-6 px-gutter pt-safe pb-6">
      <header className="grid gap-1 pt-4">
        <h1 className="text-title">Más</h1>
        <p className="text-body text-fg-muted">
          {roles.charAt(0).toUpperCase() + roles.slice(1)}
          {viewer.email ? ` · ${viewer.email}` : ""}
        </p>
      </header>

      {viewer.barberId ? (
        <section className="grid gap-3" aria-labelledby="avisos">
          <h2 id="avisos" className="text-heading">
            Avisos
          </h2>
          <PushSettings publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-heading">Cobros</h2>
        <List>
          <ListRow
            title="Liquidación"
            detail="Lo cobrado por periodo y el reparto con la barbería"
            href="/panel/liquidacion"
          />
        </List>
      </section>

      <section className="grid gap-3">
        <h2 className="text-heading">Agenda</h2>
        <List>
          <ListRow
            title="Horario semanal"
            detail="Días y horas de atención"
            href="/panel/horario"
          />
          <ListRow
            title="Bloqueos"
            detail="Almuerzo, vacaciones y festivos"
            href="/panel/bloqueos"
          />
        </List>
      </section>

      {viewer.isAdmin ? (
        <section className="grid gap-3">
          <h2 className="text-heading">Administración</h2>
          <List>
            <ListRow
              title="Servicios"
              detail="Nombre, duración, precio y orden"
              href="/panel/servicios"
            />
            <ListRow
              title="Barberos"
              detail="Perfil, foto, portafolio y servicios"
              href="/panel/barberos"
            />
            <ListRow
              title="Porcentajes"
              detail="El reparto de cada barbero"
              href="/panel/porcentajes"
            />
            <ListRow
              title="Configuración"
              detail="Reglas de la agenda y recordatorios"
              href="/panel/configuracion"
            />
            <ListRow title="Roles" detail="Barberos y administradores" href="/panel/roles" />
          </List>
        </section>
      ) : null}

      <SignOutButton action={signOutAction} />
    </main>
  );
}
