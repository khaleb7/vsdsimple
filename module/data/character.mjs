import { STATS, SKILL_CATEGORIES, SPELL_LORES, rankBonus } from "../config.mjs";

const { NumberField, SchemaField, StringField, ArrayField } = foundry.data.fields;

function columnSchema(extra = {}) {
  return new SchemaField({
    ranks: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
    voc: new NumberField({ required: true, integer: true, initial: 0 }),
    kin: new NumberField({ required: true, integer: true, initial: 0 }),
    spec: new NumberField({ required: true, integer: true, initial: 0 }),
    item: new NumberField({ required: true, integer: true, initial: 0 }),
    ...extra
  });
}

/** Blank custom skill row: player names it and types the Stat bonus manually. */
function customSkillSchema() {
  return new SchemaField({
    name: new StringField({ required: true, blank: true, initial: "" }),
    statBonus: new NumberField({ required: true, integer: true, initial: 0 }),
    ranks: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
    voc: new NumberField({ required: true, integer: true, initial: 0 }),
    kin: new NumberField({ required: true, integer: true, initial: 0 }),
    spec: new NumberField({ required: true, integer: true, initial: 0 }),
    item: new NumberField({ required: true, integer: true, initial: 0 })
  });
}

function blankCustomSkill() {
  return { name: "", statBonus: 0, ranks: 0, voc: 0, kin: 0, spec: 0, item: 0 };
}

function buildCustomSkillsSchema() {
  const cats = {};
  for (const cat of SKILL_CATEGORIES) {
    cats[cat.key] = new ArrayField(customSkillSchema(), {
      initial: [blankCustomSkill(), blankCustomSkill()]
    });
  }
  return cats;
}

function buildSkillSchema() {
  const skills = {};
  for (const cat of SKILL_CATEGORIES) {
    for (const s of cat.skills) {
      skills[s.key] = columnSchema({
        stat: new StringField({ required: true, initial: s.stat })
      });
    }
  }
  return skills;
}

function buildSpellSchema() {
  const lores = {};
  for (const s of SPELL_LORES) {
    lores[s.key] = columnSchema({
      known: new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 1 })
    });
  }
  return lores;
}

function buildStatSchema() {
  const stats = {};
  for (const s of STATS) {
    stats[s.key] = new SchemaField({
      base: new NumberField({ required: true, integer: true, initial: 0 }),
      kin: new NumberField({ required: true, integer: true, initial: 0 }),
      spec: new NumberField({ required: true, integer: true, initial: 0 })
    });
  }
  return stats;
}

/**
 * Player character TypeDataModel — actor-native fields, light derived totals only.
 */
