import { SYSTEM_ID, NPC_ATTACK_TYPES } from "../config.mjs";
import { rollCheck } from "../rolls.mjs";
import { CriticalBrowser } from "../apps/critical-browser.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Form-fillable NPC / creature stat-block sheet.
 */
export class NpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "actor", "npc", "vsd-npc-sheet"],
    position: { width: 520, height: 760 },
    tag: "form",
    window: {
      resizable: true,
      controls: [
        {
          icon: "fas fa-book-dead",
          label: "VSDSIMPLE.Crit.browser",
          action: "openCrits"
        }
      ]
    },
    actions: {
      rollField: NpcSheet.#onRollField,
      rollAttack: NpcSheet.#onRollAttack,
      openCrits: NpcSheet.#onOpenCrits,
      addWound: NpcSheet.#onAddWound,
      deleteWound: NpcSheet.#onDeleteWound,
      toggleStatus: NpcSheet.#onToggleStatus
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    body: {
      template: `systems/${SYSTEM_ID}/templates/actor/npc-sheet.hbs`,
      scrollable: [".sheet-body"]
    }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "stats", label: "VSDSIMPLE.Tabs.stats" },
        { id: "combat", label: "VSDSIMPLE.Tabs.npcCombat" },
        { id: "notes", label: "VSDSIMPLE.Tabs.notes" }
      ],
      initial: "stats"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.actor = this.document;
    context.derived = this.document.system.derived ?? {};
    context.logo = `systems/${SYSTEM_ID}/icons/darkmaster_logo.png`;
    context.statusEffects = this.#prepareStatusEffects();
    context.attackSlots = this.#prepareAttackSlots();

    let tabMap = context.tabs ?? {};
    if (tabMap.primary && typeof tabMap.primary === "object" && !tabMap.primary.id) {
      tabMap = tabMap.primary;
    }
    const activeTab = this.tabGroups?.primary ?? "stats";
    context.tabs = {};
    for (const t of this.constructor.TABS.primary.tabs) {
      const prior = tabMap[t.id] ?? {};
      const active = prior.active ?? t.id === activeTab;
      context.tabs[t.id] = {
        id: t.id,
        label: t.label,
        group: "primary",
        active,
        cssClass: active ? "active" : ""
      };
    }
    return context;
  }

  #prepareAttackSlots() {
    const slots = ["first", "second", "third"];
    const labels = { first: "1st Atk", second: "2nd Atk", third: "3rd Atk" };
    const placeholders = { first: "Medium Claw", second: "—", third: "—" };
    return slots.map((slot) => {
      const atk = this.document.system.attacks[slot];
      const derived = this.document.system.derived?.attacks?.[slot] ?? {};
      return {
        slot,
        heading: labels[slot],
        placeholder: placeholders[slot],
        bonus: atk.bonus,
        label: atk.label,
        type: atk.type,
        empty: derived.empty,
        tablesHint: derived.tablesHint || "",
        typeOptions: NPC_ATTACK_TYPES.map((t) => ({
          ...t,
          selected: atk.type === t.key
        }))
      };
    });
  }

  #prepareStatusEffects() {
    const common = new Set([
      "bleeding", "stunned", "prone", "blind", "deaf", "mute", "burning",
      "poisoned", "frightened", "surprised", "held", "engaged", "weary",
      "incapacitated", "dying", "bruised", "dead", "aiming1", "aiming2",
      "concentrating1", "charging", "flanking"
    ]);
    const active = new Set();
    for (const e of this.document.effects) {
      if (e.disabled) continue;
      for (const s of e.statuses ?? []) active.add(s);
    }
    return (CONFIG.statusEffects ?? [])
      .filter((se) => common.has(se.id))
      .map((se) => ({
        ...se,
        label: game.i18n.localize(se.name),
        active: active.has(se.id)
      }));
  }

  /**
   * Prevent ArrayField resurrection from stale form submits after deletes.
   * @override
   */
  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData(event, form, formData);
    if (this._ignoreArraySubmit) {
      foundry.utils.deleteProperty(submitData, "system.wounds");
    }
    return submitData;
  }

  async #updateArrayField(path, next) {
    this._ignoreArraySubmit = true;
    try {
      await this.document.update({ [path]: next });
    } finally {
      setTimeout(() => {
        this._ignoreArraySubmit = false;
      }, 250);
    }
  }

  static async #onRollField(event, target) {
    const field = target.dataset.field;
    const actor = this.document;
    const bonus = Number(foundry.utils.getProperty(actor.system, field)) || 0;
    const labels = {
      def: "DEF",
      tsr: "TSR",
      wsr: "WSR",
      rog: "Roguery",
      adv: "Adventuring",
      lor: "Lore"
    };
    await rollCheck({ actor, label: labels[field] ?? field, bonus });
  }

  static async #onRollAttack(event, target) {
    const slot = target.dataset.slot;
    const actor = this.document;
    const atk = actor.system.derived.attacks[slot];
    if (!atk || atk.empty) return;
    const typeBit = atk.typeLabel ? ` (${atk.typeLabel})` : "";
    await rollCheck({
      actor,
      label: `${atk.label || "Attack"}${typeBit}`,
      bonus: atk.bonus,
      table: atk.table || null,
      crit: atk.crit || null
    });
  }

  static async #onAddWound() {
    const wounds = foundry.utils.deepClone(this.document.system.wounds ?? []);
    wounds.push({ name: "", bleed: 0, penalty: 0, notes: "" });
    await this.#updateArrayField("system.wounds", wounds);
  }

  static async #onDeleteWound(event, target) {
    event?.preventDefault?.();
    const index = Number(target.dataset.index);
    const wounds = foundry.utils.deepClone(this.document.system.wounds ?? []);
    wounds.splice(index, 1);
    await this.#updateArrayField("system.wounds", wounds);
  }

  static async #onToggleStatus(event, target) {
    const statusId = target.dataset.statusId;
    if (!statusId) return;
    const token = this.document.getActiveTokens(true, true)[0];
    if (token) {
      await token.actor.toggleStatusEffect(statusId);
    } else {
      await this.document.toggleStatusEffect(statusId);
    }
    this.render();
  }

  static async #onOpenCrits() {
    CriticalBrowser.show();
  }
}
