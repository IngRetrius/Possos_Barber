/**
 * API pública de @possos/auth: sesión, roles, guardas y formularios de ingreso.
 * Solo se exporta lo que otros módulos necesitan. Lo interno va en src/internal/ (docs/08).
 *
 * - `@possos/auth`: tipos, el parámetro `next` y los textos de error (sin efectos).
 * - `@possos/auth/server`: sesión, guardas de rol e ingreso, para Server Components y acciones.
 * - `@possos/auth/ui`: formularios de ingreso, registro y contraseña (componentes de cliente).
 *
 * Los roles se deciden en la base con is_admin() y current_barber_id() (docs/06); nada se
 * decide en el navegador.
 */
import type { Enums, Tables } from "@possos/supabase";

export type StaffRole = Enums<"staff_role">;
export type StaffRoleRow = Tables<"staff_roles">;

/** Quién está usando la app, según la sesión y la base. */
export interface Viewer {
  userId: string;
  email: string | null;
  /** Nombre que dio Google (si entró con Google), para prellenar el perfil. */
  providerName: string | null;
  isAdmin: boolean;
  /** `barbers.id` si tiene el rol de barbero. */
  barberId: string | null;
  /** Administrador o barbero. */
  isStaff: boolean;
}

/** Estado que devuelven las acciones de los formularios de ingreso (`useActionState`). */
export interface AuthFormState {
  /** Error general, ya en español. */
  error?: string;
  /** Errores por campo, ya en español. */
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  /** Lo que escribió, para no borrarlo si hay error (nunca la contraseña). */
  email?: string;
  /** El correo de activación o de cambio de contraseña ya salió. */
  sent?: boolean;
  /** Ingresó con una cuenta sin activar: se ofrece reenviar el correo. */
  unconfirmed?: boolean;
}

/** Rutas de ingreso. Viven en `apps/web/app/(auth)`. */
export const AUTH_ROUTES = {
  signIn: "/ingresar",
  signUp: "/registrarse",
  resetPassword: "/recuperar-contrasena",
  newPassword: "/nueva-contrasena",
  oauthCallback: "/auth/callback",
  emailConfirm: "/auth/confirmar",
} as const;

export { safeNext, withNext } from "./internal/next";
export { validateCredentials, validateEmail, validatePassword } from "./internal/validate";
export {
  AUTH_ERROR_CODES,
  MIN_PASSWORD_LENGTH,
  authErrorCode,
  authErrorMessage,
  type AuthErrorCode,
} from "./internal/errors";
