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
import { BarberProfile, OpeningHoursList, PortfolioStrip } from "@possos/barbers/ui";
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
import {
  Button,
  formatters,
  Highlight,
  LogoIntro,
  ScrollReveal,
  SectionTitle,
  StatusBadge,
} from "@possos/ui";
import { BUSINESS, mapsEmbedUrl, mapsUrl, SHOW_PENDING, siteUrl } from "../../lib/business";
import { loadBookingFlow, loadServiceEntries, timeStepHref } from "../../lib/booking-flow";
import { MY_APPOINTMENTS_PATH, PROFILE_PATH, STAFF_HOME } from "../../lib/session";
import { BookLink } from "../_components/book-link";
import { HomeBookBar } from "../_components/home-book-bar";
import { LocaleSwitch } from "../_components/locale-switch";
import { ServiceBooking } from "../_components/service-booking";
import { SocialLinks } from "../_components/social-links";

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

/** Enlaces del inicio: subrayado en un matiz apagado del amarillo, que se enciende al pasar. */
const linkClass =
  "text-fg underline decoration-accent-muted underline-offset-4 hover:decoration-accent";

/** "¡El barbero {más viral} de Girardot!" → lo de antes, la palabra marcada y lo de después. */
function splitMark(text: string): [string, string | null, string] {
  const match = /^(.*?)\{(.+?)\}(.*)$/s.exec(text);
  return match ? [match[1]!, match[2]!, match[3]!] : [text, null, ""];
}

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
  const barberNames = new Map(barberList.map((b) => [b.id, b.display_name]));
  // Trabajos de todos los barberos activos, en el orden que fija el panel.
  const works = (portfolio.ok ? portfolio.data : []).map((item) => ({
    id: item.id,
    url: publicImageUrl(db, "portfolio", item.image_path),
    caption: item.caption,
    barberName: barberNames.get(item.barber_id) ?? BUSINESS.name,
  }));
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
  const tagline = BUSINESS.tagline?.[f.locale] ?? (SHOW_PENDING ? t("taglinePending") : null);
  const taglineParts = tagline ? splitMark(tagline) : (["", null, ""] as const);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: BUSINESS.name,
    url: siteUrl(),
    image: `${siteUrl()}/icons/icon-512.png`,
    sameAs: [BUSINESS.instagram.url, BUSINESS.tiktok.url],
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
      {/* El logo y el nombre están en la portada; arriba solo queda lo de la cuenta. El botón de
          idioma va en el pie (pedido de Juan, 20/11/2026). */}
      <header className="flex min-h-14 items-center justify-end gap-2 pr-2 pl-gutter pt-safe">
        <nav aria-label={t("nav.label")} className="flex shrink-0 items-center">
          {viewer && !viewer.isStaff ? (
            <Button asChild variant="ghost" className="px-2 text-fg-muted hover:text-fg">
              <Link href={MY_APPOINTMENTS_PATH}>{t("nav.myAppointments")}</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" className="px-2 text-fg-muted hover:text-fg">
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
        {/* Portada (pedido del dueño, 20/11/2026: "le falta el logo, medio animación, un tiz de
            color"): el monograma grande con su tijeretazo, el nombre (el título de la página), la
            frase y "Reservar" en amarillo. Mientras se ve, la barra fija se esconde. */}
        <section
          id="portada"
          aria-labelledby="nombre"
          className="grid justify-items-center gap-5 pt-2 text-center"
        >
          <div className="relative grid animate-rise place-items-center">
            <div
              aria-hidden
              className="absolute size-64 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_12%,transparent),transparent)]"
            />
            <LogoIntro size={128} label="" className="relative" />
          </div>
          <div className="grid gap-2">
            <h1
              id="nombre"
              className="animate-rise text-title tracking-[0.2em] text-brand uppercase [animation-delay:70ms]"
            >
              {BUSINESS.name}
            </h1>
            {tagline ? (
              <p className="animate-rise text-body text-fg-muted [animation-delay:140ms]">
                {taglineParts[0]}
                {/* El subrayado se dibuja cuando la frase termina de subir (140 + 200 ms). */}
                {taglineParts[1] ? <Highlight delay={340}>{taglineParts[1]}</Highlight> : null}
                {taglineParts[2]}
              </p>
            ) : null}
          </div>
          <BookLink
            href={bookHref}
            targetId="lista-servicios"
            scrollToTarget={chooseService}
            className="w-full animate-rise [animation-delay:210ms] md:max-w-xs"
          />
        </section>

        {upcoming ? (
          <Link
            href={MY_APPOINTMENTS_ROUTES.detail(upcoming.id)}
            // La tarjeta más importante para quien ya reservó: tinte amarillo con el trazo neón a la
            // izquierda (docs/11, "Color"). Al pasar o presionar se enciende el borde.
            className="grid gap-2 rounded-card border border-l-3 border-accent-muted border-l-accent bg-accent-tint p-4 transition-colors hover:border-accent active:border-accent"
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
            <span className="text-label underline decoration-accent underline-offset-4">
              {t("upcoming.open")}
            </span>
          </Link>
        ) : null}

        {works.length > 0 || SHOW_PENDING ? (
          <section aria-labelledby="trabajos" data-reveal="" className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <SectionTitle id="trabajos">{t("works")}</SectionTitle>
              <a
                href={BUSINESS.instagram.url}
                className={`text-label ${linkClass}`}
                rel="noopener noreferrer"
              >
                {t("worksMore")}
              </a>
            </div>
            {works.length > 0 ? (
              <PortfolioStrip items={works} labelledBy="trabajos" />
            ) : (
              <p className="text-caption text-fg-muted">{t("worksPending")}</p>
            )}
          </section>
        ) : null}

        <section
          id="lista-servicios"
          aria-labelledby="servicios"
          data-reveal=""
          className="grid scroll-mt-4 gap-3"
        >
          <SectionTitle id="servicios" tabIndex={-1} data-scroll-focus>
            {t("services")}
          </SectionTitle>
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

        <section aria-labelledby="barbero" data-reveal="" className="grid gap-3">
          <SectionTitle id="barbero">
            {barberList.length > 1 ? t("barbers") : t("barber")}
          </SectionTitle>
          {barberList.length ? (
            barberList.map((barber) => (
              <BarberProfile
                key={barber.id}
                barber={barber}
                showPending={SHOW_PENDING}
                photoUrl={
                  barber.photo_path ? publicImageUrl(db, "barber-photos", barber.photo_path) : null
                }
              />
            ))
          ) : (
            <p className="text-body text-fg-muted">{t("barberPending")}</p>
          )}
        </section>

        <section aria-labelledby="ubicacion" data-reveal="" className="grid gap-3">
          <SectionTitle id="ubicacion">{t("location")}</SectionTitle>
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
          ) : SHOW_PENDING ? (
            <p className="text-caption text-fg-subtle">{t("mapPending")}</p>
          ) : null}
          {mapLink ? (
            <a href={mapLink} className={`text-body ${linkClass}`} rel="noopener noreferrer">
              {t("openMaps")}
            </a>
          ) : null}
        </section>

        <section aria-labelledby="horario" data-reveal="" className="grid gap-3">
          <SectionTitle id="horario">{t("hours")}</SectionTitle>
          <OpeningHoursList groups={groups} className="text-body text-fg-muted" />
        </section>

        <section aria-labelledby="contacto" data-reveal="" className="grid gap-3">
          <SectionTitle id="contacto">{t("contact")}</SectionTitle>
          <SocialLinks
            label={t("social")}
            links={[
              {
                network: "instagram",
                url: BUSINESS.instagram.url,
                label: t("instagram", { handle: BUSINESS.instagram.handle }),
              },
              {
                network: "tiktok",
                url: BUSINESS.tiktok.url,
                label: t("tiktok", { handle: BUSINESS.tiktok.handle }),
              },
            ]}
          />
          {whatsapp ? (
            <p className="text-body">
              <a href={whatsapp} className={linkClass} rel="noopener noreferrer">
                {t("whatsapp")}
              </a>
            </p>
          ) : SHOW_PENDING ? (
            <p className="text-body text-fg-muted">{t("whatsappPending")}</p>
          ) : null}
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

      <HomeBookBar
        href={bookHref}
        targetId="lista-servicios"
        hideWhileVisible={["portada", "lista-servicios"]}
        scrollToTarget={chooseService}
      />
      {/* Las secciones con data-reveal que están debajo de la pantalla aparecen al bajar. */}
      <ScrollReveal />
    </div>
  );
}
