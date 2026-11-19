import type { Metadata } from "next";
import { DATA_POLICY_VERSION } from "@possos/customers";
import { SiteHeader } from "../../_components/site-header";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos · Possos Barber",
  description: "Cómo trata Possos Barber los datos personales de sus clientes (Ley 1581 de 2012).",
};

/**
 * Política de tratamiento de datos (Ley 1581 de 2012). Versionada: quien completa su perfil
 * acepta DATA_POLICY_VERSION, que se guarda en customers.data_policy_version.
 *
 * El texto legal está [PENDIENTE] del dueño, revisado por un abogado si se puede (riesgo 8 de
 * docs/10). Mientras tanto la página dice qué datos pide la app y para qué, sin inventar los
 * datos del responsable.
 */
export default function DataPolicyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="grid max-w-prose gap-6 px-gutter pt-2 pb-12">
        <div className="grid gap-2">
          <h1 className="text-title">Política de tratamiento de datos personales</h1>
          <p className="text-caption text-fg-muted">Versión {DATA_POLICY_VERSION}</p>
        </div>

        <p className="rounded-card border border-border bg-surface px-4 py-3 text-body">
          [PENDIENTE] El texto completo de esta política lo entrega Possos Barber, de acuerdo con la
          Ley 1581 de 2012 y el Decreto 1377 de 2013.
        </p>

        <section className="grid gap-2">
          <h2 className="text-heading">Responsable del tratamiento</h2>
          <p className="text-body text-fg-muted">
            Possos Barber, Ibagué. [PENDIENTE] Razón social, NIT, dirección, correo y teléfono de
            contacto.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-heading">Qué datos pedimos</h2>
          <p className="text-body text-fg-muted">
            Tu nombre, tu celular y tu correo, y el historial de tus citas (fecha, hora, servicio y
            si asististe).
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-heading">Para qué los usamos</h2>
          <ul className="grid list-disc gap-1 pl-5 text-body text-fg-muted">
            <li>Agendar, cambiar y cancelar tus citas.</li>
            <li>
              Si lo autorizas aparte, enviarte por WhatsApp la confirmación y los recordatorios de
              tus citas. Sin esa autorización no te llegan.
            </li>
          </ul>
          <p className="text-body text-fg-muted">
            Tu celular no se le muestra a otros clientes. Solo lo ve el barbero con el que tienes
            citas.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-heading">Tus derechos</h2>
          <p className="text-body text-fg-muted">
            Puedes conocer, actualizar y corregir tus datos desde tu perfil, quitar la autorización
            de WhatsApp cuando quieras y borrar tu cuenta. [PENDIENTE] El canal para consultas y
            reclamos.
          </p>
        </section>
      </main>
    </div>
  );
}
