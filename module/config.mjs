/** System configuration and static lists for Against the Darkmaster (Simple). */

export const SYSTEM_ID = "vsdsimple";

export const STATS = [
  { key: "brn", abbr: "BRN", label: "Brawn" },
  { key: "swi", abbr: "SWI", label: "Swiftness" },
  { key: "for", abbr: "FOR", label: "Fortitude" },
  { key: "wit", abbr: "WIT", label: "Wits" },
  { key: "wsd", abbr: "WSD", label: "Wisdom" },
  { key: "bea", abbr: "BEA", label: "Bearing" }
];

/** Skill categories and default linked stats. */
export const SKILL_CATEGORIES = [
  {
    key: "body",
    label: "Body",
    skills: [
      { key: "body", label: "Body", stat: "for" },
      { key: "armor", label: "Armor", stat: "for" }
    ]
  },
  {
    key: "combat",
    label: "Combat",
    skills: [
      { key: "blunt", label: "Blunt", stat: "brn" },
      { key: "blades", label: "Blades", stat: "brn" },
      { key: "ranged", label: "Ranged", stat: "swi" },
      { key: "polearms", label: "Polearms", stat: "brn" },
      { key: "brawl", label: "Brawl", stat: "brn" }
    ]
  },
  {
    key: "adventuring",
    label: "Adventuring",
    skills: [
      { key: "athletics", label: "Athletics", stat: "brn" },
      { key: "ride", label: "Ride", stat: "swi" },
      { key: "hunting", label: "Hunting", stat: "wit" },
      { key: "nature", label: "Nature", stat: "wsd" },
      { key: "wandering", label: "Wandering", stat: "wsd" }
    ]
  },
  {
    key: "roguery",
    label: "Roguery",
    skills: [
      { key: "acrobatics", label: "Acrobatics", stat: "swi" },
      { key: "stealth", label: "Stealth", stat: "swi" },
      { key: "locks_traps", label: "Locks & Traps", stat: "wit" },
      { key: "perception", label: "Perception", stat: "wit" },
      { key: "deceive", label: "Deceive", stat: "bea" }
    ]
  },
  {
    key: "lore",
    label: "Lore",
    skills: [
      { key: "arcana", label: "Arcana", stat: "wit" },
      { key: "charisma", label: "Charisma", stat: "bea" },
      { key: "cultures", label: "Cultures", stat: "wsd" },
      { key: "healer", label: "Healer", stat: "wsd" },
      { key: "songs_tales", label: "Songs & Tales", stat: "bea" }
    ]
  }
];

export const SPELL_LORES = [
  { key: "eldritch_fire", label: "Eldritch Fire" },
  { key: "eldritch_frost", label: "Eldritch Frost" },
  { key: "eldritch_movement", label: "Eldritch Movement" },
  { key: "eldritch_storm", label: "Eldritch Storm" },
  { key: "illusion", label: "Illusion" },
  { key: "mind_control", label: "Mind Control" },
  { key: "sounds_light", label: "Sounds & Light" },
  { key: "healing", label: "Healing" },
  { key: "nature_lore", label: "Nature Lore" },
  { key: "spirit_mastery", label: "Spirit Mastery" }
];

export const CRITICAL_TABLES = [
  { id: "cut", label: "Cut", file: "cut.html", folder: "critical", kind: "critical" },
  { id: "pierce", label: "Pierce", file: "pierce.html", folder: "critical", kind: "critical" },
  { id: "impact", label: "Impact", file: "impact.html", folder: "critical", kind: "critical" },
  { id: "grapple", label: "Grapple", file: "grapple.html", folder: "critical", kind: "critical" },
  { id: "beast", label: "Beast", file: "beast.html", folder: "critical", kind: "critical" },
  { id: "fire", label: "Fire", file: "fire.html", folder: "critical", kind: "critical" },
  { id: "frost", label: "Frost", file: "frost.html", folder: "critical", kind: "critical" },
  { id: "lightning", label: "Lightning", file: "lightning.html", folder: "critical", kind: "critical" },
  { id: "darkmagic", label: "Dark Magic", file: "darkmagic.html", folder: "critical", kind: "critical" }
];

