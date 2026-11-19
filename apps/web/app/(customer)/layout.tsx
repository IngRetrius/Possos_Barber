import { SiteHeader } from "../_components/site-header";

/**
 * Pantallas del cliente con sesión (perfil; mis citas en F5). La guarda va en cada página con
 * `requireCustomer`, que conoce la ruta para volver a ella: un layout no se vuelve a ejecutar
 * al navegar entre sus páginas.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {children}
    </div>
  );
}
