/**
 * Handlebars helpers for vsdsimple sheets.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("vsdAdd", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("vsdMul", (a, b) => Number(a) * Number(b));
  Handlebars.registerHelper("vsdLt", (a, b) => Number(a) < Number(b));
  Handlebars.registerHelper("vsdSigned", (n) => {
    const v = Number(n) || 0;
    return v > 0 ? `+${v}` : `${v}`;
  });
  Handlebars.registerHelper("vsdTimes", function (n, options) {
    const count = Number(n) || 0;
    let out = "";
    for (let i = 0; i < count; i++) out += options.fn(i);
    return out;
  });
}
