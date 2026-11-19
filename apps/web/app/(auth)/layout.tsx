import { SiteHeader } from "../_components/site-header";

/** Ingresar, registrarse, contraseña y completar el perfil. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {children}
    </div>
  );
}
