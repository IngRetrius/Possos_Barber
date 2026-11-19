import type { Metadata } from "next";
import { ChevronDown, ChevronRight, ChevronUp, Plus } from "lucide-react";
import Link from "next/link";
import { servicePriceLabel } from "@possos/catalog";
import { listServices } from "@possos/catalog/server";
import { Button, formatDuration } from "@possos/ui";
import { loadAdminPanel } from "../../../../lib/panel";
import { moveServiceAction } from "../_actions/admin";
import { PanelHeader } from "../_components/panel-header";

export const metadata: Metadata = { title: "Servicios · Panel · Possos Barber" };

/** Servicios (administrador): crear, editar, ordenar y desactivar. */
export default async function ServicesPage() {
  const { db } = await loadAdminPanel("/panel/servicios");
  const result = await listServices(db);
  const services = result.ok ? [...result.data].sort((a, b) => a.sort_order - b.sort_order) : [];

  return (
    <>
      <PanelHeader title="Servicios" backHref="/panel/mas">
        <Button asChild variant="secondary" className="shrink-0 px-4">
          <Link href="/panel/servicios/nuevo">
            <Plus aria-hidden="true" strokeWidth={1.5} />
            Nuevo
          </Link>
        </Button>
      </PanelHeader>
      <main className="grid content-start gap-4 px-gutter pt-2 pb-8">
        <p className="text-body text-fg-muted">
          Los clientes los ven en este orden. Un servicio sin precio dice [PENDIENTE].
        </p>
        {!result.ok ? (
          <p role="alert" className="text-body text-danger">
            No pudimos cargar los servicios. Revisa tu conexión e intenta de nuevo
          </p>
        ) : services.length === 0 ? (
          <p className="text-body text-fg-muted">Todavía no hay servicios.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {services.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1 pr-1">
                <Link
                  href={`/panel/servicios/${s.id}`}
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 hover:bg-surface-2"
                >
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-label">{s.name}</span>
                    <span className="truncate text-caption text-fg-muted tabular-nums">
                      {formatDuration(s.duration_min)} · {servicePriceLabel(s.price_cop)}
                      {s.active ? "" : " · Inactivo"}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="size-5 text-fg-muted"
                  />
                </Link>
                <form action={moveServiceAction} className="contents">
                  <input type="hidden" name="id" value={s.id} />
                  <Button
                    type="submit"
                    name="direccion"
                    value="up"
                    variant="ghost"
                    size="icon"
                    disabled={i === 0}
                    aria-label={`Subir ${s.name}`}
                  >
                    <ChevronUp strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                  <Button
                    type="submit"
                    name="direccion"
                    value="down"
                    variant="ghost"
                    size="icon"
                    disabled={i === services.length - 1}
                    aria-label={`Bajar ${s.name}`}
                  >
                    <ChevronDown strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
