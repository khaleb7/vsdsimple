import { STATS, SKILL_CATEGORIES, SPELL_LORES, SYSTEM_ID } from "./config.mjs";

const AUDIT_ROOTS = new Set(["stats", "saves", "skills", "customSkills", "spellLores"]);

const FIELD_LABELS = {
  base: "Base",
  kin: "Kin",
  spec: "Spec",
  lvl: "Lvl",
  ranks: "Ranks",
  voc: "Voc",
  item: "Item",
  name: "Name",
  statBonus: "Stat bonus",
  stat: "Linked stat",
  known: "Known"
};

/** @type {WeakMap<Actor, object>} */
const _priorSystem = new WeakMap();

const statLabels = Object.fromEntries(STATS.map((s) => [s.key, s.label]));
const skillLabels = Object.fromEntries(
  SKILL_CATEGORIES.flatMap((c) => c.skills.map((s) => [s.key, s.label]))
);
const categoryLabels = Object.fromEntries(SKILL_CATEGORIES.map((c) => [c.key, c.label]));
const loreLabels = Object.fromEntries(SPELL_LORES.map((l) => [l.key, l.label]));
const saveLabels = { tsr: "Toughness SR", wsr: "Willpower SR" };

function shouldAuditSheet(actor, userId) {
  if (!game.settings.get(SYSTEM_ID, "sheetAuditWhisper")) return false;
  if (actor.type !== "character") return false;
  const user = game.users.get(userId);
  if (!user || user.isGM) return false;
  return true;
}

function shouldAuditPools(actor, userId) {
  if (!game.settings.get(SYSTEM_ID, "driveHeroAuditWhisper")) return false;
  if (actor.type !== "character") return false;
  const user = game.users.get(userId);
  if (!user || user.isGM) return false;
  return true;
}

/**
 * @param {Actor} actor
 * @param {string} userId
 * @returns {boolean}
 */
function shouldAudit(actor, userId) {
  return shouldAuditSheet(actor, userId) || shouldAuditPools(actor, userId);
}

function isAuditPath(pathParts) {
  if (!pathParts.length) return false;
  if (AUDIT_ROOTS.has(pathParts[0])) return true;
  return pathParts[0] === "pools" && ["drive", "hero"].includes(pathParts[1]);
}

function shouldCaptureAudit(actor, userId, delta) {
  if (actor.type !== "character") return false;
  const user = game.users.get(userId);
  if (!user || user.isGM) return false;
  if (!delta?.system) return false;

  if (shouldAuditSheet(actor, userId)) {
    for (const key of AUDIT_ROOTS) {
      if (foundry.utils.hasProperty(delta.system, key)) return true;
    }
  }
  if (shouldAuditPools(actor, userId)) {
    for (const key of ["drive", "hero"]) {
      if (foundry.utils.hasProperty(delta.system, `pools.${key}`)) return true;
    }
  }
  return false;
}

/**
 * @param {unknown} delta
 * @param {object} prior
 * @param {string[]} pathParts
 * @param {{ key: string, old: unknown, new: unknown }[]} lines
 */
function walkDelta(delta, prior, pathParts, lines) {
  if (delta === undefined) return;

  const isLeaf = delta === null || typeof delta !== "object" || Array.isArray(delta);
  if (isLeaf) {
    if (!pathParts.length || !isAuditPath(pathParts)) return;
    const key = pathParts.join(".");
    const oldVal = foundry.utils.getProperty(prior, key);
    if (oldVal === delta) return;
    lines.push({ key, old: oldVal, new: delta });
    return;
  }

  for (const [k, v] of Object.entries(delta)) {
    if (!pathParts.length && !isAuditPath([k]) && !AUDIT_ROOTS.has(k) && k !== "pools") continue;
    if (!pathParts.length && k === "pools" && typeof v === "object" && v) {
      for (const [pk, pv] of Object.entries(v)) {
        if (!["drive", "hero"].includes(pk) && !AUDIT_ROOTS.has(pk)) continue;
        walkDelta(pv, prior, ["pools", pk], lines);
      }
      continue;
    }
    if (!pathParts.length && !AUDIT_ROOTS.has(k) && k !== "pools") continue;
    walkDelta(v, prior, [...pathParts, k], lines);
  }
}

/**
 * @param {string} key
 * @param {object} prior
 * @param {unknown} next
 * @returns {string}
 */
