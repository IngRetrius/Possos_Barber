import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MY_APPOINTMENTS_ROUTES } from "@possos/booking";
import { MyAppointmentCard } from "@possos/booking/ui";
import { createClient } from "@possos/supabase/server";
import { Button } from "@possos/ui";
import { param } from "../../../../lib/session";
import { cancelMyAppointmentAction } from "../actions";
import { cardContext, loadMyAppointment } from "../_components/my-appointments";
import { NoticeToast } from "../_components/notice-toast";

export const metadata: Metadata = { title: "Tu cita · Possos Barber" };

const NOTICES: Record<string, string> = {
  cambiada: "Cambiamos tu cita",
};

/**
 * Una cita del cliente: el destino de los botones de WhatsApp (F7) y de "También tienes". Sin
 * sesión pide ingresar y vuelve; con otra cuenta, 404.
 */
export default async function MyAppointmentPage({
  params,
  searchParams,
}: PageProps<"/mis-citas/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const db = await createClient();
  const appointment = await loadMyAppointment(db, id, MY_APPOINTMENTS_ROUTES.detail);
  const aviso = param(query.aviso);
  const notice = aviso ? NOTICES[aviso] : undefined;

  return (
    <>
      <header className="flex min-h-14 items-center gap-1 px-2 pt-safe">
        <Button asChild variant="ghost" size="icon">
          <Link href={MY_APPOINTMENTS_ROUTES.list} aria-label="Mis citas">
            <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </Button>
        <p className="text-label text-fg-muted">Mis citas</p>
      </header>
      <main className="grid flex-1 content-start gap-6 px-gutter pt-2 pb-10 md:mx-auto md:w-full md:max-w-2xl">
        <h1 className="text-title">Tu cita</h1>
        <MyAppointmentCard
          appointment={appointment}
          now={new Date().toISOString()}
          cancelAction={cancelMyAppointmentAction}
          {...cardContext(appointment)}
        />
      </main>
      {aviso && notice ? <NoticeToast id={aviso} message={notice} /> : null}
    </>
  );
}
