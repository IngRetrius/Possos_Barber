"use client";

import {
  BottomBar,
  Button,
  Checkbox,
  colors,
  DateStrip,
  EmptyState,
  Field,
  formatDate,
  formatDateLong,
  formatDuration,
  formatMonthYear,
  formatPrice,
  formatTime,
  formatTimeRange,
  Highlight,
  InlineError,
  Input,
  List,
  ListDisclosureRow,
  ListRow,
  Logo,
  PhoneInput,
  SectionTitle,
  Sheet,
  SheetClose,
  SheetTrigger,
  Skeleton,
  SlotGrid,
  SlotGridSkeleton,
  StatusBadge,
  StepHeader,
  TabBar,
  Textarea,
  toast,
  Toaster,
  toDateKey,
  type ColorToken,
  type DateStripDay,
  type StatusTone,
} from "@possos/ui";
import { CalendarDays, CalendarRange, Ellipsis, Users, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ datos de ejemplo */

/** Clases escritas completas para que Tailwind las encuentre. */
const SWATCH: Record<ColorToken, string> = {
  bg: "bg-bg",
  surface: "bg-surface",
  "surface-2": "bg-surface-2",
  border: "bg-border",
  "border-strong": "bg-border-strong",
  fg: "bg-fg",
  "fg-muted": "bg-fg-muted",
  "fg-subtle": "bg-fg-subtle",
  brand: "bg-brand",
  accent: "bg-accent",
  "accent-fg": "bg-accent-fg",
  "accent-pressed": "bg-accent-pressed",
  "accent-muted": "bg-accent-muted",
  "accent-tint": "bg-accent-tint",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Estados de docs/04 con su tono y texto. En F4 y F6 esta tabla vive en @possos/booking. */
const STATUSES: { status: string; tone: StatusTone; label: string }[] = [
  { status: "confirmed", tone: "success", label: "Confirmada" },
  { status: "booked", tone: "warning", label: "Sin confirmar" },
  { status: "pending_approval", tone: "warning", label: "Pendiente de aprobación" },
  { status: "booked, ya pasó", tone: "warning", label: "Por cerrar" },
  { status: "no_show", tone: "danger", label: "No vino" },
  { status: "completed", tone: "neutral", label: "Completada" },
  { status: "cancelled", tone: "neutral", label: "Cancelada" },
  { status: "rejected", tone: "neutral", label: "Rechazada" },
];

const HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19];

function addDays(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 14 días desde hoy en Bogotá. Domingo sin horas y el día 10 apagado, para ver los estados. */
function exampleDays(): { days: DateStripDay[]; slots: Record<string, string[]> } {
  const today = toDateKey(new Date());
  const days: DateStripDay[] = [];
  const slots: Record<string, string[]> = {};
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const sunday = new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
    const free = sunday ? [] : HOURS.filter((h, j) => (h + i + j) % 3 !== 0);
    slots[date] = free.map((h) =>
      new Date(`${date}T${String(h).padStart(2, "0")}:00:00-05:00`).toISOString(),
    );
    days.push({ date, slots: free.length, disabled: i === 10 });
  }
  return { days, slots };
}

/* ------------------------------------------------------------------ piezas de la página */

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-border px-gutter py-8">
      <h2 id={id} className="text-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Marco de 390 px de alto limitado para mostrar barras fijas sin que tapen la página. */
function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="-mx-gutter flex h-[44rem] flex-col overflow-y-auto border-y border-border"
    >
      {children}
    </div>
  );
}

