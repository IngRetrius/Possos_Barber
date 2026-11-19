import { requireStaff } from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { Toaster } from "@possos/ui";
import { PanelTabBar } from "./_components/tab-bar";

/**
 * Panel del personal. La guarda se decide en el servidor con is_admin() y current_barber_id():
 * sin sesión va a ingresar; un cliente recibe 404. Cada página y cada acción del panel repite
 * la guarda (un layout no se vuelve a ejecutar al navegar entre sus páginas), y RLS protege los
 * datos.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(await createClient());
  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      <PanelTabBar />
      <Toaster />
    </div>
  );
}
