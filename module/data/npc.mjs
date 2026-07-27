import { getNpcAttackType, ATTACK_TABLES, CRITICAL_TABLES } from "../config.mjs";

function tableLabel(id, list) {
  return list.find((t) => t.id === id)?.label ?? id;
}

const { NumberField, SchemaField, StringField, ArrayField } = foundry.data.fields;

function attackSlot() {
  return new SchemaField({
    bonus: new NumberField({ required: true, integer: true, initial: 0, nullable: true }),
    label: new StringField({ required: true, blank: true, initial: "" }),
    /** Key into NPC_ATTACK_TYPES — sets hit + default crit tables. */
    type: new StringField({ required: true, blank: true, initial: "" })
  });
}

/**
 * NPC / creature TypeDataModel matching the VsD bestiary stat block.
 */
export class NpcDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      level: new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      levelType: new StringField({ required: true, blank: true, initial: "Common" }),
      mr: new StringField({ required: true, blank: true, initial: "" }),
      at: new StringField({ required: true, blank: true, initial: "NA" }),
      def: new NumberField({ required: true, integer: true, initial: 0 }),
      tsr: new NumberField({ required: true, integer: true, initial: 0 }),
      wsr: new NumberField({ required: true, integer: true, initial: 0 }),
      hp: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 20 }),
        max: new NumberField({ required: true, integer: true, initial: 20 })
      }),
      attacks: new SchemaField({
        first: attackSlot(),
        second: attackSlot(),
        third: attackSlot()
      }),
      special: new StringField({ required: true, blank: true, initial: "" }),
      ct: new StringField({ required: true, blank: true, initial: "" }),
      rog: new NumberField({ required: true, integer: true, initial: 0 }),
      adv: new NumberField({ required: true, integer: true, initial: 0 }),
      lor: new NumberField({ required: true, integer: true, initial: 0 }),
      wounds: new ArrayField(
        new SchemaField({
          name: new StringField({ required: true, blank: true, initial: "" }),
          bleed: new NumberField({ required: true, integer: true, initial: 0 }),
          penalty: new NumberField({ required: true, integer: true, initial: 0 }),
          notes: new StringField({ required: true, blank: true, initial: "" })
        }),
        { initial: [] }
      ),
      notes: new StringField({ required: true, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    const fmt = (slot) => {
      const hasLabel = !!(slot.label && String(slot.label).trim());
      const bonus = Number(slot.bonus) || 0;
      const typeDef = getNpcAttackType(slot.type);
      if (!hasLabel && !bonus) {
        return {
          empty: true,
          display: "-",
          bonus: 0,
          label: "",
          type: slot.type || "",
          typeLabel: "",
          table: null,
          crit: null,
          tablesHint: ""
        };
      }
      const sign = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      const table = typeDef?.table ?? null;
      const crit = typeDef?.crit ?? null;
      return {
        empty: false,
        display: hasLabel ? `${sign} ${slot.label}` : sign,
        bonus,
        label: slot.label || "",
        type: slot.type || "",
        typeLabel: typeDef?.label ?? "",
        table,
        crit,
        tablesHint: typeDef
          ? `Hit: ${tableLabel(typeDef.table, ATTACK_TABLES)} · Crit: ${tableLabel(typeDef.crit, CRITICAL_TABLES)}`
          : ""
      };
    };
    this.derived = {
      attacks: {
        first: fmt(this.attacks.first),
        second: fmt(this.attacks.second),
        third: fmt(this.attacks.third)
      },
      levelDisplay: `${this.level}${this.levelType ? ` ${this.levelType}` : ""}`.trim(),
      woundsBleed: this.wounds.reduce((n, w) => n + (Number(w.bleed) || 0), 0),
      woundsPenalty: this.wounds.reduce((n, w) => n + (Number(w.penalty) || 0), 0)
    };
  }
}
