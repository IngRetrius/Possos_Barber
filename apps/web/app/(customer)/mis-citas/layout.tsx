import { Toaster } from "@possos/ui";

/** "Mis citas": los avisos de éxito ("Cancelaste tu cita", "Cambiamos tu cita") salen arriba. */
export default function MyAppointmentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
