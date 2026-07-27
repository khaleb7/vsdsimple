import { COMBAT_PHASES, SYSTEM_ID } from "./config.mjs";

/**
 * @param {Actor} actor
 * @returns {string[]}
 */
export function getActorPhases(actor) {
  return actor?.system?.combatPhases ?? [];
}

/**
 * @param {string[]} phases
 * @returns {number}
 */
export function getPhaseSortValue(phases) {
  if (!phases?.length) return -1;
  const map = Object.fromEntries(COMBAT_PHASES.map((p) => [p.key, p.sort]));
  return Math.max(...phases.map((k) => map[k] ?? -1));
}

/**
 * @param {string[]} phases
 * @returns {string}
 */
export function formatPhaseLabels(phases) {
  const map = Object.fromEntries(COMBAT_PHASES.map((p) => [p.key, p.label]));
  return phases.map((k) => map[k] ?? k).join(", ");
}

/**
 * @param {Actor} actor
 * @returns {boolean}
 */
export function canViewActorPhases(actor) {
  if (!game.settings.get(SYSTEM_ID, "combatPhasesEnabled")) return false;
  const vis = game.settings.get(SYSTEM_ID, "combatPhaseVisibility");
  if (vis === "all") return true;
  if (game.user.isGM) return true;
  if (vis === "self") return actor?.isOwner ?? false;
  return false;
}

/**
 * @param {Combat} combat
 */
export async function sortCombatByPhases(combat) {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("VSDSIMPLE.Phases.gmOnly"));
    return;
  }
  if (!combat?.combatants?.size) return;

  const updates = [];
  for (const c of combat.combatants) {
    updates.push({ _id: c.id, initiative: getPhaseSortValue(getActorPhases(c.actor)) });
  }
  await foundry.documents.Combatant.updateDocuments(updates, { parent: combat });
  ui.notifications.info(game.i18n.localize("VSDSIMPLE.Phases.sorted"));
}

/**
 * @param {Combat} combat
 * @param {HTMLElement} root
 */
function injectCombatTrackerUi(combat, root) {
  if (!game.settings.get(SYSTEM_ID, "combatPhasesEnabled")) return;

  const list = root.querySelector("#combat-tracker, .combat-tracker, ol.directory-list");
  if (!list) return;

  for (const li of list.querySelectorAll(".combatant, li[data-combatant-id]")) {
    const id = li.dataset.combatantId;
    const combatant = combat?.combatants?.get(id);
    const actor = combatant?.actor;
    if (!actor) continue;

    let badge = li.querySelector(".vsdsimple-phase-badges");
    if (!canViewActorPhases(actor)) {
      badge?.remove();
      continue;
    }

    const phases = getActorPhases(actor);
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "vsdsimple-phase-badges";
      const anchor = li.querySelector(".token-name, .combatant-name, .name") ?? li;
      anchor.appendChild(badge);
    }
    badge.replaceChildren();
    if (!phases.length) {
      badge.textContent = "";
      badge.classList.add("empty");
      continue;
    }
    badge.classList.remove("empty");
    for (const key of phases) {
      const phase = COMBAT_PHASES.find((p) => p.key === key);
      if (!phase) continue;
      const chip = document.createElement("span");
      chip.className = "vsdsimple-phase-chip";
      chip.textContent = phase.label;
      chip.title = phase.label;
      badge.appendChild(chip);
    }
  }

  let sortBtn = root.querySelector(".vsdsimple-phase-sort");
  if (game.user.isGM) {
    if (!sortBtn) {
      const header = root.querySelector(".combat-tracker-header, header, .header-actions") ?? root;
      sortBtn = document.createElement("button");
      sortBtn.type = "button";
      sortBtn.className = "vsdsimple-phase-sort";
      sortBtn.title = game.i18n.localize("VSDSIMPLE.Phases.sortHint");
      sortBtn.innerHTML = `<i class="fas fa-sort-amount-down"></i> ${game.i18n.localize("VSDSIMPLE.Phases.sort")}`;
      sortBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        sortCombatByPhases(combat);
      });
      header.appendChild(sortBtn);
    }
  } else {
    sortBtn?.remove();
  }
}

async function onCombatRound(combat) {
  if (!game.settings.get(SYSTEM_ID, "clearPhasesOnRound")) return;
  if (!game.user.isGM) return;

  const updates = [];
  for (const c of combat.combatants) {
    const actor = c.actor;
    if (actor?.type === "character" && actor.system.combatPhases?.length) {
      updates.push({ _id: actor.id, "system.combatPhases": [] });
    }
  }
  if (updates.length) await Actor.updateDocuments(updates);
}

function onRenderCombatTracker(app, html) {
  const combat = app.viewed ?? app.combat ?? game.combat;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!combat || !root) return;
  injectCombatTrackerUi(combat, root);
}

export function registerCombatPhases() {
  game.settings.register(SYSTEM_ID, "combatPhasesEnabled", {
    name: "VSDSIMPLE.Phases.enabled",
    hint: "VSDSIMPLE.Phases.enabledHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "combatPhaseVisibility", {
    name: "VSDSIMPLE.Phases.visibility",
    hint: "VSDSIMPLE.Phases.visibilityHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      all: "VSDSIMPLE.Phases.visAll",
      self: "VSDSIMPLE.Phases.visSelf",
      gm: "VSDSIMPLE.Phases.visGm"
    },
    default: "all"
  });

  game.settings.register(SYSTEM_ID, "clearPhasesOnRound", {
    name: "VSDSIMPLE.Phases.clearOnRound",
    hint: "VSDSIMPLE.Phases.clearOnRoundHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  Hooks.on("renderCombatTracker", onRenderCombatTracker);
  Hooks.on("combatRound", onCombatRound);
}