export const ATTACK_TABLES = [
  { id: "edged", label: "Edged", file: "edged.html", folder: "attacks", kind: "attack" },
  { id: "blunt", label: "Blunt", file: "blunt.html", folder: "attacks", kind: "attack" },
  { id: "missile", label: "Missile", file: "missile.html", folder: "attacks", kind: "attack" },
  { id: "unarmed", label: "Unarmed", file: "unarmed.html", folder: "attacks", kind: "attack" },
  { id: "beast_atk", label: "Beast", file: "beast.html", folder: "attacks", kind: "attack" },
  { id: "bolt", label: "Bolt Spells", file: "bolt-spells.html", folder: "attacks", kind: "attack" },
  { id: "area", label: "Area Spells", file: "area-spells.html", folder: "attacks", kind: "attack" }
];

/**
 * NPC attack types: one choice sets the usual hit chart + default crit table.
 * Crit can still vary by weapon/special — this is the common pairing.
 */
export const NPC_ATTACK_TYPES = [
  { key: "edged", label: "Edged", table: "edged", crit: "cut" },
  { key: "blunt", label: "Blunt", table: "blunt", crit: "impact" },
  { key: "missile", label: "Missile", table: "missile", crit: "pierce" },
  { key: "unarmed", label: "Unarmed", table: "unarmed", crit: "impact" },
  { key: "beast", label: "Beast", table: "beast_atk", crit: "beast" },
  { key: "grapple", label: "Grapple", table: "unarmed", crit: "grapple" },
  { key: "bolt", label: "Bolt", table: "bolt", crit: "fire" },
  { key: "area", label: "Area", table: "area", crit: "fire" }
];

/** @param {string} key */
export function getNpcAttackType(key) {
  return NPC_ATTACK_TYPES.find((t) => t.key === key) ?? null;
}

/** All openable tables (crits + attacks). */
export function allTables() {
  return [...CRITICAL_TABLES, ...ATTACK_TABLES];
}

/**
 * VsD rank bonus: +5 for ranks 1–10, +2 for 11–20, +1 thereafter.
 * @param {number} ranks
 * @returns {number}
 */
export function rankBonus(ranks) {
  const r = Math.max(0, Number(ranks) || 0);
  if (r <= 10) return r * 5;
  if (r <= 20) return 50 + (r - 10) * 2;
  return 70 + (r - 20);
}

