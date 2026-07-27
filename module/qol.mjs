import { SYSTEM_ID } from "./config.mjs";
import { copyActorSnapshot } from "./export.mjs";

/**
 * @param {ActiveEffect} effect
 * @returns {boolean}
 */
function isTokenStatusEffect(effect) {
  return effect.parent instanceof Actor && (effect.statuses?.size ?? 0) > 0;
}

/**
 * @param {Set<string>} statuses
 * @returns {string}
 */
function statusLabels(statuses) {
  return [...statuses]
    .map((id) => {
      const se = CONFIG.statusEffects?.find((s) => s.id === id);
      return se ? game.i18n.localize(se.name) : id;
    })
    .join(", ");
}

/**
 * @param {Actor} actor
 * @param {string} action added|removed
 * @param {Set<string>} statuses
 * @param {string} userId
 */
async function postConditionChat(actor, action, statuses, userId) {
  const mode = game.settings.get(SYSTEM_ID, "conditionToggleChat");
  if (mode === "off") return;

  const user = game.users.get(userId);
  const labels = statusLabels(statuses);
  const key = action === "added" ? "VSDSIMPLE.Conditions.chatAdded" : "VSDSIMPLE.Conditions.chatRemoved";
  const content = `<div class="vsdsimple-condition-chat">
    <strong>${foundry.utils.escapeHTML(actor.name)}</strong> —
    ${game.i18n.format(key, { conditions: foundry.utils.escapeHTML(labels) })}
  </div>`;

  const msg = {
    speaker: ChatMessage.getSpeaker({ actor, user }),
    content,
    flags: { [SYSTEM_ID]: { conditionToggle: true } }
  };

  if (mode === "gm") {
    const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
    if (gmIds.length) msg.whisper = gmIds;
  }

  await ChatMessage.create(msg);
}

/**
 * @param {Actor} actor
 * @returns {number|null}
 */
function readHpValue(actor) {
  if (actor.type === "character") return Number(actor.system.pools?.hp?.value);
  if (actor.type === "npc") return Number(actor.system.hp?.value);
  return null;
}

function onUpdateActorDefeated(actor, changed, _options, userId) {
  if (!game.settings.get(SYSTEM_ID, "defeatedNudge")) return;

  const hpDelta =
    foundry.utils.getProperty(changed, "system.pools.hp.value") ??
    foundry.utils.getProperty(changed, "system.hp.value");
  if (hpDelta === undefined) return;

  const hp = readHpValue(actor);
  if (hp === null || hp > 0) return;
  if (actor.statuses?.has("dead")) return;

  const user = game.users.get(userId);
  ui.notifications.info(
    game.i18n.format("VSDSIMPLE.Combat.defeatedNudge", { name: actor.name }),
    { permanent: false }
  );
}

async function onCreateActiveEffect(effect, _options, userId) {
  if (!isTokenStatusEffect(effect)) return;
  await postConditionChat(effect.parent, "added", effect.statuses, userId);
}

async function onDeleteActiveEffect(effect, _options, userId) {
  if (!isTokenStatusEffect(effect)) return;
  await postConditionChat(effect.parent, "removed", effect.statuses, userId);
}

/**
 * GM quick HP adjust on token HUD.
 * @param {TokenHUD} hud
 * @param {HTMLElement} html
 */
export function injectHpQuickAdjust(hud, html) {
  if (!game.user.isGM) return;
  if (!game.settings.get(SYSTEM_ID, "tokenHpHud")) return;

  const actor = hud.object?.actor;
  if (!actor || (actor.type !== "npc" && actor.type !== "character")) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".vsdsimple-hp-hud")) return;

  const bar = document.createElement("div");
  bar.className = "vsdsimple-hp-hud";
  bar.title = game.i18n.localize("VSDSIMPLE.Combat.hpHudHint");

  for (const delta of [-5, -1, 1, 5]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vsdsimple-hp-btn";
    btn.textContent = delta > 0 ? `+${delta}` : String(delta);
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await adjustActorHp(actor, delta);
      hud.render();
    });
    bar.appendChild(btn);
  }

  if (getComputedStyle(root).position === "static") root.style.position = "relative";
  root.appendChild(bar);
}

/**
 * @param {Actor} actor
 * @param {number} delta
 */
async function adjustActorHp(actor, delta) {
  if (actor.type === "character") {
    const hp = actor.system.pools.hp;
    const next = Math.max(0, Math.min(Number(hp.value) + delta, Number(hp.max) || 0));
    await actor.update({ "system.pools.hp.value": next });
  } else if (actor.type === "npc") {
    const hp = actor.system.hp;
    const next = Math.max(0, Math.min(Number(hp.value) + delta, Number(hp.max) || 0));
    await actor.update({ "system.hp.value": next });
  }
}

export function registerQol() {
  game.settings.register(SYSTEM_ID, "conditionToggleChat", {
    name: "VSDSIMPLE.Conditions.chatToggle",
    hint: "VSDSIMPLE.Conditions.chatToggleHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      off: "VSDSIMPLE.Conditions.chatOff",
      public: "VSDSIMPLE.Conditions.chatPublic",
      gm: "VSDSIMPLE.Conditions.chatGm"
    },
    default: "gm"
  });

  game.settings.register(SYSTEM_ID, "woundReminderPlayers", {
    name: "VSDSIMPLE.Combat.woundReminderPlayers",
    hint: "VSDSIMPLE.Combat.woundReminderPlayersHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "defeatedNudge", {
    name: "VSDSIMPLE.Combat.defeatedNudgeSetting",
    hint: "VSDSIMPLE.Combat.defeatedNudgeHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "tokenHpHud", {
    name: "VSDSIMPLE.Combat.tokenHpHud",
    hint: "VSDSIMPLE.Combat.tokenHpHudHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  Hooks.on("updateActor", onUpdateActorDefeated);
  Hooks.on("createActiveEffect", onCreateActiveEffect);
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
}

/**
 * @param {ActorSheet} sheet
 */
export async function onExportSnapshot(sheet) {
  await copyActorSnapshot(sheet.document);
}

/**
 * Shift-click rolls skip the situational modifier prompt.
 * @param {Event} event
 * @returns {boolean}
 */
export function fastRollFromEvent(event) {
  return !!event?.shiftKey;
}
