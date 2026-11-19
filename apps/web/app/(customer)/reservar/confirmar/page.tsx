import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, withNext } from "@possos/auth";
import { getViewer, isGoogleEnabled } from "@possos/auth/server";
import { GoogleSignIn } from "@possos/auth/ui";
import {
  ANY_BARBER,
  BOOKING_ROUTES,
  parseSelection,
  selectionHref,
  stepPosition,
} from "@possos/booking";
import { getAvailableStarts, requiresApproval } from "@possos/booking/server";
import { AppointmentSummary, BookForm } from "@possos/booking/ui";
import { servicePriceLabel } from "@possos/catalog";
import { needsConsent } from "@possos/customers";
import { getMyProfile } from "@possos/customers/server";
import { createClient } from "@possos/supabase/server";
import { Button, formatDate, formatTime, StepHeader, toDateKey } from "@possos/ui";
import { addressLabel } from "../../../../lib/business";
import {
  barberName,
  loadBookingFlow,
  missingStepHref,
  previousStepHref,
  resolvedSelection,
} from "../../../../lib/booking-flow";
import { COMPLETE_PROFILE, STAFF_HOME } from "../../../../lib/session";
import { googleAction } from "../../../(auth)/actions";
import { bookAction } from "../actions";

export const metadata: Metadata = { title: "Confirma tu cita · Possos Barber" };

const POLICY = "Puedes cancelar o cambiar tu cita hasta 2 horas antes.";
const APPROVAL = "Tu reserva queda pendiente de que el barbero la apruebe";

/**
 * Paso "Confirmar": resumen, política de 2 h y, según quién mira:
 * sin sesión, los botones de cuenta (vuelven aquí con lo elegido); con perfil incompleto,
 * completar el perfil; cliente listo, "Reservar" en la barra inferior.
 */
export default async function ConfirmStepPage({ searchParams }: PageProps<"/reservar/confirmar">) {
  const raw = parseSelection(await searchParams);
  const db = await createClient();
  const flow = await loadBookingFlow(db, raw);
  const missing = missingStepHref(flow);
  if (missing) redirect(missing);

  const selection = resolvedSelection(flow, raw);
  const service = flow.service!;
  const barberId = flow.barberId!;
  if (!selection.startAt) redirect(selectionHref(BOOKING_ROUTES.time, selection));

  const startAt = selection.startAt;
  const date = toDateKey(startAt);
  const here = selectionHref(BOOKING_ROUTES.confirm, { ...selection, date });

  // La hora pudo ocuparse mientras el cliente se registraba.
  const starts = await getAvailableStarts(db, {
    serviceId: service.id,
    day: date,
    barberId: barberId === ANY_BARBER ? undefined : barberId,
  });
  if (starts.ok && !starts.data.includes(startAt)) {
    redirect(
      selectionHref(
        BOOKING_ROUTES.time,
        { ...selection, date, startAt: null },
        { aviso: "ocupada" },
      ),
    );
  }

  const end = new Date(Date.parse(startAt) + service.duration_min * 60_000).toISOString();
  const viewer = await getViewer(db);

  let account: React.ReactNode = null;
  let bottom: React.ReactNode = null;
  if (!viewer) {
    const google = await isGoogleEnabled();
    account = (
      <section aria-labelledby="cuenta" className="grid gap-3">
        <h2 id="cuenta" className="text-heading">
          Para reservar, ingresa
        </h2>
        <p className="text-body text-fg-muted">
          Con tu cuenta te avisamos de tu cita y puedes cambiarla o cancelarla. Vuelves aquí con la
          misma hora.
        </p>
        {google ? <GoogleSignIn action={googleAction} next={here} /> : null}
        <Button asChild variant="secondary">
          <Link href={withNext(AUTH_ROUTES.signIn, here)}>Usar mi correo</Link>
        </Button>
      </section>
    );
  } else if (viewer.isStaff) {
    account = (
      <section className="grid gap-3 rounded-card border border-border bg-surface p-4">
        <p className="text-body text-fg-muted">
          Estás con una cuenta del personal. Las citas de los clientes se crean desde el panel; para
          reservar como cliente, usa otra cuenta.
        </p>
        <Button asChild variant="secondary">
          <Link href={STAFF_HOME}>Ir al panel</Link>
        </Button>
      </section>
    );
  } else {
    const profile = await getMyProfile(db, viewer.userId);
    if (!profile.ok || !profile.data || needsConsent(profile.data)) {
      account = (
        <section className="grid gap-3">
          <p className="text-body text-fg-muted">Completa tu perfil para reservar.</p>
          <Button asChild>
            <Link href={withNext(COMPLETE_PROFILE, here)}>Completar mi perfil</Link>
          </Button>
        </section>
      );
    } else {
      const approval = await requiresApproval(db);
      if (approval.ok && approval.data) {
        account = (
          <p
            role="note"
            className="rounded-card border border-warning px-4 py-3 text-body text-warning"
          >
            {APPROVAL}
          </p>
        );
      }
      bottom = (
        <BookForm
          action={bookAction}
          serviceId={service.id}
          barberId={barberId}
          date={date}
          startAt={startAt}
          summary={`${formatDate(startAt)} · ${formatTime(startAt)}`}
        />
      );
    }
  }

  const position = stepPosition("confirm", flow.steps);
  return (
    <>
      <StepHeader
        {...position}
        backHref={previousStepHref(flow, "confirm", { ...selection, date })}
      />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <h1 className="text-title">Revisa tu cita</h1>
        <AppointmentSummary
          serviceName={service.name}
          start={startAt}
          end={end}
          barberName={barberName(flow, barberId)}
          priceLabel={servicePriceLabel(service.price_cop)}
          location={addressLabel()}
        />
        <p className="text-body text-fg-muted">{POLICY}</p>
        {account}
      </main>
      {bottom}
    </>
  );
}
