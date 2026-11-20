import { BUSINESS } from "../../../lib/business";
import { PolicySection as Section } from "./policy-section";

/**
 * Texto de la política en español: es el que rige. Sigue el contenido mínimo del artículo 13 del
 * Decreto 1377 de 2013 (hoy en el Decreto 1074 de 2015) y describe lo que la app hace de verdad:
 * qué guarda, quién lo ve, dónde vive y qué pasa al borrar la cuenta. Lo que el dueño no ha dado
 * dice [PENDIENTE] (regla 8). Antes de quitar "borrador", la revisa un abogado (riesgo 8 de
 * docs/10).
 */
export function PolicyEs() {
  return (
    <>
      <Section title="1. Quién es el responsable">
        <p>
          {BUSINESS.name} es la barbería que agenda tus citas y decide cómo se tratan tus datos.
        </p>
        <ul>
          <li>Nombre o razón social: [PENDIENTE].</li>
          <li>Cédula o NIT: [PENDIENTE].</li>
          <li>
            Dirección: {BUSINESS.address}, {BUSINESS.city}, {BUSINESS.region}, Colombia.
          </li>
          <li>Correo para consultas y reclamos: [PENDIENTE].</li>
          <li>Teléfono: [PENDIENTE].</li>
        </ul>
        <p>
          Esta política sigue la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto
          1074 de 2015) y las demás normas de protección de datos personales de Colombia.
        </p>
      </Section>

      <Section title="2. Qué datos tratamos">
        <ul>
          <li>
            Para tu cuenta: tu nombre, tu celular y tu correo. Si ingresas con Google, recibimos de
            Google tu nombre y tu correo. Tu contraseña la guarda cifrada nuestro proveedor de
            cuentas; nadie de la barbería la puede ver.
          </li>
          <li>
            De tus citas: fecha, hora, servicio, barbero, valor, si la cancelaste o la cambiaste y
            si asististe.
          </li>
          <li>
            Las notas que el barbero escriba sobre tu servicio (por ejemplo, cómo te gusta el
            corte).
          </li>
          <li>
            Tus autorizaciones: cuándo aceptaste esta política, qué versión aceptaste y si aceptaste
            recibir mensajes por WhatsApp.
          </li>
          <li>
            Datos técnicos: las cookies necesarias para mantener tu sesión y recordar tu idioma, y
            los registros que guardan nuestros proveedores de alojamiento por seguridad (como la
            dirección IP y el navegador).
          </li>
        </ul>
        <p>
          Si el barbero agenda una cita por ti sin que tengas cuenta, guarda tu nombre y tu celular
          con la autorización que le des de palabra.
        </p>
        <p>
          No pedimos datos sensibles (como datos de salud o biométricos) ni documentos de identidad.
        </p>
      </Section>

      <Section title="3. Para qué los usamos">
        <ul>
          <li>Crear y administrar tu cuenta.</li>
          <li>Agendar, cambiar, cancelar y recordarte tus citas, y mostrarte tu historial.</li>
          <li>
            Llevar el registro de asistencia. Si faltas a 2 citas sin cancelar, tus siguientes
            reservas quedan pendientes de que el barbero las apruebe.
          </li>
          <li>
            Enviarte por WhatsApp la confirmación y los recordatorios de tus citas, solo si lo
            autorizas aparte. Por ese medio no enviamos publicidad.
          </li>
          <li>Contactarte sobre una cita, por ejemplo si el barbero necesita moverla.</li>
          <li>
            Llevar las cuentas internas de la barbería: el valor de cada servicio y cómo se reparte
            entre el barbero y la barbería.
          </li>
          <li>Atender tus consultas y reclamos, y cumplir las obligaciones legales.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </Section>

      <Section title="4. Quién ve tus datos">
        <ul>
          <li>El barbero con el que tienes citas ve tu nombre, tu celular y esas citas.</li>
          <li>El administrador de la barbería puede ver todos los datos para manejar la agenda.</li>
          <li>
            Ningún otro cliente ve tu nombre ni tu celular. Las horas libres se muestran sin datos
            de nadie.
          </li>
        </ul>
      </Section>

      <Section title="5. Proveedores y datos fuera de Colombia">
        <p>
          Para que la app funcione usamos proveedores que tratan los datos por cuenta nuestra
          (encargados), solo para las finalidades de esta política:
        </p>
        <ul>
          <li>Supabase: base de datos y cuentas. Sus servidores están en Estados Unidos.</li>
          <li>Vercel: alojamiento del sitio. Sus servidores están en Estados Unidos.</li>
          <li>
            Meta Platforms (WhatsApp Business): envío de confirmaciones y recordatorios, solo si los
            autorizaste.
          </li>
          <li>Google: solo si decides ingresar con tu cuenta de Google.</li>
        </ul>
        <p>
          Esto significa que tus datos se transmiten y se guardan fuera de Colombia. Al aceptar esta
          política autorizas esa transmisión.
        </p>
      </Section>

      <Section title="6. Tus derechos">
        <p>Como titular de tus datos tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y corregir tus datos.</li>
          <li>Pedir prueba de la autorización que nos diste.</li>
          <li>Saber, si lo pides, cómo hemos usado tus datos.</li>
          <li>
            Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por
            incumplimientos de la ley.
          </li>
          <li>
            Revocar la autorización o pedir que borremos tus datos, salvo cuando la ley o un
            contrato nos obliguen a conservarlos.
          </li>
          <li>Acceder gratis a tus datos.</li>
        </ul>
        <p>
          Si eres menor de edad, tu madre, tu padre o tu representante legal debe autorizar el
          tratamiento de tus datos.
        </p>
      </Section>

      <Section title="7. Cómo ejercerlos">
        <ul>
          <li>
            Desde la app: en Tu perfil puedes ver y corregir tu nombre y tu celular, quitar la
            autorización de WhatsApp y borrar tu cuenta.
          </li>
          <li>
            Por correo, a la dirección de la sección 1, o en persona en la barbería. Pueden hacerlo
            tú, tus causahabientes o quien te represente.
          </li>
        </ul>
        <p>
          Consultas: te respondemos en máximo 10 días hábiles. Si no alcanzamos, te avisamos el
          motivo y te respondemos en máximo 5 días hábiles más.
        </p>
        <p>
          Reclamos (corregir, actualizar o borrar datos, revocar la autorización o reportar un
          incumplimiento): escribe tu nombre, qué pasó, cómo responderte y los documentos que
          quieras adjuntar. Si falta algo, te lo pedimos en los 5 días siguientes; si pasan 2 meses
          sin que lo envíes, entendemos que desististe. Te respondemos en máximo 15 días hábiles,
          prorrogables hasta 8 días hábiles más avisándote el motivo. Mientras tanto, marcamos tus
          datos como &quot;reclamo en trámite&quot;.
        </p>
        <p>
          Puedes quejarte ante la SIC (www.sic.gov.co) después de hacer la consulta o el reclamo con
          nosotros.
        </p>
      </Section>

      <Section title="8. Cuánto tiempo los guardamos y qué pasa al borrar tu cuenta">
        <p>
          Guardamos tus datos mientras tengas cuenta y mientras sirvan para las finalidades de esta
          política.
        </p>
        <p>
          Al borrar tu cuenta se borran tu nombre, tu celular, tu correo, tus autorizaciones y las
          notas del barbero sobre ti. Las citas y los cobros pasados quedan en la agenda sin datos
          que te identifiquen, para que las cuentas de la barbería sigan cuadrando. Si tienes una
          cita próxima, primero debes cancelarla.
        </p>
      </Section>

      <Section title="9. Cómo cuidamos tus datos">
        <p>
          La conexión con la app va cifrada (HTTPS). Cada persona solo puede ver lo que le
          corresponde: la base de datos revisa en cada consulta quién la hace. Las contraseñas se
          guardan cifradas.
        </p>
      </Section>

      <Section title="10. Cambios y vigencia">
        <p>
          Si esta política cambia de forma importante, te la mostramos otra vez y te pedimos la
          autorización al ingresar. Rige desde [PENDIENTE] y las bases de datos se mantienen
          mientras la barbería preste el servicio.
        </p>
      </Section>
    </>
  );
}