export class CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      kin: new StringField({ required: true, blank: true, initial: "" }),
      culture: new StringField({ required: true, blank: true, initial: "" }),
      vocation: new StringField({ required: true, blank: true, initial: "" }),
      level: new NumberField({ required: true, integer: true, initial: 1, min: 1 }),
      xp: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      xpNext: new NumberField({ required: true, integer: true, initial: 10, min: 0 }),

      stats: new SchemaField(buildStatSchema()),

      saves: new SchemaField({
        tsr: new SchemaField({
          lvl: new NumberField({ required: true, integer: true, initial: 0 }),
          kin: new NumberField({ required: true, integer: true, initial: 0 }),
          spec: new NumberField({ required: true, integer: true, initial: 0 })
        }),
        wsr: new SchemaField({
          lvl: new NumberField({ required: true, integer: true, initial: 0 }),
          kin: new NumberField({ required: true, integer: true, initial: 0 }),
          spec: new NumberField({ required: true, integer: true, initial: 0 })
        })
      }),

      skills: new SchemaField(buildSkillSchema()),
      customSkills: new SchemaField(buildCustomSkillsSchema()),
      spellLores: new SchemaField(buildSpellSchema()),

      /** Known spells — reference list; casting rolls use the linked lore total. */
      spells: new ArrayField(
        new SchemaField({
          name: new StringField({ required: true, blank: true, initial: "" }),
          lore: new StringField({ required: true, blank: true, initial: "" }),
          level: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
          mp: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
          notes: new StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      ),

      pools: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ required: true, integer: true, initial: 20 }),
          max: new NumberField({ required: true, integer: true, initial: 20 })
        }),
        mp: new SchemaField({
          value: new NumberField({ required: true, integer: true, initial: 0 }),
          max: new NumberField({ required: true, integer: true, initial: 0 })
        }),
        drive: new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
        hero: new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 100 })
      }),

      defense: new SchemaField({
        armorType: new StringField({ required: true, blank: true, initial: "NA" }),
        moveRate: new StringField({ required: true, blank: true, initial: "" }),
        meleeDB: new NumberField({ required: true, integer: true, initial: 0 }),
        missileDB: new NumberField({ required: true, integer: true, initial: 0 })
      }),

      attacks: new ArrayField(
        new SchemaField({
          name: new StringField({ required: true, blank: true, initial: "" }),
          bonus: new NumberField({ required: true, integer: true, initial: 0 }),
          size: new StringField({ required: true, blank: true, initial: "" }),
          table: new StringField({ required: true, blank: true, initial: "" }),
          crit: new StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      ),

      wounds: new ArrayField(
        new SchemaField({
          name: new StringField({ required: true, blank: true, initial: "" }),
          bleed: new NumberField({ required: true, integer: true, initial: 0 }),
          penalty: new NumberField({ required: true, integer: true, initial: 0 }),
          notes: new StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      ),

      /** Coarse combat phase planning toggles (Move, Spell, etc.). */
      combatPhases: new ArrayField(new StringField({ blank: true }), { initial: [] }),

      passions: new ArrayField(new StringField({ blank: true }), { initial: ["", "", ""] }),
      traits: new ArrayField(new StringField({ blank: true }), { initial: [] }),
      biography: new StringField({ required: true, blank: true, initial: "" }),
      notes: new StringField({ required: true, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    const stats = {};
    for (const s of STATS) {
      const st = this.stats[s.key];
      const total = (Number(st.base) || 0) + (Number(st.kin) || 0) + (Number(st.spec) || 0);
      stats[s.key] = { ...st, total, abbr: s.abbr, label: s.label };
    }
    this.derived = this.derived ?? {};
    this.derived.stats = stats;

    const forTotal = stats.for?.total ?? 0;
    const wsdTotal = stats.wsd?.total ?? 0;
    this.derived.saves = {
      tsr: {
        ...this.saves.tsr,
        stat: forTotal,
        total:
          forTotal +
          (Number(this.saves.tsr.lvl) || 0) +
          (Number(this.saves.tsr.kin) || 0) +
          (Number(this.saves.tsr.spec) || 0)
      },
      wsr: {
        ...this.saves.wsr,
        stat: wsdTotal,
        total:
          wsdTotal +
          (Number(this.saves.wsr.lvl) || 0) +
          (Number(this.saves.wsr.kin) || 0) +
          (Number(this.saves.wsr.spec) || 0)
      }
    };

    const skills = {};
    for (const cat of SKILL_CATEGORIES) {
      for (const def of cat.skills) {
        const sk = this.skills[def.key];
        const rb = rankBonus(sk.ranks);
        const statTotal = stats[sk.stat]?.total ?? 0;
        skills[def.key] = {
          ...sk,
          key: def.key,
          label: def.label,
          category: cat.key,
          categoryLabel: cat.label,
          rankBonus: rb,
          statTotal,
          total:
            statTotal +
            rb +
            (Number(sk.voc) || 0) +
            (Number(sk.kin) || 0) +
            (Number(sk.spec) || 0) +
            (Number(sk.item) || 0)
        };
      }
    }
    this.derived.skills = skills;

    this.derived.skillCategories = SKILL_CATEGORIES.map((cat) => {
      const customs = [...(this.customSkills?.[cat.key] ?? [])];
      while (customs.length < 2) customs.push(blankCustomSkill());
      const customSkills = customs.slice(0, 2).map((sk, index) => {
        const rb = rankBonus(sk.ranks);
        const statTotal = Number(sk.statBonus) || 0;
        return {
          ...sk,
          index,
          category: cat.key,
          rankBonus: rb,
          statTotal,
          total:
            statTotal +
            rb +
            (Number(sk.voc) || 0) +
            (Number(sk.kin) || 0) +
            (Number(sk.spec) || 0) +
            (Number(sk.item) || 0)
        };
      });
      return {
        ...cat,
        skills: cat.skills.map((s) => skills[s.key]),
        customSkills
      };
    });

    const spellLores = {};
    for (const def of SPELL_LORES) {
      const sl = this.spellLores[def.key];
      const rb = rankBonus(sl.ranks);
      const witTotal = stats.wit?.total ?? 0;
      spellLores[def.key] = {
        ...sl,
        key: def.key,
        label: def.label,
        rankBonus: rb,
        total:
          witTotal +
          rb +
          (Number(sl.voc) || 0) +
          (Number(sl.kin) || 0) +
          (Number(sl.spec) || 0) +
          (Number(sl.item) || 0)
      };
    }
    this.derived.spellLores = spellLores;

    this.derived.woundsBleed = this.wounds.reduce((n, w) => n + (Number(w.bleed) || 0), 0);
    this.derived.woundsPenalty = this.wounds.reduce((n, w) => n + (Number(w.penalty) || 0), 0);
  }
}
