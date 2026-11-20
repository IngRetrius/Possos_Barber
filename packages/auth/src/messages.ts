import { MIN_PASSWORD_LENGTH } from "./internal/password";

/*
 * Textos de la interfaz de @possos/auth en español y en inglés (docs/11, "Idiomas"). La app los
 * junta bajo la clave "auth". El inglés tiene la misma forma que el español: si falta una clave,
 * TypeScript lo marca. Los correos de Supabase (activar la cuenta, cambiar la contraseña) siguen
 * en español: sus plantillas no saben el idioma de la persona.
 */

const es = {
  errors: {
    INVALID_CREDENTIALS: "El correo o la contraseña no coinciden",
    EMAIL_NOT_CONFIRMED: "Primero activa tu cuenta con el enlace que te enviamos al correo",
    INVALID_EMAIL: "Escribe un correo válido",
    WEAK_PASSWORD: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    SAME_PASSWORD: "La contraseña nueva debe ser distinta de la anterior",
    LINK_EXPIRED: "El enlace venció o ya se usó. Pide uno nuevo",
    GOOGLE_FAILED: "No pudimos ingresar con Google. Intenta de nuevo o usa tu correo",
    RATE_LIMITED: "Hiciste muchos intentos seguidos. Espera unos minutos e intenta de nuevo",
    NOT_AUTHENTICATED: "Ingresa para continuar",
    FORBIDDEN: "No tienes permiso para hacer esto",
    USER_NOT_FOUND: "No hay una cuenta con ese correo. Pídele que se registre primero",
    CANNOT_REVOKE_SELF: "No puedes quitarte a ti mismo el rol de administrador",
    INVALID_INPUT: "Revisa los datos e intenta de nuevo",
    UNKNOWN: "No pudimos completar la acción. Intenta de nuevo",
  },
  validation: {
    emailRequired: "Escribe tu correo",
    passwordRequired: "Escribe tu contraseña",
  },
  forms: {
    google: "Continuar con Google",
    googlePending: "Abriendo Google...",
    orEmail: "o con tu correo",
    email: "Correo",
    password: "Contraseña",
    newPassword: "Contraseña nueva",
    passwordHint: "Mínimo {min} caracteres.",
    signInTitle: "Ingresa",
    signInIntro: "Para reservar y ver tus citas.",
    resent: "Te enviamos otra vez el enlace de activación. Revisa tu correo.",
    resend: "Reenviar el enlace",
    forgot: "Olvidé mi contraseña",
    noAccount: "¿No tienes cuenta? <link>Crea una</link>",
    signingIn: "Ingresando...",
    signIn: "Ingresar",
    checkEmail: "Revisa tu correo",
    sentTo:
      "Te enviamos un enlace a <email></email>. Ábrelo para activar tu cuenta y seguir donde ibas.",
    spam: "Si no llega en unos minutos, revisa la carpeta de spam o pide otro enlace.",
    sending: "Enviando...",
    otherEmail: "Usar otro correo",
    signUpTitle: "Crea tu cuenta",
    signUpIntro: "Con tu cuenta reservas, cambias y cancelas tus citas.",
    haveAccount: "¿Ya tienes cuenta? <link>Ingresa</link>",
    creating: "Creando tu cuenta...",
    signUp: "Crear cuenta",
    resetSent:
      "Si <email></email> tiene una cuenta, te llega un enlace para elegir una contraseña nueva. Vence en una hora.",
    backToSignIn: "Volver a ingresar",
    resetTitle: "Cambia tu contraseña",
    resetIntro: "Te enviamos un enlace para elegir una contraseña nueva.",
    sendLink: "Enviar el enlace",
    newPasswordTitle: "Elige tu contraseña nueva",
    saving: "Guardando...",
    savePassword: "Guardar contraseña",
  },
  account: {
    signingOut: "Cerrando sesión...",
    signOut: "Cerrar sesión",
    deleteTitle: "Borrar tu cuenta",
    deleteBody:
      "Se borran tu nombre, tu celular, tu correo y tus autorizaciones. Las citas pasadas quedan en la agenda del barbero sin tus datos. No se puede deshacer.",
    confirmTitle: "¿Borrar tu cuenta?",
    confirmBody:
      "Se borran tus datos y no vas a poder ingresar con este correo hasta crear una cuenta nueva.",
    deleting: "Borrando tu cuenta...",
    delete: "Borrar mi cuenta",
    confirm: "Sí, borrar mi cuenta",
    no: "No",
  },
};

const en: typeof es = {
  errors: {
    INVALID_CREDENTIALS: "The email or the password don't match",
    EMAIL_NOT_CONFIRMED: "First activate your account with the link we sent to your email",
    INVALID_EMAIL: "Enter a valid email",
    WEAK_PASSWORD: `The password must have at least ${MIN_PASSWORD_LENGTH} characters`,
    SAME_PASSWORD: "The new password must be different from the old one",
    LINK_EXPIRED: "The link expired or was already used. Ask for a new one",
    GOOGLE_FAILED: "We couldn't sign you in with Google. Try again or use your email",
    RATE_LIMITED: "You tried too many times in a row. Wait a few minutes and try again",
    NOT_AUTHENTICATED: "Sign in to continue",
    FORBIDDEN: "You don't have permission to do this",
    USER_NOT_FOUND: "There is no account with that email. Ask them to sign up first",
    CANNOT_REVOKE_SELF: "You can't remove the admin role from yourself",
    INVALID_INPUT: "Check the details and try again",
    UNKNOWN: "We couldn't complete the action. Try again",
  },
  validation: {
    emailRequired: "Enter your email",
    passwordRequired: "Enter your password",
  },
  forms: {
    google: "Continue with Google",
    googlePending: "Opening Google...",
    orEmail: "or with your email",
    email: "Email",
    password: "Password",
    newPassword: "New password",
    passwordHint: "At least {min} characters.",
    signInTitle: "Sign in",
    signInIntro: "To book and see your appointments.",
    resent: "We sent you the activation link again. Check your email.",
    resend: "Resend the link",
    forgot: "I forgot my password",
    noAccount: "Don't have an account? <link>Create one</link>",
    signingIn: "Signing in...",
    signIn: "Sign in",
    checkEmail: "Check your email",
    sentTo:
      "We sent a link to <email></email>. Open it to activate your account and pick up where you left off.",
    spam: "If it doesn't arrive in a few minutes, check your spam folder or ask for another link.",
    sending: "Sending...",
    otherEmail: "Use another email",
    signUpTitle: "Create your account",
    signUpIntro: "With your account you book, change and cancel your appointments.",
    haveAccount: "Already have an account? <link>Sign in</link>",
    creating: "Creating your account...",
    signUp: "Create account",
    resetSent:
      "If <email></email> has an account, you'll get a link to choose a new password. It expires in one hour.",
    backToSignIn: "Back to sign in",
    resetTitle: "Change your password",
    resetIntro: "We'll send you a link to choose a new password.",
    sendLink: "Send the link",
    newPasswordTitle: "Choose your new password",
    saving: "Saving...",
    savePassword: "Save password",
  },
  account: {
    signingOut: "Signing out...",
    signOut: "Sign out",
    deleteTitle: "Delete your account",
    deleteBody:
      "Your name, mobile number, email and authorizations are deleted. Past appointments stay in the barber's schedule without your data. This can't be undone.",
    confirmTitle: "Delete your account?",
    confirmBody:
      "Your data is deleted and you won't be able to sign in with this email until you create a new account.",
    deleting: "Deleting your account...",
    delete: "Delete my account",
    confirm: "Yes, delete my account",
    no: "No",
  },
};

export const messages = { es, en };
