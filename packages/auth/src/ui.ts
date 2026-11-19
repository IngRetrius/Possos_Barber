/**
 * API pública de UI de @possos/auth: formularios de ingreso, registro, contraseña y cuenta.
 * Son componentes de cliente; las acciones (Server Actions) las pasa la app.
 */
export {
  GoogleSignIn,
  NewPasswordForm,
  PasswordResetForm,
  SignInForm,
  SignUpForm,
  type AuthAction,
  type RedirectAction,
  type SignInFormProps,
  type SignUpFormProps,
} from "./internal/forms";
export { DeleteAccount, SignOutButton, type DeleteAccountProps } from "./internal/account";
