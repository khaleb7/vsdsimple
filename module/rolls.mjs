import { SYSTEM_ID } from "./config.mjs";

/**
 * Prompt for an optional situational modifier, then roll 1d100oe + bonus.
 */
export async function rollCheck({ actor, label, bonus = 0, table = null, skipModPrompt = false }) {
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
  const content = await foundry.applications.handlebars.renderTemplate(
    `systems/${SYSTEM_ID}/templates/chat/roll.hbs`,
    {
      label,
      formula: roll.formula,
      total: roll.total,
      band,
      table,
      actorName: actor?.name ?? "",
      tooltip: await roll.getTooltip()
    }
  );

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { [SYSTEM_ID]: { table } }
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

export async function rollCriticalLookup(tableLabel) {
  const roll = await new Roll("1d100").evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `${game.i18n.localize("VSDSIMPLE.Crit.lookup")}: ${tableLabel}`
  });
  return roll;
}
