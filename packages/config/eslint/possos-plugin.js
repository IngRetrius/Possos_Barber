/**
 * Reglas propias del proyecto (docs/11-interfaz.md y regla 1 de CLAUDE.md).
 *
 * - possos/no-raw-color: ningún color escrito a mano (`#F2F824`, `rgb(...)`, `bg-[#fff]`) fuera
 *   de los tokens de @possos/ui. Se usan las clases (`bg-accent`) o `colors` de @possos/ui.
 * - possos/no-emoji: sin emojis en textos ni en código.
 *
 * Revisan cadenas, plantillas y texto de JSX; los comentarios no.
 */

const RAW_COLOR =
  /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i;
const EMOJI = /\p{Extended_Pictographic}/u;

/** @param {string} message @param {RegExp} pattern */
function textRule(message, pattern) {
  return {
    meta: { type: "problem", schema: [], messages: { found: message } },
    create(context) {
      /** @param {import("estree").Node} node @param {unknown} text */
      const check = (node, text) => {
        if (typeof text === "string" && pattern.test(text)) {
          context.report({ node, messageId: "found" });
        }
      };
      return {
        Literal: (node) => check(node, node.value),
        TemplateElement: (node) => check(node, node.value.cooked),
        JSXText: (node) => check(node, node.value),
      };
    },
  };
}

export default {
  meta: { name: "possos" },
  rules: {
    "no-raw-color": textRule(
      "Color escrito a mano. Usa un token de @possos/ui (clase como bg-accent o `colors`).",
      RAW_COLOR,
    ),
    "no-emoji": textRule("Sin emojis en la interfaz ni en el código (CLAUDE.md, regla 1).", EMOJI),
  },
};
