import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
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
  MY_APPOINTMENTS_ROUTES,
  parsePeriod,
  parseSelection,
} from "@possos/booking";
import { getNextAppointment } from "@possos/booking/server";
import { ServiceList } from "@possos/catalog/ui";
import { needsConsent } from "@possos/customers";
import { getMyProfile } from "@possos/customers/server";
import { createClient } from "@possos/supabase/server";
import { parseLocale } from "@possos/config/constants";
import type { Enums } from "@possos/supabase";
import { Button, formatters, Logo, StatusBadge } from "@possos/ui";
import { BUSINESS, mapsEmbedUrl, mapsUrl, siteUrl } from "../../lib/business";
import { loadBookingFlow, loadServiceEntries, timeStepHref } from "../../lib/booking-flow";
import { MY_APPOINTMENTS_PATH, PROFILE_PATH, STAFF_HOME } from "../../lib/session";
import { HomeBookBar } from "../_components/home-book-bar";
import { LocaleSwitch } from "../_components/locale-switch";
import { ServiceBooking } from "../_components/service-booking";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("web.home.meta");
  const locale = parseLocale(await getLocale());
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "es_CO",
      siteName: BUSINESS.name,
      title: t("title"),
      description: t("ogDescription"),
      url: "/",
    },
  };
}

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
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // Servicio abierto y sus adicionales, si el cliente los acaba de elegir (formulario "Agrega").
  const chosen = parseSelection(params);
  const t = await getTranslations("web.home");
  const f = formatters(parseLocale(await getLocale()));
  const db = await createClient();
  const [flow, barbers, hours, viewer] = await Promise.all([
    loadBookingFlow(db, parseSelection({})),
    listActiveBarbers(db),
    getOpeningHours(db),
    getViewer(db),
  ]);
  const barberList = barbers.ok ? barbers.data : [];
  const [portfolio, entries] = await Promise.all([
    listPortfolio(
      db,
      barberList.map((b) => b.id),
    ),
    loadServiceEntries(db, flow.services),
  ]);
  const ranges = hours.ok ? hours.data : [];
  const groups = groupOpeningHours(ranges, f.locale);

  // Cita próxima del cliente con sesión y perfil completo.
  let upcoming: {
    id: string;
    start: string;
    serviceName: string;
    status: Enums<"appointment_status">;
  } | null = null;
  if (viewer && !viewer.isStaff) {
    const profile = await getMyProfile(db, viewer.userId);
    if (profile.ok && profile.data && !needsConsent(profile.data)) {
      const next = await getNextAppointment(db, profile.data.id);
      const period = next.ok && next.data ? parsePeriod(next.data.period) : null;
      if (next.ok && next.data && period) {
        upcoming = {
          id: next.data.id,
          start: period.start,
          serviceName:
            flow.services.find((s) => s.id === next.data!.service_id)?.name ??
            t("upcoming.fallbackService"),
          status: next.data.status,
        };
      }
    }
  }

  // Con varios servicios, o uno con adicionales, "Reservar" lleva a elegirlos (paso Servicio).
  const chooseService = flow.steps.includes("service");
  const bookHref = chooseService ? BOOKING_ROUTES.service : timeStepHref(flow, parseSelection({}));
  const whatsapp = barberList.find((b) => b.whatsapp_url)?.whatsapp_url ?? null;
  const map = mapsEmbedUrl(f.locale);
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
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.maps.latitude,
      longitude: BUSINESS.maps.longitude,
    },
    hasMap: BUSINESS.maps.url,
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
      {/* El nombre va junto al logo y es el título de la página (pedido de Juan, 19/11/2026). */}
      <header className="flex min-h-14 items-center justify-between gap-2 pr-2 pl-gutter pt-safe">
        <div className="flex min-w-0 items-center gap-2">
          <Logo label="" />
          <h1 className="truncate text-heading text-brand">{BUSINESS.name}</h1>
        </div>
        {/* El botón de idioma va en el pie, no aquí: el encabezado queda con lo de la cuenta
            (pedido de Juan, 20/11/2026). */}
        <nav aria-label={t("nav.label")} className="flex shrink-0 items-center">
          {viewer && !viewer.isStaff ? (
            <Button asChild variant="ghost" className="px-2">
              <Link href={MY_APPOINTMENTS_PATH}>{t("nav.myAppointments")}</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" className="px-2">
            <Link href={viewer ? (viewer.isStaff ? STAFF_HOME : PROFILE_PATH) : AUTH_ROUTES.signIn}>
              {viewer ? (viewer.isStaff ? t("nav.panel") : t("nav.profile")) : t("nav.signIn")}
            </Link>
          </Button>
        </nav>
      </header>

      <main className="grid flex-1 content-start gap-10 px-gutter pt-4 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        {viewer && params.aviso === "perfil-guardado" ? (
          <p role="status" className="rounded-card border border-border bg-surface p-4 text-body">
            {t("profileSaved")}
          </p>
        ) : null}
        <section className="grid gap-2">
          {upcoming ? (
            <Link
              href={MY_APPOINTMENTS_ROUTES.detail(upcoming.id)}
              className="grid gap-2 rounded-card border border-border bg-surface p-4 transition-colors hover:bg-surface-2 active:bg-surface-2"
            >
              <span className="text-caption text-fg-muted">{t("upcoming.label")}</span>
              <span className="text-heading tabular-nums">
                {f.date(upcoming.start)}, {f.time(upcoming.start)}
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="text-body text-fg-muted">{upcoming.serviceName}</span>
                <StatusBadge tone={APPOINTMENT_STATUS_DISPLAY[f.locale][upcoming.status].tone}>
                  {APPOINTMENT_STATUS_DISPLAY[f.locale][upcoming.status].label}
                </StatusBadge>
              </span>
              <span className="text-label underline underline-offset-4">{t("upcoming.open")}</span>
            </Link>
          ) : (
            <p className="text-body text-fg-muted">{BUSINESS.tagline ?? t("taglinePending")}</p>
          )}
        </section>

        <section
          id="lista-servicios"
          aria-labelledby="servicios"
          className="grid scroll-mt-4 gap-3"
        >
          <h2 id="servicios" tabIndex={-1} data-scroll-focus className="text-heading">
            {t("services")}
          </h2>
          {flow.services.length ? (
            <ServiceList
              services={flow.services}
              openId={chosen.serviceId}
              bookingFor={(service) => {
                const entry = entries.get(service.id);
                return entry ? (
                  <ServiceBooking
                    db={db}
                    service={service}
                    entry={entry}
                    selectedAddonIds={chosen.serviceId === service.id ? chosen.addonIds : []}
                  />
                ) : null;
              }}
            />
          ) : (
            <p className="text-body text-fg-muted">{t("servicesPending")}</p>
          )}
        </section>

        <section aria-labelledby="barbero" className="grid gap-3">
          <h2 id="barbero" className="text-heading">
            {barberList.length > 1 ? t("barbers") : t("barber")}
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
            <p className="text-body text-fg-muted">{t("barberPending")}</p>
          )}
        </section>

        <section aria-labelledby="ubicacion" className="grid gap-3">
          <h2 id="ubicacion" className="text-heading">
            {t("location")}
          </h2>
          <p className="text-body">
            {BUSINESS.address ?? t("addressPending")}
            {BUSINESS.addressReference ? (
              <span className="block text-fg-muted">{BUSINESS.addressReference}</span>
            ) : null}
            <span className="block text-fg-muted">
              {BUSINESS.city}, {BUSINESS.region}
            </span>
          </p>
          {map ? (
            <iframe
              src={map}
              title={t("mapTitle", { name: BUSINESS.name })}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-video w-full rounded-card border border-border"
            />
          ) : (
            <p className="text-caption text-fg-subtle">{t("mapPending")}</p>
          )}
          {mapLink ? (
            <a href={mapLink} className={`text-body ${linkClass}`} rel="noopener noreferrer">
              {t("openMaps")}
            </a>
          ) : null}
        </section>

        <section aria-labelledby="horario" className="grid gap-3">
          <h2 id="horario" className="text-heading">
            {t("hours")}
          </h2>
          <OpeningHoursList groups={groups} className="text-body text-fg-muted" />
        </section>

        <section aria-labelledby="contacto" className="grid gap-3">
          <h2 id="contacto" className="text-heading">
            {t("contact")}
          </h2>
          <ul className="grid gap-2 text-body">
            <li>
              <a href={BUSINESS.instagram.url} className={linkClass} rel="noopener noreferrer">
                {t("instagram", { handle: BUSINESS.instagram.handle })}
              </a>
            </li>
            <li>
              {whatsapp ? (
                <a href={whatsapp} className={linkClass} rel="noopener noreferrer">
                  {t("whatsapp")}
                </a>
              ) : (
                <span className="text-fg-muted">{t("whatsappPending")}</span>
              )}
            </li>
          </ul>
          <p className="text-caption text-fg-muted">
            <Link href="/politica-de-datos" className={linkClass}>
              {t("policy")}
            </Link>
          </p>
        </section>
      </main>

      {/* Pie con el botón de idioma (docs/11, "Idiomas"). La barra "Reservar" es sticky, así
          que al final de la página queda debajo del pie y no lo tapa. */}
      <footer className="px-gutter pb-6 md:mx-auto md:w-full md:max-w-2xl">
        <div className="border-t border-border pt-2">
          <LocaleSwitch variant="full" className="-ml-2" />
        </div>
      </footer>

      <HomeBookBar href={bookHref} targetId="lista-servicios" scrollToTarget={chooseService} />
    </div>
  );
}
