import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { APPOINTMENT_STATUS_DISPLAY } from "@possos/booking";
import { listBookingStatus, listCustomerAppointments } from "@possos/booking/server";
import { formatPhone, whatsappChatUrl } from "@possos/customers";
import { getCustomer, listNotes } from "@possos/customers/server";
import { Button, StatusBadge, toDateKey } from "@possos/ui";
import { currentFormatters } from "../../../../../lib/i18n";
import { loadPanel } from "../../../../../lib/panel";
import { deleteNoteAction } from "../../_actions/customers";
import { NoteForm, ResetNoShowsButton } from "../../_components/customer-tools";
import { PanelHeader } from "../../_components/panel-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.staff.meta"))("customer") };
}

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
  const t = await getTranslations("web.staff.customer");
  const tc = await getTranslations("web.staff.customers");
  const f = await currentFormatters();

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
              <dt className="text-caption text-fg-muted">{t("phone")}</dt>
              <dd className="text-label tabular-nums">
                {customer.phone ? formatPhone(customer.phone) : tc("noPhone")}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">{t("account")}</dt>
              <dd className="text-body">{customer.user_id ? t("hasAccount") : t("noAccount")}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">{t("reminders")}</dt>
              <dd className="text-body">
                {customer.whatsapp_opt_in ? t("wantsReminders") : t("noReminders")}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">{t("consent")}</dt>
              <dd className="text-body">
                {customer.data_consent_at
                  ? t("consentSince", { date: f.dateLong(customer.data_consent_at) })
                  : t("noConsent")}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-caption text-fg-muted">{t("noShows")}</dt>
              <dd className="flex flex-wrap items-center gap-3 text-body tabular-nums">
                {noShows}
                {booking?.requires_approval ? (
                  <StatusBadge tone="warning">{tc("needsApproval")}</StatusBadge>
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
            {t("notes")}
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
                      {f.date(n.created_at)}
                      {ctx.viewer.isAdmin && names.size > 1
                        ? ` · ${names.get(n.barber_id) ?? ""}`
                        : ""}
                    </span>
                    <form action={deleteNoteAction}>
                      <input type="hidden" name="nota" value={n.id} />
                      <input type="hidden" name="cliente" value={customer.id} />
                      <Button type="submit" variant="ghost" className="px-3 text-danger">
                        {t("deleteNote")}
                        <span className="sr-only">{t("deleteNoteHint")}</span>
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-fg-muted">{t("noNotes")}</p>
          )}
          {noteBarberId ? <NoteForm customerId={customer.id} barberId={noteBarberId} /> : null}
        </section>

        <section className="grid gap-3" aria-labelledby="historial">
          <h2 id="historial" className="text-heading">
            {t("history")}
          </h2>
          {history.ok && history.data.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {history.data.map((a) => {
                const display = APPOINTMENT_STATUS_DISPLAY[f.locale][a.status];
                return (
                  <li key={a.id}>
                    <Link
                      href={`/panel?dia=${toDateKey(a.start)}&cita=${a.id}`}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2"
                    >
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-label tabular-nums">
                          {f.date(a.start)}, {f.time(a.start)}
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
            <p className="text-body text-fg-muted">{t("noHistory")}</p>
          )}
        </section>
      </main>
    </>
  );
}
