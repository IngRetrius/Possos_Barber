"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@possos/supabase/client";
import {
  BottomBar,
  Button,
  DateStrip,
  formatDate,
  formatDateLong,
  formatTime,
  InlineError,
  SlotGrid,
  SlotGridSkeleton,
} from "@possos/ui";
import { bookingErrorMessage } from "./errors";
import {
  BOOKING_ROUTES,
  nextDayWithSlots,
  normalizeInstant,
  selectionHref,
  type DayAvailability,
} from "./selection";

export interface TimePickerProps {
  serviceId: string;
  /** Id del barbero o `ANY_BARBER`. */
  barberId: string;
  days: DayAvailability[];
  /** Día que se muestra (`YYYY-MM-DD`). */
  date: string;
  /** Horas libres de ese día (ISO, `toISOString`). */
  slots: string[];
  /** Hora que viene en la URL (al volver de "Confirmar"). */
  initialStartAt: string | null;
  /** Barberos cuyos avisos de Broadcast se escuchan (`slots:<barber_id>:<fecha>`). */
  watchBarberIds: string[];
  /** Aviso arriba de la cuadrícula ("Hoy no hay horas..."). */
  notice?: string | null;
  /** Volvió de "Confirmar" porque la hora se ocupó. */
  slotTaken?: boolean;
  /** No se pudieron leer las horas. */
  loadError?: boolean;
  /**
   * Rutas del paso y del siguiente, si no son las de la reserva. "Cambiar hora" (F5) usa
   * `/mis-citas/<id>/cambiar`: la ruta ya dice qué cita es, así que la URL no lleva servicio ni
   * barbero, solo `fecha` y `hora`.
   */
  paths?: { time: string; confirm: string };
}

/** Espera antes de mostrar el esqueleto: si la respuesta tarda menos, no se ve nada (docs/11). */
const SKELETON_DELAY_MS = 300;

function useDelayed(active: boolean, delay: number): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
  return shown;
}

/**
 * Paso "Horario": tira de días, cuadrícula de horas y barra inferior con "Continuar".
 *
 * - Cambiar de día reemplaza la URL (`router.replace`): el servidor trae las horas y el botón
 *   atrás no recorre los días, solo los pasos.
 * - Elegir una hora la escribe en la URL con `history.replaceState`, sin ir al servidor.
 * - Un aviso de Broadcast o volver a la pestaña piden las horas otra vez. Si la elegida
 *   desapareció, la barra inferior dice "Esa hora se acaba de ocupar, elige otra".
 */
export function TimePicker({
  serviceId,
  barberId,
  days,
  date,
  slots,
  initialStartAt,
  watchBarberIds,
  notice,
  slotTaken = false,
  loadError = false,
  paths,
}: TimePickerProps) {
  const router = useRouter();
  // Al volver atrás, Next pinta esta página desde su caché con las props de la primera visita;
  // la URL sí tiene la hora que se eligió después (replaceState).
  const urlStartAt = normalizeInstant(useSearchParams().get("hora"));
  const [pending, startTransition] = useTransition();
  const showSkeleton = useDelayed(pending, SKELETON_DELAY_MS);
  const [day, setDay] = useState(date);
  const [selected, setSelected] = useState<string | null>(() => {
    const initial = urlStartAt ?? initialStartAt;
    return initial && slots.includes(initial) ? initial : null;
  });
  const [taken, setTaken] = useState(slotTaken);
  const previousSlots = useRef(slots);

  // El servidor manda el día nuevo: la tira lo sigue.
  useEffect(() => setDay(date), [date]);

  const base = paths ? {} : { serviceId, barberId };
  const timePath = paths?.time ?? BOOKING_ROUTES.time;
  const confirmPath = paths?.confirm ?? BOOKING_ROUTES.confirm;
  const hrefFor = (d: string, startAt: string | null = null, extra?: Record<string, string>) =>
    selectionHref(timePath, { ...base, date: d, startAt }, extra);

  // Llegaron horas nuevas (aviso de Broadcast o volver a la pestaña): ¿sigue libre la elegida?
  useEffect(() => {
    const before = previousSlots.current;
    previousSlots.current = slots;
    if (selected && !slots.includes(selected) && before.includes(selected)) {
      setSelected(null);
      setTaken(true);
      window.history.replaceState(null, "", hrefFor(day));
    }
    // Solo importan las horas nuevas; hrefFor y day cambian con cada render.
  }, [slots]);

  // Avisos de Broadcast: solo dicen "cambió la disponibilidad", sin datos de nadie (docs/07).
  const watched = watchBarberIds.join(",");
  useEffect(() => {
    if (!watched) return;
    const supabase = createClient();
    const channels = watched.split(",").map((id) =>
      supabase
        .channel(`slots:${id}:${date}`)
        .on("broadcast", { event: "slots_changed" }, () => router.refresh())
        .subscribe(),
    );
    return () => {
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [watched, date, router]);

  // Al volver a la pestaña, las horas pudieron cambiar sin que llegara el aviso.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const changeDay = (next: string) => {
    setDay(next);
    setSelected(null);
    setTaken(false);
    startTransition(() => router.replace(hrefFor(next), { scroll: false }));
  };

  const chooseSlot = (slot: string) => {
    setSelected(slot);
    setTaken(false);
    window.history.replaceState(null, "", hrefFor(day, slot));
  };

  const nextDay = nextDayWithSlots(days, day);
  const loading = pending || day !== date;

  let body;
  if (loadError) {
    body = (
      <InlineError
        action={
          <Button variant="secondary" onClick={() => startTransition(() => router.refresh())}>
            Intentar de nuevo
          </Button>
        }
      >
        No pudimos cargar las horas. Revisa tu conexión e intenta de nuevo
      </InlineError>
    );
  } else if (loading) {
    body = showSkeleton ? <SlotGridSkeleton /> : <div className="min-h-40" aria-hidden="true" />;
  } else if (slots.length > 0) {
    body = <SlotGrid slots={slots} value={selected} onChange={chooseSlot} />;
  } else {
    body = (
      <div className="grid gap-4 rounded-card border border-border bg-surface p-4">
        <p className="text-body text-fg-muted">
          {nextDay
            ? `El ${formatDateLong(day)} no tiene horas libres.`
            : "No hay horas libres en los próximos días."}
        </p>
        {nextDay ? (
          <Button variant="secondary" onClick={() => changeDay(nextDay)}>
            Ver la próxima hora libre
          </Button>
        ) : null}
      </div>
    );
  }

  const summary = taken ? (
    <span className="text-danger">{bookingErrorMessage("SLOT_TAKEN")}</span>
  ) : selected ? (
    `${formatDate(selected)} · ${formatTime(selected)}`
  ) : (
    <span className="text-fg-muted">Elige una hora</span>
  );

  return (
    <>
      <div className="grid gap-6 pb-6 md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] md:items-start md:gap-10 md:px-gutter">
        <DateStrip
          days={days}
          value={day}
          onChange={changeDay}
          label="Día"
          className="md:[&>p]:px-0 md:[&>div]:px-0"
        />
        <div className="grid gap-4 px-gutter md:px-0" aria-busy={loading}>
          {notice && !loading ? <p className="text-body text-fg-muted">{notice}</p> : null}
          {body}
        </div>
      </div>
      <BottomBar summary={summary}>
        {selected ? (
          <Button asChild>
            <Link
              href={selectionHref(confirmPath, {
                ...base,
                date: day,
                startAt: selected,
              })}
            >
              Continuar
            </Link>
          </Button>
        ) : (
          <Button disabled>Continuar</Button>
        )}
      </BottomBar>
    </>
  );
}
