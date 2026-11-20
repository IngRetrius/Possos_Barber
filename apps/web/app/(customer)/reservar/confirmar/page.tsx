import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { Button, StepHeader, toDateKey } from "@possos/ui";
import { addressLabel } from "../../../../lib/business";
import {
  barberName,
  loadBookingFlow,
  missingStepHref,
  previousStepHref,
  resolvedSelection,
} from "../../../../lib/booking-flow";
import { currentFormatters } from "../../../../lib/i18n";
import { COMPLETE_PROFILE, STAFF_HOME } from "../../../../lib/session";
import { googleAction } from "../../../(auth)/actions";
import { bookAction } from "../actions";
import { LocaleSwitch } from "../../../_components/locale-switch";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("confirm") };
}

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
  const total = flow.total!;
  const barberId = flow.barberId!;
  if (!selection.startAt) redirect(selectionHref(BOOKING_ROUTES.time, selection));

  const startAt = selection.startAt;
  const date = toDateKey(startAt);
  const here = selectionHref(BOOKING_ROUTES.confirm, { ...selection, date });

  // La hora pudo ocuparse mientras el cliente se registraba.
  const starts = await getAvailableStarts(db, {
    serviceId: service.id,
    addonIds: selection.addonIds,
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

  const end = new Date(Date.parse(startAt) + total.durationMin * 60_000).toISOString();
  const viewer = await getViewer(db);
  const t = await getTranslations("web.customer");
  const f = await currentFormatters();

  let account: React.ReactNode = null;
  let bottom: React.ReactNode = null;
  if (!viewer) {
    const google = await isGoogleEnabled();
    account = (
      <section aria-labelledby="cuenta" className="grid gap-3">
        <h2 id="cuenta" className="text-heading">
          {t("confirm.signInTitle")}
        </h2>
        <p className="text-body text-fg-muted">{t("confirm.signInBody")}</p>
        {google ? <GoogleSignIn action={googleAction} next={here} /> : null}
        <Button asChild variant="secondary">
          <Link href={withNext(AUTH_ROUTES.signIn, here)}>{t("confirm.useEmail")}</Link>
        </Button>
      </section>
    );
  } else if (viewer.isStaff) {
    account = (
      <section className="grid gap-3 rounded-card border border-border bg-surface p-4">
        <p className="text-body text-fg-muted">{t("confirm.staff")}</p>
        <Button asChild variant="secondary">
          <Link href={STAFF_HOME}>{t("confirm.goToPanel")}</Link>
        </Button>
      </section>
    );
  } else {
    const profile = await getMyProfile(db, viewer.userId);
    if (!profile.ok || !profile.data || needsConsent(profile.data)) {
      account = (
        <section className="grid gap-3">
          <p className="text-body text-fg-muted">{t("confirm.completeProfile")}</p>
          <Button asChild>
            <Link href={withNext(COMPLETE_PROFILE, here)}>
              {t("confirm.completeProfileButton")}
            </Link>
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
            {t("approval")}
          </p>
        );
      }
      bottom = (
        <BookForm
          action={bookAction}
          serviceId={service.id}
          addonIds={selection.addonIds}
          barberId={barberId}
          date={date}
          startAt={startAt}
          summary={`${f.date(startAt)} · ${f.time(startAt)}`}
        />
      );
    }
  }

  const position = stepPosition("confirm", flow.steps, f.locale);
  return (
    <>
      <StepHeader
        actions={<LocaleSwitch />}
        {...position}
        backHref={previousStepHref(flow, "confirm", { ...selection, date })}
      />
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-8">
        <h1 className="text-title">{t("confirm.title")}</h1>
        <AppointmentSummary
          serviceName={flow.label!}
          start={startAt}
          end={end}
          barberName={barberName(flow, barberId)}
          priceLabel={servicePriceLabel(total.priceCop, f.locale)}
          location={addressLabel(f.locale)}
        />
        <p className="text-body text-fg-muted">{t("policy")}</p>
        {account}
      </main>
      {bottom}
    </>
  );
}