function labelForChange(key, prior) {
  const parts = key.split(".");
  const [root, id, ...rest] = parts;

  if (root === "pools") {
    const pool = id === "drive" ? "Drive" : id === "hero" ? "Hero" : id;
    return pool;
  }

  if (root === "stats") {
    const stat = statLabels[id] ?? id;
    const field = FIELD_LABELS[rest[0]] ?? rest[0];
    return `${stat} · ${field}`;
  }

  if (root === "saves") {
    const save = saveLabels[id] ?? id;
    const field = FIELD_LABELS[rest[0]] ?? rest[0];
    return `${save} · ${field}`;
  }

  if (root === "skills") {
    const skill = skillLabels[id] ?? id;
    const field = FIELD_LABELS[rest[0]] ?? rest[0];
    return `${skill} · ${field}`;
  }

  if (root === "spellLores") {
    const lore = loreLabels[id] ?? id;
    const field = FIELD_LABELS[rest[0]] ?? rest[0];
    return `${lore} · ${field}`;
  }

  if (root === "customSkills") {
    const cat = categoryLabels[id] ?? id;
    const rowIdx = Number.parseInt(rest[0], 10);
    const fieldParts = rest.slice(1);
    const field = FIELD_LABELS[fieldParts[0]] ?? fieldParts[0] ?? "";
    const rowPrior = foundry.utils.getProperty(prior, `customSkills.${id}.${rowIdx}`);
    const rowName = rowPrior?.name || "";
    const rowLabel = Number.isNaN(rowIdx) ? "" : ` #${rowIdx + 1}`;
    const nameBit = rowName ? ` "${rowName}"` : "";
    return `${cat} custom${rowLabel}${nameBit} · ${field}`;
  }

  return key;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

/**
 * @param {Actor} actor
 * @param {{ key: string, old: unknown, new: unknown }[]} lines
 * @param {string} userId
 */
async function whisperAudit(actor, lines, prior, userId) {
  const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
  if (!gmIds.length) return;

  const user = game.users.get(userId);
  const playerName = foundry.utils.escapeHTML(user?.name ?? "Unknown");
  const actorName = foundry.utils.escapeHTML(actor.name);

  const rows = lines
    .map((line) => {
      const label = foundry.utils.escapeHTML(labelForChange(line.key, prior));
      const oldVal = foundry.utils.escapeHTML(formatValue(line.old));
      const newVal = foundry.utils.escapeHTML(formatValue(line.new));
      return `<li><strong>${label}</strong>: ${oldVal} → ${newVal}</li>`;
    })
    .join("");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor, user }),
    content: `<div class="vsdsimple-sheet-audit">
      <p><strong>${playerName}</strong> updated <strong>${actorName}</strong>:</p>
      <ul>${rows}</ul>
    </div>`,
    whisper: gmIds,
    flags: { [SYSTEM_ID]: { sheetAudit: true } }
  });
}

async function onUpdateActor(actor, changed, _options, userId) {
  const prior = _priorSystem.get(actor);
  _priorSystem.delete(actor);
  if (!prior || !shouldAudit(actor, userId)) return;

  const lines = [];
  const delta = changed.system ?? {};
  for (const key of AUDIT_ROOTS) {
    if (shouldAuditSheet(actor, userId) && foundry.utils.hasProperty(delta, key)) {
      walkDelta(foundry.utils.getProperty(delta, key), prior, [key], lines);
    }
  }
  if (shouldAuditPools(actor, userId) && delta.pools) {
    for (const key of ["drive", "hero"]) {
      if (foundry.utils.hasProperty(delta.pools, key)) {
        walkDelta(delta.pools[key], prior, ["pools", key], lines);
      }
    }
  }
  if (!lines.length) return;

  await whisperAudit(actor, lines, prior, userId);
}

function onPreUpdateActor(actor, update, _options, userId) {
  if (!shouldCaptureAudit(actor, userId, update)) return;
  _priorSystem.set(actor, foundry.utils.deepClone(actor.system.toObject()));
}

/** Whisper GM when non-GMs edit PC stats or skills on their sheet. */
export function registerSheetAudit() {
  game.settings.register(SYSTEM_ID, "driveHeroAuditWhisper", {
    name: "VSDSIMPLE.Audit.driveHeroWhisper",
    hint: "VSDSIMPLE.Audit.driveHeroWhisperHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, "sheetAuditWhisper", {
    name: "VSDSIMPLE.Audit.sheetWhisper",
    hint: "VSDSIMPLE.Audit.sheetWhisperHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", onUpdateActor);
}
