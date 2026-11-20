import { describe, expect, it } from "vitest";
import { APPOINTMENT_ID, appointment, context } from "./whatsapp-test-helpers";
import {
  actionFromButtonText,
  buttonPayload,
  cleanParam,
  firstName,
  parseButtonPayload,
  replies,
  templateMessage,
  TEMPLATES,
} from "./whatsapp-templates";

describe("templateMessage", () => {
  it("cita_confirmada: saludo, fecha, hora, servicio, barbero y la cita en el botón", () => {
    expect(templateMessage(TEMPLATES.confirmation, appointment(), context)).toEqual({
      name: "cita_confirmada",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Ana" },
            { type: "text", text: "sábado 21 de noviembre" },
            { type: "text", text: "3:00 p. m." },
            { type: "text", text: "Corte normal + Barba" },
            { type: "text", text: "Possos" },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: APPOINTMENT_ID }],
        },
      ],
    });
  });

  it("recordatorio_24h: los dos botones llevan la cita", () => {
    const message = templateMessage(TEMPLATES.firstReminder, appointment(), context);
    expect(message.components.slice(1)).toEqual([
      {
        type: "button",
        sub_type: "quick_reply",
        index: "0",
        parameters: [{ type: "payload", payload: `confirm:${APPOINTMENT_ID}` }],
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: "1",
        parameters: [{ type: "payload", payload: `change:${APPOINTMENT_ID}` }],
      },
    ]);
  });

  it("recordatorio_2h lleva la hora y la dirección; cita_cancelada, la fecha y la hora", () => {
    expect(templateMessage(TEMPLATES.lastReminder, appointment(), context).components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Ana" },
          { type: "text", text: "3:00 p. m." },
          { type: "text", text: context.address },
        ],
      },
    ]);
    expect(
      templateMessage(TEMPLATES.cancellation, appointment(), context).components[0],
    ).toMatchObject({
      parameters: [{ text: "Ana" }, { text: "sábado 21 de noviembre" }, { text: "3:00 p. m." }],
    });
  });

  it("los parámetros quedan en una línea y sin espacios de más", () => {
    expect(cleanParam("Corte\n\tnormal     y   barba ")).toBe("Corte normal y barba");
    expect(cleanParam("   ")).toBe("-");
    expect(firstName("  ")).toBe("Hola");
  });
});

describe("botones", () => {
  it("el payload ida y vuelta", () => {
    expect(parseButtonPayload(buttonPayload("confirm", APPOINTMENT_ID))).toEqual({
      action: "confirm",
      appointmentId: APPOINTMENT_ID,
    });
    expect(parseButtonPayload("change:no-es-un-uuid")).toBeNull();
    expect(parseButtonPayload("borrar:" + APPOINTMENT_ID)).toBeNull();
    expect(parseButtonPayload(null)).toBeNull();
  });

  it("reconoce el texto del botón si falta el payload", () => {
    expect(actionFromButtonText("Confirmo")).toBe("confirm");
    expect(actionFromButtonText("Necesito cambiarla")).toBe("change");
    expect(actionFromButtonText("Hola")).toBeNull();
  });
});

describe("respuestas de servicio", () => {
  it("no tienen nada promocional y llevan el enlace que corresponde", () => {
    expect(replies.confirmed(appointment(), context)).toBe(
      "Listo, Ana. Tu cita del sábado 21 de noviembre a las 3:00 p. m. quedó confirmada. Te esperamos.",
    );
    expect(replies.change(appointment(), context)).toContain(
      `https://possos.test/mis-citas/${APPOINTMENT_ID}`,
    );
    expect(replies.freeText("https://wa.me/573009999999")).toContain("https://wa.me/573009999999");
  });
});
