"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { CustomerPicker, type PickerCustomer } from "@possos/customers/ui";
import { BottomBar, Button, Checkbox, cn, formatDuration, submitKeepingValues } from "@possos/ui";
import {
  createAppointmentAction,
  searchCustomersAction,
  type AppointmentFormState,
} from "../_actions/agenda";
import { TimeFields } from "./time-fields";

export interface NewAppointmentFormProps {
  barberId: string;
  services: { id: string; name: string; duration_min: number }[];
  /** Adicionales activos de esos servicios (barba, cejas): se muestran los del elegido. */
  addons: { id: string; service_id: string; name: string; duration_min: number }[];
  recent: PickerCustomer[];
  date: string;
  time: string;
  freeStarts: string[];
  policyHref: string;
}

/** "Nueva cita" (docs/11): cliente, servicio y hora en una página, con "Crear cita" abajo. */
export function NewAppointmentForm({
  barberId,
  services,
  addons,
  recent,
  date,
  time,
  freeStarts,
  policyHref,
}: NewAppointmentFormProps) {
  const [state, action, pending] = useActionState<AppointmentFormState, FormData>(
    createAppointmentAction,
    {},
  );
  const t = useTranslations("web.agenda.newAppointment");
  const errors = state.fieldErrors ?? {};
  const [serviceId, setServiceId] = useState(services[0]?.id ?? null);
  const serviceAddons = addons.filter((a) => a.service_id === serviceId);
  return (
    <form
      action={action}
      onSubmit={submitKeepingValues(action)}
      className="flex flex-1 flex-col"
      noValidate
    >
      <input type="hidden" name="barbero" value={barberId} />
      <div className="grid gap-8 px-gutter pt-2 pb-8">
        <CustomerPicker
          key={state.createdCustomer?.id ?? "picker"}
          search={searchCustomersAction}
          initialResults={recent}
          initialCustomer={state.createdCustomer ?? null}
          errors={errors}
          policyHref={policyHref}
        />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-heading">{t("service")}</legend>
          {services.length === 0 ? (
            <p className="text-body text-fg-muted">{t("noServices")}</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {services.map((s, i) => (
                <label
                  key={s.id}
                  className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 has-[:checked]:bg-surface-2"
                >
                  <input
                    type="radio"
                    name="servicio"
                    value={s.id}
                    defaultChecked={i === 0}
                    onChange={() => setServiceId(s.id)}
                    className="size-5 shrink-0 accent-fg"
                  />
                  <span className="flex-1 text-label">{s.name}</span>
                  <span className="text-caption text-fg-muted">
                    {formatDuration(s.duration_min)}
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.service ? <p className="text-caption text-danger">{errors.service}</p> : null}
        </fieldset>
        {serviceAddons.length ? (
          // key: al cambiar de servicio, las casillas empiezan sin marcar.
          <fieldset key={serviceId} className="grid">
            <legend className="mb-1 text-heading">{t("addons")}</legend>
            {serviceAddons.map((a) => (
              <Checkbox key={a.id} name="adicional" value={a.id}>
                {a.duration_min > 0 ? `${a.name} · +${formatDuration(a.duration_min)}` : a.name}
              </Checkbox>
            ))}
          </fieldset>
        ) : null}
        <TimeFields date={date} time={time} freeStarts={freeStarts} error={errors.time} />
      </div>
      <BottomBar
        summary={state.error ? <span className={cn("text-danger")}>{state.error}</span> : null}
      >
        <Button type="submit" disabled={pending || services.length === 0} aria-busy={pending}>
          {pending ? t("pending") : t("submit")}
        </Button>
      </BottomBar>
    </form>
  );
}
