import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APPOINTMENT_STATUS_DISPLAY } from "@possos/booking";
import { listBookingStatus, listCustomerAppointments } from "@possos/booking/server";
import { formatPhone, whatsappChatUrl } from "@possos/customers";
import { getCustomer, listNotes } from "@possos/customers/server";
import { Button, formatDate, formatDateLong, formatTime, StatusBadge, toDateKey } from "@possos/ui";
import { loadPanel } from "../../../../../lib/panel";
import { deleteNoteAction } from "../../_actions/customers";
import { NoteForm, ResetNoShowsButton } from "../../_components/customer-tools";
import { PanelHeader } from "../../_components/panel-header";

export const metadata: Metadata = { title: "Cliente · Panel · Possos Barber" };

/**
 * Ficha del cliente (docs/11): datos de contacto, inasistencias, historial de citas y notas
 * privadas. RLS: el barbero solo abre la de sus clientes (los demás dan 404) y ve sus citas y
 * sus notas; el administrador ve todo y reinicia las inasistencias.
 */
export default async function CustomerPage({ params }: PageProps<"/panel/clientes/[id]">) {
  const { id } = await params;
  const ctx = await loadPanel(`/panel/clientes/${id}`);
  const found = await getCustomer(ctx.db, id);
  if (!found.ok || !found.data) notFound();
  const customer = found.data;

  const noteBarberId = ctx.viewer.barberId ?? ctx.barber?.id ?? null;
  const [status, history, notes] = await Promise.all([
    listBookingStatus(ctx.db, [id]),
    listCustomerAppointments(ctx.db, { customerId: id }),
    listNotes(ctx.db, { customerId: id }),
  ]);
  const booking = status.ok ? status.data[0] : undefined;
  const noShows = booking?.no_show_count ?? 0;
  const chat = whatsappChatUrl(customer.phone);
  const names = new Map(ctx.barbers.map((b) => [b.id, b.display_name]));

  return (
    <>
      <PanelHeader title={customer.full_name} backHref="/panel/clientes" />
      <main className="grid content-start gap-8 px-gutter pb-8">
        <section className="grid gap-3">
          {chat ? (
            <Button asChild variant="secondary">
              <a href={chat} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden="true" strokeWidth={1.5} />
                WhatsApp
              </a>
            </Button>
          ) : null}
          <dl className="grid gap-3 rounded-card border border-border bg-surface p-4">
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">Celular</dt>
              <dd className="text-label tabular-nums">
                {customer.phone ? formatPhone(customer.phone) : "Sin celular"}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">Cuenta</dt>
              <dd className="text-body">
                {customer.user_id
                  ? "Tiene cuenta en la app"
                  : "Sin cuenta (lo registró el personal)"}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">Recordatorios por WhatsApp</dt>
              <dd className="text-body">
                {customer.whatsapp_opt_in ? "Sí los quiere" : "No los quiere"}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">Autorización de datos</dt>
              <dd className="text-body">
                {customer.data_consent_at
                  ? `Desde el ${formatDateLong(customer.data_consent_at)}`
                  : "Sin autorización registrada"}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">Inasistencias</dt>
              <dd className="flex flex-wrap items-center gap-3 text-body tabular-nums">
                {noShows}
                {booking?.requires_approval ? (
                  <StatusBadge tone="warning">Necesita aprobación</StatusBadge>
                ) : null}
              </dd>
            </div>
          </dl>
          {ctx.viewer.isAdmin && (noShows > 0 || booking?.requires_approval) ? (
            <ResetNoShowsButton customerId={customer.id} />
          ) : null}
        </section>

        <section className="grid gap-3" aria-labelledby="notas">
          <h2 id="notas" className="text-heading">
            Notas
          </h2>
          {notes.ok && notes.data.length > 0 ? (
            <ul className="grid gap-2">
              {notes.data.map((n) => (
                <li
                  key={n.id}
                  className="grid gap-2 rounded-card border border-border bg-surface p-4"
                >
                  <p className="text-body whitespace-pre-line">{n.body}</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption text-fg-muted">
                      {formatDate(n.created_at)}
                      {ctx.viewer.isAdmin && names.size > 1
                        ? ` · ${names.get(n.barber_id) ?? ""}`
                        : ""}
                    </span>
                    <form action={deleteNoteAction}>
                      <input type="hidden" name="nota" value={n.id} />
                      <input type="hidden" name="cliente" value={customer.id} />
                      <Button type="submit" variant="ghost" className="px-3 text-danger">
                        Borrar<span className="sr-only"> la nota</span>
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-fg-muted">Sin notas.</p>
          )}
          {noteBarberId ? <NoteForm customerId={customer.id} barberId={noteBarberId} /> : null}
        </section>

        <section className="grid gap-3" aria-labelledby="historial">
          <h2 id="historial" className="text-heading">
            Historial
          </h2>
          {history.ok && history.data.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {history.data.map((a) => {
                const display = APPOINTMENT_STATUS_DISPLAY[a.status];
                return (
                  <li key={a.id}>
                    <Link
                      href={`/panel?dia=${toDateKey(a.start)}&cita=${a.id}`}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2"
                    >
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-label tabular-nums">
                          {formatDate(a.start)}, {formatTime(a.start)}
                        </span>
                        <span className="truncate text-caption text-fg-muted">
                          {a.serviceName}
                          {ctx.viewer.isAdmin && names.size > 1
                            ? ` · ${names.get(a.barberId) ?? ""}`
                            : ""}
                        </span>
                      </span>
                      <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body text-fg-muted">Sin citas.</p>
          )}
        </section>
      </main>
    </>
  );
}
