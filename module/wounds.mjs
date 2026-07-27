import { SYSTEM_ID } from "./config.mjs";

/**
 * Wound bookkeeping helpers — reminders only, no auto HP damage.
 */

/**
 * @param {Actor} actor
 * @returns {{ bleed: number, penalty: number }}
 */
export function getWoundTotals(actor) {
  const d = actor?.system?.derived ?? {};
  return {
    bleed: Number(d.woundsBleed) || 0,
    penalty: Number(d.woundsPenalty) || 0
  };
}

/**
 * Chat nudge when a combatant's turn starts and they have bleed/penalty.
 * @param {Combatant} combatant
 */
export async function remindWoundsOnTurn(combatant) {
  const actor = combatant?.actor;
  if (!actor) return;
  const { bleed, penalty } = getWoundTotals(actor);
  if (!bleed && !penalty) return;

  const bits = [];
  if (bleed) bits.push(`${bleed} bleed`);
  if (penalty) bits.push(`−${Math.abs(penalty)} penalty`);

  const content = `<div class="vsdsimple-wound-nudge">
      <strong>${foundry.utils.escapeHTML(actor.name)}</strong> —
      ${foundry.utils.escapeHTML(bits.join(" · "))}
      <span class="hint">(manual — not applied)</span>
    </div>`;

  const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
  if (gmIds.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      whisper: gmIds,
      flags: { [SYSTEM_ID]: { woundNudge: true } }
    });
  }

  if (!game.settings.get(SYSTEM_ID, "woundReminderPlayers")) return;

  const ownerIds = game.users
    .filter((u) => !u.isGM && actor.testUserPermission(u, "OWNER"))
    .map((u) => u.id);
  if (!ownerIds.length) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    whisper: ownerIds,
    flags: { [SYSTEM_ID]: { woundNudge: true, playerNudge: true } }
  });
}

/**
 * Inject a small bleed/pen badge into the Token HUD.
 * @param {TokenHUD} hud
 * @param {HTMLElement} html
 */
export function injectWoundBadge(hud, html) {
  const actor = hud.object?.actor;
  if (!actor) return;
  const { bleed, penalty } = getWoundTotals(actor);
  if (!bleed && !penalty) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector?.(".vsdsimple-wound-badge")) return;

  const badge = document.createElement("div");
  badge.className = "vsdsimple-wound-badge";
  badge.title = "Wound totals from the sheet (not applied automatically)";
  const parts = [];
  if (bleed) parts.push(`Bleed ${bleed}`);
  if (penalty) parts.push(`Pen ${penalty}`);
  badge.textContent = parts.join(" · ");

  // Prefer the HUD root so absolute positioning is predictable
  if (getComputedStyle(root).position === "static") {
    root.style.position = "relative";
  }
  root.appendChild(badge);
}
