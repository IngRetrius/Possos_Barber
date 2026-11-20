import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BOOKING_ROUTES,
  MY_APPOINTMENTS_ROUTES,
  myStatusDisplay,
  parseSelection,
  splitMyAppointments,
} from "@possos/booking";
import { listMyAppointments } from "@possos/booking/server";
import { MyAppointmentCard, MyAppointmentHistory } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { Button, EmptyState, List, ListRow, StatusBadge } from "@possos/ui";
import { loadBookingFlow, timeStepHref } from "../../../lib/booking-flow";
import { currentFormatters } from "../../../lib/i18n";
import {
  MY_APPOINTMENTS_PATH,
  param,
  PROFILE_PATH,
  requireCustomer,
  STAFF_HOME,
} from "../../../lib/session";
import { InstallHint } from "../../_components/install-hint";
import { KeepOffline } from "../../_components/keep-offline";
import { SiteHeader } from "../../_components/site-header";
import { cancelMyAppointmentAction } from "./actions";
import { cardContext } from "./_components/my-appointments";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("web.customer.meta"))("myAppointments") };
}

/** Citas pasadas que se muestran sin pedir "Ver todas". */
const HISTORY_SIZE = 10;

/**
 * "Mis citas" (docs/11): arriba la próxima cita con "Cambiar hora" y "Cancelar"; las demás
 * próximas en una lista que abre cada una; abajo el historial con "Volver a reservar": las
 * últimas 10, y con `?historial=todas`, hasta 100.
 *
 * Sin conexión (F8) se ve la última versión guardada, con las citas próximas, y abajo invita a
 * instalar la app (nunca al entrar).
 */
export default async function MyAppointmentsPage({ searchParams }: PageProps<"/mis-citas">) {
  const showAll = param((await searchParams).historial) === "todas";
  const db = await createClient();
  await requireCustomer(db, MY_APPOINTMENTS_PATH, { staffTo: STAFF_HOME });

  const [result, flow] = await Promise.all([
    listMyAppointments(db, { limit: showAll ? 100 : 50 }),
    loadBookingFlow(db, parseSelection({})),
  ]);
  if (!result.ok) throw new Error(`No se pudieron leer las citas: ${result.error}`);

  const t = await getTranslations("web.customer.myAppointments");
  const f = await currentFormatters();
  const now = new Date();
  const nowIso = now.toISOString();
  const { upcoming, past } = splitMyAppointments(result.data, now);
  const [next, ...later] = upcoming;
  const shownPast = showAll ? past : past.slice(0, HISTORY_SIZE);
  const bookHref =
    flow.services.length > 1 ? BOOKING_ROUTES.service : timeStepHref(flow, parseSelection({}));

  return (
    <>
      <SiteHeader>
        <Button asChild variant="ghost">
          <Link href={PROFILE_PATH}>{t("profile")}</Link>
        </Button>
      </SiteHeader>
      <main className="grid flex-1 content-start gap-8 px-gutter pt-2 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <h1 className="text-title">{t("title")}</h1>

        {!next && past.length === 0 ? (
          <EmptyState
            title={t("empty")}
            action={
              <Button asChild>
                <Link href={bookHref}>{t("book")}</Link>
              </Button>
            }
          />
        ) : null}

        {next ? (
          <section aria-labelledby="proxima" className="grid gap-3">
            <h2 id="proxima" className="text-heading">
              {t("next")}
            </h2>
            <MyAppointmentCard
              appointment={next}
              now={nowIso}
              cancelAction={cancelMyAppointmentAction}
              {...cardContext(next, f.locale, t("instagram"))}
            />
          </section>
        ) : past.length > 0 ? (
          <section className="grid gap-3">
            <p className="text-body text-fg-muted">{t("noUpcoming")}</p>
            <Button asChild>
              <Link href={bookHref}>{t("book")}</Link>
            </Button>
          </section>
        ) : null}

        {later.length > 0 ? (
          <section aria-labelledby="tambien" className="grid gap-3">
            <h2 id="tambien" className="text-heading">
              {t("alsoHave")}
            </h2>
            <List>
              {later.map((appointment) => {
                const status = myStatusDisplay(appointment, now, f.locale);
                return (
                  <ListRow
                    key={appointment.id}
                    href={MY_APPOINTMENTS_ROUTES.detail(appointment.id)}
                    title={`${f.date(appointment.start)}, ${f.time(appointment.start)}`}
                    detail={appointment.serviceName}
                    value={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
                  />
                );
              })}
            </List>
          </section>
        ) : null}

        {past.length > 0 ? (
          <section aria-labelledby="pasadas" className="grid gap-3">
            <h2 id="pasadas" className="text-heading">
              {t("past")}
            </h2>
            <MyAppointmentHistory appointments={shownPast} now={nowIso} />
            {shownPast.length < past.length ? (
              <Button asChild variant="ghost">
                <Link href={`${MY_APPOINTMENTS_PATH}?historial=todas`} scroll={false}>
                  {t("allPast")}
                </Link>
              </Button>
            ) : null}
          </section>
        ) : null}

        <InstallHint lead={t("install")} />
      </main>
      <KeepOffline
        urls={[MY_APPOINTMENTS_PATH, ...upcoming.map((a) => MY_APPOINTMENTS_ROUTES.detail(a.id))]}
      />
    </>
  );
}