function BookingSample() {
  const { days, slots } = useMemo(() => exampleDays(), []);
  const firstWithSlots = days.find((d) => d.slots > 0 && !d.disabled)?.date ?? null;
  const [day, setDay] = useState<string | null>(firstWithSlots);
  const [slot, setSlot] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lost, setLost] = useState(false);

  const free = (day ? (slots[day] ?? []) : []).filter((s) => !taken.includes(s));
  const summary = lost
    ? "Esa hora se acaba de ocupar, elige otra"
    : slot
      ? `${formatDate(slot)} · ${formatTime(slot)}`
      : null;

  const chooseDay = (next: string) => {
    setDay(next);
    setSlot(null);
    setLost(false);
  };

  return (
    <Frame label="Ejemplo del paso de horario">
      <StepHeader step={1} total={2} name="Horario" onBack={() => toast("Atrás")} />
      <div className="flex items-center justify-between gap-3 px-gutter">
        <p className="text-body text-fg-muted">Corte normal · {formatDuration(60)}</p>
        <Button variant="ghost" className="-mr-3 px-3" onClick={() => toast("Cambiar servicio")}>
          Cambiar
        </Button>
      </div>
      <h3 className="px-gutter pt-4 pb-4 text-title">Elige tu hora</h3>
      <DateStrip days={days} value={day} onChange={chooseDay} />
      <div className="grid gap-4 px-gutter pt-6 pb-8">
        {loading ? (
          <SlotGridSkeleton />
        ) : free.length > 0 ? (
          <SlotGrid
            slots={free}
            value={slot}
            onChange={(s) => {
              setSlot(s);
              setLost(false);
            }}
          />
        ) : (
          <EmptyState
            title="Sin horas este día"
            action={
              <Button
                variant="secondary"
                onClick={() =>
                  chooseDay(
                    days.find((d) => d.slots > 0 && d.date > (day ?? ""))?.date ?? day ?? "",
                  )
                }
              >
                Ver la próxima hora libre
              </Button>
            }
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setLoading((v) => !v)}>
            {loading ? "Ver horas" : "Simular carga"}
          </Button>
          <Button
            variant="secondary"
            disabled={!slot}
            onClick={() => {
              if (!slot) return;
              setTaken((t) => [...t, slot]);
              setSlot(null);
              setLost(true);
            }}
          >
            Simular ocupada
          </Button>
        </div>
      </div>
      <BottomBar summary={summary}>
        <Button disabled={!slot} onClick={() => toast("Continuar")}>
          Continuar
        </Button>
      </BottomBar>
    </Frame>
  );
}

/* ------------------------------------------------------------------ página */

