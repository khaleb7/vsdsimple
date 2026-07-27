import { SYSTEM_ID, allTables } from "./config.mjs";

function resolveTableRef(id) {
  if (!id) return null;
  const raw = String(id).toLowerCase().trim();
  const normalized = raw.replace(/[^a-z0-9]/g, "");
  const tables = allTables();
  const table =
    tables.find((t) => t.id === raw) ||
    tables.find((t) => t.id.replace(/_/g, "") === normalized) ||
    tables.find((t) => t.label.toLowerCase() === raw);
  if (!table) return { id: raw, label: String(id) };
  return { id: table.id, label: table.label };
}

/**
 * Prompt for an optional situational modifier, then roll 1d100oe + bonus.
 * @param {object} opts
 * @param {Actor} [opts.actor]
 * @param {string} opts.label
 * @param {number} [opts.bonus]
 * @param {string|null} [opts.table] Hit / attack table id
 * @param {string|null} [opts.crit] Critical table id
 * @param {boolean} [opts.skipModPrompt]
 */
export async function rollCheck({
  actor,
  label,
  bonus = 0,
  table = null,
  crit = null,
  skipModPrompt = false
} = {}) {
  let mod = 0;
  if (!skipModPrompt) {
    try {
      mod = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("VSDSIMPLE.Roll.modTitle") },
        content: `<p><strong>${foundry.utils.escapeHTML(label)}</strong> (${bonus >= 0 ? "+" : ""}${bonus})</p>
          <div class="form-group">
            <label>${game.i18n.localize("VSDSIMPLE.Roll.situationalMod")}</label>
            <input type="number" name="mod" value="0" autofocus />
          </div>`,
        ok: {
          label: game.i18n.localize("VSDSIMPLE.Roll.roll"),
          callback: (_event, button) => Number(button.form.elements.mod.value) || 0
        },
        rejectClose: true
      });
    } catch {
      return null;
    }
  }

  const totalBonus = Number(bonus) + Number(mod);
  const formula =
    totalBonus === 0
      ? "1d100oe"
      : totalBonus > 0
        ? `1d100oe + ${totalBonus}`
        : `1d100oe - ${Math.abs(totalBonus)}`;

  const roll = await new Roll(formula).evaluate();
  const band = skillBand(roll.total);
  const hitRef = resolveTableRef(table);
  const critRef = resolveTableRef(crit);
  const content = await foundry.applications.handlebars.renderTemplate(
    `systems/${SYSTEM_ID}/templates/chat/roll.hbs`,
    {
      label,
      formula: roll.formula,
      total: roll.total,
      band,
      table: hitRef?.id ?? null,
      tableLabel: hitRef?.label ?? null,
      crit: critRef?.id ?? null,
      critLabel: critRef?.label ?? null,
      actorName: actor?.name ?? "",
      tooltip: await roll.getTooltip()
    }
  );

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SYSTEM_ID]: { table: hitRef?.id ?? null, crit: critRef?.id ?? null } }
  });

  return roll;
}

function skillBand(total) {
  if (total < 5) return game.i18n.localize("VSDSIMPLE.Roll.band.blunder");
  if (total < 75) return game.i18n.localize("VSDSIMPLE.Roll.band.failure");
  if (total < 100) return game.i18n.localize("VSDSIMPLE.Roll.band.partial");
  if (total < 175) return game.i18n.localize("VSDSIMPLE.Roll.band.success");
  return game.i18n.localize("VSDSIMPLE.Roll.band.absolute");
}

/**
 * Roll d100 for a critical/table lookup, with optional severity modifier.
 * @param {string} tableLabel
 * @param {{ severity?: string, mod?: number }} [opts]
 */
export async function rollCriticalLookup(tableLabel, { severity = null, mod = 0 } = {}) {
  const m = Number(mod) || 0;
  const formula = m === 0 ? "1d100" : m > 0 ? `1d100 + ${m}` : `1d100 - ${Math.abs(m)}`;
  const roll = await new Roll(formula).evaluate();
  const sevBit = severity ? ` (${severity}${m ? ` ${m >= 0 ? "+" : ""}${m}` : ""})` : "";
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `${game.i18n.localize("VSDSIMPLE.Crit.lookup")}: ${tableLabel}${sevBit}`
  });
  return roll;
}
