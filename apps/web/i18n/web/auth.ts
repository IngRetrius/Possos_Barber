/** Textos de las pantallas de cuenta: ingresar, registrarse, contraseña y completar el perfil. */

const es = {
  meta: {
    signIn: "Ingresa · Possos Barber",
    signUp: "Crea tu cuenta · Possos Barber",
    reset: "Cambia tu contraseña · Possos Barber",
    newPassword: "Contraseña nueva · Possos Barber",
    completeProfile: "Completa tu perfil · Possos Barber",
  },
  notices: {
    accountDeleted: "Borramos tu cuenta y tus datos.",
    accountActivated: "Tu correo quedó confirmado. Ingresa con tu contraseña para seguir.",
  },
  otherBrowser:
    "Abre el enlace en el mismo navegador donde pediste el cambio, o pide uno nuevo desde aquí.",
  completeProfile: {
    title: "Completa tu perfil",
    intro: "Con tu nombre y tu celular te reconocemos en la barbería y te avisamos de tus citas.",
    updatedTitle: "Actualizamos la política de datos",
    updatedIntro:
      "Revisa tus datos y autoriza de nuevo su tratamiento para seguir usando tu cuenta.",
    submit: "Guardar y continuar",
  },
};

const en: typeof es = {
  meta: {
    signIn: "Sign in · Possos Barber",
    signUp: "Create your account · Possos Barber",
    reset: "Change your password · Possos Barber",
    newPassword: "New password · Possos Barber",
    completeProfile: "Complete your profile · Possos Barber",
  },
  notices: {
    accountDeleted: "We deleted your account and your data.",
    accountActivated: "Your email is confirmed. Sign in with your password to continue.",
  },
  otherBrowser:
    "Open the link in the same browser where you asked for the change, or ask for a new one here.",
  completeProfile: {
    title: "Complete your profile",
    intro:
      "With your name and mobile number we recognize you at the barbershop and remind you of your appointments.",
    updatedTitle: "We updated the data policy",
    updatedIntro: "Review your data and authorize its processing again to keep using your account.",
    submit: "Save and continue",
  },
};

export const auth = { es, en };
