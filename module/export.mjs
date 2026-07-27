import { STATS, SPELL_LORES } from "./config.mjs";

/**
 * @param {number} n
 * @returns {string}
 */
function signed(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${v}` : String(v);
}

/**
 * Build a plain-text stat block for clipboard export.
 * @param {Actor} actor
 * @returns {string}
 */
export function buildActorSnapshot(actor) {
  const lines = [];
  const sys = actor.system;
  const derived = sys.derived ?? {};

  lines.push(actor.name);
  lines.push("=".repeat(actor.name.length));

  if (actor.type === "character") {
    const meta = [sys.kin, sys.culture, sys.vocation].filter(Boolean).join(" · ");
    if (meta) lines.push(meta);
    lines.push(`Level ${sys.level} · XP ${sys.xp}/${sys.xpNext}`);
    lines.push(`HP ${sys.pools.hp.value}/${sys.pools.hp.max} · MP ${sys.pools.mp.value}/${sys.pools.mp.max}`);
    lines.push(`Drive ${sys.pools.drive}/5 · Hero ${sys.pools.hero}`);
    lines.push("");

    lines.push("Stats");
    for (const s of STATS) {
      const st = derived.stats?.[s.key] ?? sys.stats[s.key];
      lines.push(`  ${s.label} (${s.abbr}): ${signed(st.total)} [${st.base}/${st.kin}/${st.spec}]`);
    }
    lines.push("");

    lines.push("Saves");
    for (const [key, label] of [["tsr", "Toughness SR"], ["wsr", "Willpower SR"]]) {
      const sv = derived.saves?.[key];
      if (sv) lines.push(`  ${label}: ${signed(sv.total)}`);
    }
    lines.push("");

    lines.push("Skills");
    for (const cat of derived.skillCategories ?? []) {
      lines.push(`  ${cat.label}`);
      for (const sk of cat.skills ?? []) {
        lines.push(`    ${sk.label}: ${signed(sk.total)}`);
      }
      for (const sk of cat.customSkills ?? []) {
        const name = sk.name?.trim() || "Custom";
        lines.push(`    ${name}: ${signed(sk.total)}`);
      }
    }
    lines.push("");

    if (sys.attacks?.length) {
      lines.push("Attacks");
      for (const atk of sys.attacks) {
        const bits = [atk.name || "Attack", signed(atk.bonus)];
        if (atk.size) bits.push(atk.size);
        if (atk.table) bits.push(`hit:${atk.table}`);
        if (atk.crit) bits.push(`crit:${atk.crit}`);
        lines.push(`  ${bits.join(" · ")}`);
      }
      lines.push("");
    }

    lines.push(
      `Defense: ${sys.defense.armorType || "—"} · Move ${sys.defense.moveRate || "—"} · Melee DB ${signed(sys.defense.meleeDB)} · Missile DB ${signed(sys.defense.missileDB)}`
    );

    const bleed = derived.woundsBleed ?? 0;
    const pen = derived.woundsPenalty ?? 0;
    if (bleed || pen) lines.push(`Wounds: bleed ${bleed}, penalty ${pen}`);

    if (sys.traits?.length) {
      lines.push("");
      lines.push(`Traits: ${sys.traits.filter((t) => t?.trim()).join("; ")}`);
    }
  } else if (actor.type === "npc") {
    lines.push(`Level ${sys.level} ${sys.levelType || ""}`.trim());
    if (sys.mr) lines.push(`MR ${sys.mr}`);
    lines.push(`AT ${sys.at || "—"} · DEF ${signed(sys.def)} · TSR ${signed(sys.tsr)} · WSR ${signed(sys.wsr)}`);
    lines.push(`HP ${sys.hp.value}/${sys.hp.max}`);
    lines.push("");

    for (const slot of ["first", "second", "third"]) {
      const atk = derived.attacks?.[slot];
      if (!atk || atk.empty) continue;
      const bits = [atk.label || slot, signed(atk.bonus)];
      if (atk.typeLabel) bits.push(atk.typeLabel);
      lines.push(`  ${bits.join(" · ")}`);
    }

    if (sys.special) lines.push(`Special: ${sys.special}`);
    if (sys.ct) lines.push(`CT: ${sys.ct}`);
    lines.push(`Rog ${signed(sys.rog)} · Adv ${signed(sys.adv)} · Lor ${signed(sys.lor)}`);

    const bleed = derived.woundsBleed ?? 0;
    const pen = derived.woundsPenalty ?? 0;
    if (bleed || pen) lines.push(`Wounds: bleed ${bleed}, penalty ${pen}`);
  }

  const lores = derived.spellLores;
  if (lores && Object.keys(lores).length) {
    lines.push("");
    lines.push("Spell Lores");
    for (const lore of SPELL_LORES) {
      const sl = lores[lore.key];
      if (sl && sl.total) lines.push(`  ${lore.label}: ${signed(sl.total)}`);
    }
  }

  if (sys.notes?.trim()) {
    lines.push("");
    lines.push("Notes");
    lines.push(sys.notes.trim());
  }

  return lines.join("\n");
}

/**
 * @param {Actor} actor
 */
export async function copyActorSnapshot(actor) {
  const text = buildActorSnapshot(actor);
  await navigator.clipboard.writeText(text);
  ui.notifications.info(game.i18n.format("VSDSIMPLE.Export.copied", { name: actor.name }));
}
