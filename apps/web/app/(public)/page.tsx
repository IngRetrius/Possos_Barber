import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_ROUTES } from "@possos/auth";
import { getViewer } from "@possos/auth/server";
import { groupOpeningHours } from "@possos/barbers";
import {
  getOpeningHours,
  listActiveBarbers,
  listPortfolio,
  publicImageUrl,
} from "@possos/barbers/server";
import { BarberProfile, OpeningHoursList } from "@possos/barbers/ui";
import {
  APPOINTMENT_STATUS_DISPLAY,
  BOOKING_ROUTES,
  parsePeriod,
  parseSelection,
} from "@possos/booking";
import { getNextAppointment } from "@possos/booking/server";
import { ServiceList } from "@possos/catalog/ui";
import { needsConsent } from "@possos/customers";
import { getMyProfile } from "@possos/customers/server";
import { createClient } from "@possos/supabase/server";
import { BottomBar, Button, formatDate, formatTime, Logo, StatusBadge } from "@possos/ui";
import { BUSINESS, mapsEmbedUrl, mapsUrl, PENDING, siteUrl } from "../../lib/business";
import { loadBookingFlow, timeStepHref } from "../../lib/booking-flow";
import { CUSTOMER_HOME, STAFF_HOME } from "../../lib/session";

export const metadata: Metadata = {
  title: `${BUSINESS.name} · ${BUSINESS.kind}`,
  description: `Reserva tu corte en ${BUSINESS.name}, barbería en ${BUSINESS.city}. Elige el día y la hora en pocos toques.`,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} · ${BUSINESS.kind}`,
    description: `Reserva tu corte en ${BUSINESS.name}, ${BUSINESS.city}.`,
    url: "/",
  },
};

const ISO_DAY = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const linkClass = "text-fg underline underline-offset-4 hover:text-fg-muted";

/**
 * Inicio público: marca, servicios, barbero, ubicación, horario y contacto, renderizado en el
 * servidor (búsquedas locales, docs/05) y legible sin JavaScript. Lo que el dueño no ha dado
 * dice [PENDIENTE]. Si el cliente tiene una cita próxima, va primero.
 */
export default async function HomePage() {
  const db = await createClient();
  const [flow, barbers, hours, viewer] = await Promise.all([
    loadBookingFlow(db, parseSelection({})),
    listActiveBarbers(db),
    getOpeningHours(db),
    getViewer(db),
  ]);
  const barberList = barbers.ok ? barbers.data : [];
  const portfolio = await listPortfolio(
    db,
    barberList.map((b) => b.id),
  );
  const ranges = hours.ok ? hours.data : [];
  const groups = groupOpeningHours(ranges);

  // Cita próxima del cliente con sesión y perfil completo.
  let upcoming: {
    start: string;
    serviceName: string;
    status: keyof typeof APPOINTMENT_STATUS_DISPLAY;
  } | null = null;
  if (viewer && !viewer.isStaff) {
    const profile = await getMyProfile(db, viewer.userId);
    if (profile.ok && profile.data && !needsConsent(profile.data)) {
      const next = await getNextAppointment(db, profile.data.id);
      const period = next.ok && next.data ? parsePeriod(next.data.period) : null;
      if (next.ok && next.data && period) {
        upcoming = {
          start: period.start,
          serviceName: flow.services.find((s) => s.id === next.data!.service_id)?.name ?? "Tu cita",
          status: next.data.status,
        };
      }
    }
  }

  const bookHref =
    flow.services.length > 1 ? BOOKING_ROUTES.service : timeStepHref(flow, parseSelection({}));
  const whatsapp = barberList.find((b) => b.whatsapp_url)?.whatsapp_url ?? null;
  const map = mapsEmbedUrl();
  const mapLink = mapsUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: BUSINESS.name,
    url: siteUrl(),
    image: `${siteUrl()}/icons/icon-512.png`,
    sameAs: [BUSINESS.instagram.url],
    address: {
      "@type": "PostalAddress",
      ...(BUSINESS.address ? { streetAddress: BUSINESS.address } : {}),
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.region,
      addressCountry: BUSINESS.country,
    },
    ...(ranges.length
      ? {
          openingHoursSpecification: ranges.map((r) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${ISO_DAY[r.weekday - 1]}`,
            opens: r.start_time.slice(0, 5),
            closes: r.end_time.slice(0, 5),
          })),
        }
      : {}),
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <script
        type="application/ld+json"
        // JSON sin "<" para que no cierre la etiqueta (recomendación de Next).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="flex min-h-14 items-center justify-between gap-2 px-gutter pt-safe">
        <Logo label="" />
        <Button asChild variant="ghost">
          <Link href={viewer ? (viewer.isStaff ? STAFF_HOME : CUSTOMER_HOME) : AUTH_ROUTES.signIn}>
            {viewer ? (viewer.isStaff ? "Panel" : "Tu perfil") : "Ingresar"}
          </Link>
        </Button>
      </header>

      <main className="grid flex-1 content-start gap-10 px-gutter pt-4 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <section className="grid gap-2">
          <h1 className="text-title text-brand">{BUSINESS.name}</h1>
          <p className="text-body text-fg">{BUSINESS.kind}</p>
          {upcoming ? (
            <div className="mt-4 grid gap-2 rounded-card border border-border bg-surface p-4">
              <p className="text-caption text-fg-muted">Tu próxima cita</p>
              <p className="text-heading tabular-nums">
                {formatDate(upcoming.start)}, {formatTime(upcoming.start)}
              </p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-body text-fg-muted">{upcoming.serviceName}</p>
                <StatusBadge tone={APPOINTMENT_STATUS_DISPLAY[upcoming.status].tone}>
                  {APPOINTMENT_STATUS_DISPLAY[upcoming.status].label}
                </StatusBadge>
              </div>
            </div>
          ) : (
            <p className="text-body text-fg-muted">{BUSINESS.tagline ?? `Frase ${PENDING}`}</p>
          )}
        </section>

        <section aria-labelledby="servicios" className="grid gap-3">
          <h2 id="servicios" className="text-heading">
            Servicios
          </h2>
          {flow.services.length ? (
            <ServiceList services={flow.services} />
          ) : (
            <p className="text-body text-fg-muted">{`Servicios ${PENDING}`}</p>
          )}
        </section>

        <section aria-labelledby="barbero" className="grid gap-3">
          <h2 id="barbero" className="text-heading">
            {barberList.length > 1 ? "Los barberos" : "El barbero"}
          </h2>
          {barberList.length ? (
            barberList.map((barber) => (
              <BarberProfile
                key={barber.id}
                barber={barber}
                photoUrl={
                  barber.photo_path ? publicImageUrl(db, "barber-photos", barber.photo_path) : null
                }
                portfolio={(portfolio.ok ? portfolio.data : [])
                  .filter((item) => item.barber_id === barber.id)
                  .map((item) => ({
                    id: item.id,
                    url: publicImageUrl(db, "portfolio", item.image_path),
                    caption: item.caption,
                  }))}
              />
            ))
          ) : (
            <p className="text-body text-fg-muted">{`Barbero ${PENDING}`}</p>
          )}
        </section>

        <section aria-labelledby="ubicacion" className="grid gap-3">
          <h2 id="ubicacion" className="text-heading">
            Ubicación
          </h2>
          <p className="text-body">
            {BUSINESS.address ?? `Dirección ${PENDING}`}
            <span className="block text-fg-muted">
              {BUSINESS.city}, {BUSINESS.region}
            </span>
          </p>
          {map ? (
            <iframe
              src={map}
              title={`Mapa de la ubicación de ${BUSINESS.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-video w-full rounded-card border border-border"
            />
          ) : (
            <p className="text-caption text-fg-subtle">{`Mapa ${PENDING}`}</p>
          )}
          {mapLink ? (
            <a href={mapLink} className={`text-body ${linkClass}`} rel="noopener noreferrer">
              Abrir en Google Maps
            </a>
          ) : null}
        </section>

        <section aria-labelledby="horario" className="grid gap-3">
          <h2 id="horario" className="text-heading">
            Horario
          </h2>
          <OpeningHoursList groups={groups} className="text-body text-fg-muted" />
        </section>

        <section aria-labelledby="contacto" className="grid gap-3">
          <h2 id="contacto" className="text-heading">
            Contacto
          </h2>
          <ul className="grid gap-2 text-body">
            <li>
              <a href={BUSINESS.instagram.url} className={linkClass} rel="noopener noreferrer">
                Instagram @{BUSINESS.instagram.handle}
              </a>
            </li>
            <li>
              {whatsapp ? (
                <a href={whatsapp} className={linkClass} rel="noopener noreferrer">
                  WhatsApp
                </a>
              ) : (
                <span className="text-fg-muted">{`WhatsApp ${PENDING}`}</span>
              )}
            </li>
          </ul>
          <p className="text-caption text-fg-muted">
            <Link href="/politica-de-datos" className={linkClass}>
              Política de tratamiento de datos
            </Link>
          </p>
        </section>
      </main>

      <BottomBar>
        <Button asChild>
          <Link href={bookHref}>Reservar</Link>
        </Button>
      </BottomBar>
    </div>
  );
}