/** Status effects for token HUD (paths use vsdsimple). */
export function getStatusEffects() {
  const p = (path) => `systems/${SYSTEM_ID}/${path}`;
  return [
    { img: p("icons/conditions/bruised.svg"), id: "bruised", name: "VSDSIMPLE.Conditions.bruised" },
    { img: p("icons/conditions/weary.svg"), id: "weary", name: "VSDSIMPLE.Conditions.weary" },
    { img: p("icons/conditions/incapacitated.svg"), id: "incapacitated", name: "VSDSIMPLE.Conditions.incapacitated" },
    { img: p("icons/conditions/dying.svg"), id: "dying", name: "VSDSIMPLE.Conditions.dying" },
    { img: p("icons/conditions/bleeding.svg"), id: "bleeding", name: "VSDSIMPLE.Conditions.bleeding" },
    { img: p("icons/conditions/blinded.svg"), id: "blind", name: "VSDSIMPLE.Conditions.blind" },
    { img: p("icons/conditions/deafened.svg"), id: "deaf", name: "VSDSIMPLE.Conditions.deaf" },
    { img: p("icons/conditions/silenced.svg"), id: "mute", name: "VSDSIMPLE.Conditions.mute" },
    { img: p("icons/conditions/burning.svg"), id: "burning", name: "VSDSIMPLE.Conditions.burning" },
    { img: p("icons/conditions/diseased.svg"), id: "diseased", name: "VSDSIMPLE.Conditions.diseased" },
    { img: p("icons/conditions/freezing.svg"), id: "freezing", name: "VSDSIMPLE.Conditions.freezing" },
    { img: p("icons/conditions/poisoned.svg"), id: "poisoned", name: "VSDSIMPLE.Conditions.poisoned" },
    { img: p("icons/conditions/healing.svg"), id: "healing", name: "VSDSIMPLE.Conditions.healing" },
    { img: p("icons/conditions/engaged.svg"), id: "engaged", name: "VSDSIMPLE.Conditions.engaged" },
    { img: p("icons/conditions/shield.svg"), id: "shielded", name: "VSDSIMPLE.Conditions.shielded" },
    { img: p("icons/conditions/stealthy.svg"), id: "stealthy", name: "VSDSIMPLE.Conditions.stealthy" },
    { img: p("icons/postures/prone.svg"), id: "prone", name: "VSDSIMPLE.Postures.prone" },
    { img: p("icons/postures/flying.svg"), id: "flying", name: "VSDSIMPLE.Postures.flying" },
    { img: p("icons/postures/swimming.svg"), id: "swimming", name: "VSDSIMPLE.Postures.swimming" },
    { img: p("icons/defeated.png"), id: "dead", name: "VSDSIMPLE.Conditions.defeated" },
    { img: p("icons/conditions/held.svg"), id: "held", name: "VSDSIMPLE.Conditions.held" },
    { img: p("icons/conditions/stunned.svg"), id: "stunned", name: "VSDSIMPLE.Conditions.stunned" },
    { img: p("icons/conditions/surprised.svg"), id: "surprised", name: "VSDSIMPLE.Conditions.surprised" },
    { img: p("icons/conditions/frightened.svg"), id: "frightened", name: "VSDSIMPLE.Conditions.frightened" },
    { img: p("icons/conditions/concentrating-1.svg"), id: "concentrating1", name: "VSDSIMPLE.Conditions.concentrating" },
    { img: p("icons/conditions/concentrating-2.svg"), id: "concentrating2", name: "VSDSIMPLE.Conditions.concentrating" },
    { img: p("icons/conditions/concentrating-3.svg"), id: "concentrating3", name: "VSDSIMPLE.Conditions.concentrating" },
    { img: p("icons/conditions/concentrating-4.svg"), id: "concentrating4", name: "VSDSIMPLE.Conditions.concentrating" },
    { img: p("icons/conditions/aiming-1.svg"), id: "aiming1", name: "VSDSIMPLE.Conditions.aiming" },
    { img: p("icons/conditions/aiming-2.svg"), id: "aiming2", name: "VSDSIMPLE.Conditions.aiming" },
    { img: p("icons/conditions/aiming-3.svg"), id: "aiming3", name: "VSDSIMPLE.Conditions.aiming" },
    { img: p("icons/conditions/aiming-4.svg"), id: "aiming4", name: "VSDSIMPLE.Conditions.aiming" },
    { img: p("icons/conditions/loading-1.svg"), id: "loading1", name: "VSDSIMPLE.Conditions.loading" },
    { img: p("icons/conditions/loading-2.svg"), id: "loading2", name: "VSDSIMPLE.Conditions.loading" },
    { img: p("icons/crippled/torsoinjury.svg"), id: "crippledtorso", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/headinjury.svg"), id: "crippledhead", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/leftarminjury.svg"), id: "crippledleftarm", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/lefthandinjury.svg"), id: "crippledlefthand", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/leftleginjury.svg"), id: "crippledleftleg", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/leftfootinjury.svg"), id: "crippledleftfoot", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/rightarminjury.svg"), id: "crippledrightarm", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/righthandinjury.svg"), id: "crippledrighthand", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/rightleginjury.svg"), id: "crippledrightleg", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/crippled/rightfootinjury.svg"), id: "crippledrightfoot", name: "VSDSIMPLE.Conditions.crippled" },
    { img: p("icons/charging.png"), id: "charging", name: "VSDSIMPLE.Conditions.charging" },
    { img: p("icons/flanking.png"), id: "flanking", name: "VSDSIMPLE.Conditions.flanking" },
    { img: p("icons/full_half.png"), id: "full_half", name: "VSDSIMPLE.Conditions.full_half" },
    { img: p("icons/on_rear.png"), id: "on_rear", name: "VSDSIMPLE.Conditions.on_rear" },
    { img: p("icons/conditions/enclight.svg"), id: "lightenc", name: "VSDSIMPLE.Conditions.encumbered" },
    { img: p("icons/conditions/encnorm.svg"), id: "normenc", name: "VSDSIMPLE.Conditions.encumbered" },
    { img: p("icons/conditions/encheavy.svg"), id: "heavyenc", name: "VSDSIMPLE.Conditions.encumbered" },
    { img: p("icons/conditions/encover.svg"), id: "overenc", name: "VSDSIMPLE.Conditions.encumbered" }
  ];
}
