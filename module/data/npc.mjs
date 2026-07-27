const { NumberField, SchemaField, StringField } = foundry.data.fields;

function attackSlot() {
  return new SchemaField({
    bonus: new NumberField({ required: true, integer: true, initial: 0, nullable: true }),
    label: new StringField({ required: true, blank: true, initial: "" })
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
      notes: new StringField({ required: true, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    const fmt = (slot) => {
      const hasLabel = !!(slot.label && String(slot.label).trim());
      const bonus = Number(slot.bonus) || 0;
      if (!hasLabel && !bonus) return { empty: true, display: "-", bonus: 0, label: "" };
      const sign = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      return {
        empty: false,
        display: hasLabel ? `${sign} ${slot.label}` : sign,
        bonus,
        label: slot.label || ""
      };
    };
    this.derived = {
      attacks: {
        first: fmt(this.attacks.first),
        second: fmt(this.attacks.second),
        third: fmt(this.attacks.third)
      },
      levelDisplay: `${this.level}${this.levelType ? ` ${this.levelType}` : ""}`.trim()
    };
  }
}
