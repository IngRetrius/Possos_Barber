import type { Metadata } from "next";
import Link from "next/link";
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
import { Button, EmptyState, formatDate, formatTime, List, ListRow, StatusBadge } from "@possos/ui";
import { loadBookingFlow, timeStepHref } from "../../../lib/booking-flow";
import {
  MY_APPOINTMENTS_PATH,
  param,
  PROFILE_PATH,
  requireCustomer,
  STAFF_HOME,
} from "../../../lib/session";
import { SiteHeader } from "../../_components/site-header";
import { cancelMyAppointmentAction } from "./actions";
import { cardContext } from "./_components/my-appointments";

export const metadata: Metadata = { title: "Mis citas · Possos Barber" };

/** Citas pasadas que se muestran sin pedir "Ver todas". */
const HISTORY_SIZE = 10;

/**
 * "Mis citas" (docs/11): arriba la próxima cita con "Cambiar hora" y "Cancelar"; las demás
 * próximas en una lista que abre cada una; abajo el historial con "Volver a reservar": las
 * últimas 10, y con `?historial=todas`, hasta 100.
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
          <Link href={PROFILE_PATH}>Tu perfil</Link>
        </Button>
      </SiteHeader>
      <main className="grid flex-1 content-start gap-8 px-gutter pt-2 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <h1 className="text-title">Mis citas</h1>

        {!next && past.length === 0 ? (
          <EmptyState
            title="Todavía no tienes citas"
            action={
              <Button asChild>
                <Link href={bookHref}>Reservar</Link>
              </Button>
            }
          />
        ) : null}

        {next ? (
          <section aria-labelledby="proxima" className="grid gap-3">
            <h2 id="proxima" className="text-heading">
              Próxima cita
            </h2>
            <MyAppointmentCard
              appointment={next}
              now={nowIso}
              cancelAction={cancelMyAppointmentAction}
              {...cardContext(next)}
            />
          </section>
        ) : past.length > 0 ? (
          <section className="grid gap-3">
            <p className="text-body text-fg-muted">No tienes citas próximas.</p>
            <Button asChild>
              <Link href={bookHref}>Reservar</Link>
            </Button>
          </section>
        ) : null}

        {later.length > 0 ? (
          <section aria-labelledby="tambien" className="grid gap-3">
            <h2 id="tambien" className="text-heading">
              También tienes
            </h2>
            <List>
              {later.map((appointment) => {
                const status = myStatusDisplay(appointment, now);
                return (
                  <ListRow
                    key={appointment.id}
                    href={MY_APPOINTMENTS_ROUTES.detail(appointment.id)}
                    title={`${formatDate(appointment.start)}, ${formatTime(appointment.start)}`}
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
              Citas pasadas
            </h2>
            <MyAppointmentHistory appointments={shownPast} now={nowIso} />
            {shownPast.length < past.length ? (
              <Button asChild variant="ghost">
                <Link href={`${MY_APPOINTMENTS_PATH}?historial=todas`} scroll={false}>
                  Ver todas las citas pasadas
                </Link>
              </Button>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}
