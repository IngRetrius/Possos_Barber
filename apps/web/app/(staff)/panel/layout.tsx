import { NextIntlClientProvider } from "next-intl";
import { requireStaff } from "@possos/auth/server";
import { createClient } from "@possos/supabase/server";
import { Toaster } from "@possos/ui";
import { PanelTabBar } from "./_components/tab-bar";

/**
 * Panel del personal. La guarda se decide en el servidor con is_admin() y current_barber_id():
 * sin sesión va a ingresar; un cliente recibe 404. Cada página y cada acción del panel repite
 * la guarda (un layout no se vuelve a ejecutar al navegar entre sus páginas), y RLS protege los
 * datos.
 *
 * El layout raíz solo entrega a los componentes de cliente los textos del sitio público
 * (i18n/messages.ts). Este proveedor, sin `messages`, entrega todos los del idioma: los del panel
 * solo llegan a quien entra al panel.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireStaff(await createClient());
  return (
    <NextIntlClientProvider>
      <div className="flex min-h-dvh flex-col">
        {children}
        <PanelTabBar />
        <Toaster />
      </div>
    </NextIntlClientProvider>
  );
}
