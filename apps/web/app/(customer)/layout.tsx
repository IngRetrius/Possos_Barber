/**
 * Pantallas del cliente: reservar, perfil y, en F5, mis citas. Cada página pone su encabezado
 * (el logo en el perfil, "Paso n de m" en la reserva). La guarda va en cada página con
 * `requireCustomer`, que conoce la ruta para volver a ella: un layout no se vuelve a ejecutar
 * al navegar entre sus páginas. Los pasos de la reserva no exigen sesión hasta "Reservar".
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