export function Muestras() {
  const example = "2026-11-19T20:00:00Z";
  const [consentError, setConsentError] = useState(true);

  return (
    <main className="mx-auto max-w-md pb-safe-8">
      <Toaster />
      <header className="flex items-center gap-3 px-gutter pt-safe-6 pb-4">
        <Logo label="" />
        <p className="text-label text-brand">Possos Barber</p>
      </header>
      <div className="grid gap-2 px-gutter pb-8">
        <h1 className="text-title">Muestras</h1>
        <p className="text-body text-fg-muted">
          Página interna, solo en desarrollo. Nombres, horas y valores son de ejemplo; los precios
          reales siguen [PENDIENTE].
        </p>
      </div>

      <Section id="color" title="Color">
        <ul className="grid grid-cols-2 gap-3">
          {(Object.keys(colors) as ColorToken[]).map((token) => (
            <li key={token} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`size-12 shrink-0 rounded-card border border-border-strong ${SWATCH[token]}`}
              />
              <span className="grid">
                <span className="text-label">--{token}</span>
                <span className="text-caption text-fg-muted tabular-nums">{colors[token]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tipografia" title="Tipografía">
        <div className="grid gap-3">
          <p className="text-title">Title 28/34 · Elige tu hora</p>
          <p className="text-heading">Heading 20/28 · Tarde</p>
          <p className="text-body">
            Body 16/24 · Puedes cancelar o cambiar tu cita hasta 2 horas antes.
          </p>
          <p className="text-label">Label 15/20 · Continuar</p>
          <p className="text-caption text-fg-muted">Caption 13/18 · 60 min</p>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-card border border-border p-4">
          <div>
            <p className="text-caption text-fg-muted">Proporcionales</p>
            <p className="text-label">11:11</p>
            <p className="text-label">10:00</p>
          </div>
          <div>
            <p className="text-caption text-fg-muted">tabular-nums</p>
            <p className="text-label tabular-nums">11:11</p>
            <p className="text-label tabular-nums">10:00</p>
          </div>
        </div>
      </Section>

      <Section id="logo" title="Logo">
        <div className="flex items-end gap-6">
          <Logo size={28} />
          <Logo size={48} />
          <Logo size={96} />
        </div>
        <p className="text-caption text-fg-muted">
          PNG recortado del logo actual, a 1x, 2x y 3x. Se reemplaza por el SVG cuando el dueño lo
          entregue.
        </p>
      </Section>

      <Section id="marcas" title="Marcas">
        <p className="text-body text-fg-muted">
          ¡El barbero <Highlight>más viral</Highlight> de Girardot!
        </p>
        <p className="text-title">
          Tu cita quedó <Highlight>reservada</Highlight>
        </p>
        <SectionTitle>Servicios</SectionTitle>
        <div className="grid gap-2 rounded-card border border-l-3 border-accent-muted border-l-accent bg-accent-tint p-4">
          <span className="text-caption text-fg-muted">Tarjeta con tinte</span>
          <span className="text-heading">jue 20 nov, 3:00 p. m.</span>
        </div>
        <p className="text-caption text-fg-muted">
          Trazos a mano en el neón y tintes cálidos: solo en el inicio, en Listo y en lo que el
          cliente marcó. El relleno amarillo sigue siendo la acción.
        </p>
      </Section>

      <Section id="botones" title="Botones">
        <div className="grid gap-3">
          <Button>Reservar</Button>
          <Button variant="secondary">Agregar al calendario</Button>
          <Button variant="ghost">Usar mi correo</Button>
          <Button variant="danger">Sí, cancelar</Button>
          <Button disabled>Continuar</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Cerrar aviso">
              <X strokeWidth={1.5} />
            </Button>
            <p className="text-caption text-fg-muted">Ícono suelto: 44 px con área de 48 px.</p>
          </div>
        </div>
      </Section>

      <Section id="horario" title="Flujo: horario">
        <BookingSample />
      </Section>

      <Section id="lista" title="Filas">
        <List>
          <ListRow
            title="Corte normal"
            detail={formatDuration(60)}
            value="[PENDIENTE]"
            onClick={() => toast("Servicio elegido")}
          />
          <ListRow
            title="Andrés M."
            detail={formatTimeRange("2026-11-19T15:00:00Z", "2026-11-19T16:00:00Z")}
            href="/muestras"
          />
          <ListRow title="Total del día" detail="6 servicios" value={formatPrice(210000)} />
        </List>
      </Section>

      <Section id="desplegables" title="Filas que se despliegan">
        <List>
          <ListDisclosureRow
            group="muestra-servicios"
            title="Corte"
            detail={formatDuration(60)}
            value={formatPrice(25000)}
          >
            <p className="text-body text-fg-muted">
              Servicio de corte que incluye asesoría personalizada
            </p>
            <Button variant="secondary" className="w-full" onClick={() => toast("Reservar")}>
              Reservar este servicio
            </Button>
          </ListDisclosureRow>
          <ListDisclosureRow
            group="muestra-servicios"
            title="Corte con barba"
            detail={formatDuration(120)}
            value={formatPrice(40000)}
          >
            <Button variant="secondary" className="w-full" onClick={() => toast("Reservar")}>
              Reservar este servicio
            </Button>
          </ListDisclosureRow>
          <ListDisclosureRow
            group="muestra-servicios"
            title="Global platinado"
            detail={formatDuration(300)}
            value={formatPrice(170000)}
          >
            <Button variant="secondary" className="w-full" onClick={() => toast("Reservar")}>
              Reservar este servicio
            </Button>
          </ListDisclosureRow>
        </List>
      </Section>

      <Section id="estados" title="Estados de la cita">
        <ul className="grid gap-3">
          {STATUSES.map((s) => (
            <li key={s.status} className="flex items-center justify-between gap-3">
              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
              <code className="text-caption text-fg-muted">{s.status}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="hoja" title="Hoja inferior">
        <Sheet
          title={`¿Cancelar tu cita del ${formatDate(example)} a las ${formatTime(example)}?`}
          description="La hora queda libre para otro cliente."
          trigger={
            <SheetTrigger asChild>
              <Button variant="secondary">Cancelar cita</Button>
            </SheetTrigger>
          }
          footer={
            <>
              <SheetClose asChild>
                <Button variant="danger" onClick={() => toast("Cita cancelada")}>
                  Sí, cancelar
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="secondary">No</Button>
              </SheetClose>
            </>
          }
        />
      </Section>

      <Section id="avisos" title="Avisos, vacío, error y carga">
        <Button variant="secondary" onClick={() => toast("Tu cita quedó reservada")}>
          Mostrar aviso
        </Button>
        <EmptyState
          title="Todavía no tienes citas"
          action={<Button onClick={() => toast("Reservar")}>Reservar</Button>}
        />
        <InlineError
          action={
            <Button variant="secondary" onClick={() => toast("Reintentando")}>
              Intentar de nuevo
            </Button>
          }
        >
          No pudimos cargar las horas. Revisa tu conexión e intenta de nuevo
        </InlineError>
        <div className="grid gap-2" aria-label="Cargando" role="status">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Section>

      <Section id="campos" title="Campos">
        <form className="grid gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
          <Field label="Nombre">
            <Input name="name" autoComplete="name" />
          </Field>
          <Field label="Celular" hint="Te llegan los recordatorios por WhatsApp a este número.">
            <PhoneInput name="phone" />
          </Field>
          <Field label="Correo" error="Escribe un correo válido.">
            <Input name="email" type="email" autoComplete="email" defaultValue="carlos@" />
          </Field>
          <Field label="Notas privadas">
            <Textarea name="notes" />
          </Field>
          <Checkbox
            name="data"
            error={consentError ? "Necesitamos tu autorización para crear la cuenta." : undefined}
            onChange={(e) => setConsentError(!e.currentTarget.checked)}
          >
            Autorizo el tratamiento de mis datos personales según la política de tratamiento de
            datos.
          </Checkbox>
          <Checkbox name="whatsapp">
            Quiero recibir los recordatorios de mis citas por WhatsApp.
          </Checkbox>
        </form>
      </Section>

      <Section id="navegacion" title="Navegación del panel">
        <div
          role="region"
          aria-label="Ejemplo de la navegación inferior"
          tabIndex={0}
          className="-mx-gutter flex h-40 flex-col overflow-y-auto border-y border-border"
        >
          <p className="px-gutter pt-4 text-body text-fg-muted">Contenido de la pestaña.</p>
          <TabBar
            items={[
              { href: "/muestras?tab=hoy", label: "Hoy", icon: <CalendarDays />, current: true },
              { href: "/muestras?tab=semana", label: "Semana", icon: <CalendarRange /> },
              { href: "/muestras?tab=clientes", label: "Clientes", icon: <Users /> },
              { href: "/muestras?tab=mas", label: "Más", icon: <Ellipsis /> },
            ]}
          />
        </div>
      </Section>

      <Section id="formato" title="Formato">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
          {[
            ["Día", formatDate(example)],
            ["Día largo", formatDateLong(example)],
            ["Mes", formatMonthYear(example)],
            ["Hora", formatTime(example)],
            ["Rango", formatTimeRange(example, "2026-11-19T21:00:00Z")],
            ["Precio", formatPrice(35000)],
            ["Duración", formatDuration(60)],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-fg-muted">{k}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </main>
  );
}
