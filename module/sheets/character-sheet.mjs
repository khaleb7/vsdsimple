import { SYSTEM_ID, SPELL_LORES } from "../config.mjs";
import { rollCheck } from "../rolls.mjs";
import { CriticalBrowser } from "../apps/critical-browser.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Form-fillable PC character sheet.
 */
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "actor", "character", "vsd-form-sheet"],
    position: { width: 860, height: 920 },
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
      rollStat: CharacterSheet.#onRollStat,
      rollSkill: CharacterSheet.#onRollSkill,
      rollCustomSkill: CharacterSheet.#onRollCustomSkill,
      rollSave: CharacterSheet.#onRollSave,
      rollDefense: CharacterSheet.#onRollDefense,
      rollAttack: CharacterSheet.#onRollAttack,
      rollSpell: CharacterSheet.#onRollSpell,
      rollKnownSpell: CharacterSheet.#onRollKnownSpell,
      addAttack: CharacterSheet.#onAddAttack,
      deleteAttack: CharacterSheet.#onDeleteAttack,
      addWound: CharacterSheet.#onAddWound,
      deleteWound: CharacterSheet.#onDeleteWound,
      addSpell: CharacterSheet.#onAddSpell,
      deleteSpell: CharacterSheet.#onDeleteSpell,
      addTrait: CharacterSheet.#onAddTrait,
      deleteTrait: CharacterSheet.#onDeleteTrait,
      setDrive: CharacterSheet.#onSetDrive,
      setHero: CharacterSheet.#onSetHero,
      openCrits: CharacterSheet.#onOpenCrits,
      toggleStatus: CharacterSheet.#onToggleStatus
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    body: {
      template: `systems/${SYSTEM_ID}/templates/actor/character-sheet.hbs`,
      scrollable: [".sheet-body"]
    }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "character", label: "VSDSIMPLE.Tabs.character" },
        { id: "combat", label: "VSDSIMPLE.Tabs.combat" },
        { id: "magic", label: "VSDSIMPLE.Tabs.magic" },
        { id: "notes", label: "VSDSIMPLE.Tabs.notes" }
      ],
      initial: "character"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;
    context.system = system;
    context.actor = this.document;
    context.derived = system.derived ?? {};
    context.logo = `systems/${SYSTEM_ID}/icons/darkmaster_logo.png`;
    context.statusEffects = this.#prepareStatusEffects();
    context.spellLoreOptions = SPELL_LORES;
    context.knownSpells = (system.spells ?? []).map((sp, index) => ({
      ...sp,
      index,
      loreOptions: SPELL_LORES.map((opt) => ({
        ...opt,
        selected: sp.lore === opt.key
      }))
    }));

    // Flatten tabs for template (support both nested and flat AppV2 shapes)
    let tabMap = context.tabs ?? {};
    if (tabMap.primary && typeof tabMap.primary === "object" && !tabMap.primary.id) {
      tabMap = tabMap.primary;
    }
    const activeTab = this.tabGroups?.primary ?? "character";
    context.tabs = {};
    for (const [id, t] of Object.entries(tabMap)) {
      if (!t || typeof t !== "object") continue;
      const active = t.active ?? id === activeTab;
      context.tabs[id] = {
        id: t.id ?? id,
        label: t.label ?? id,
        group: t.group ?? "primary",
        active,
        cssClass: active ? "active" : ""
      };
    }
    // Ensure all expected tabs exist even if framework omitted them
    for (const t of this.constructor.TABS.primary.tabs) {
      if (!context.tabs[t.id]) {
        const active = t.id === activeTab;
        context.tabs[t.id] = {
          id: t.id,
          label: t.label,
          group: "primary",
          active,
          cssClass: active ? "active" : ""
        };
      }
    }
    return context;
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
   * Prevent ArrayField resurrection from stale form submits after deletes,
   * and strip empty trait strings.
   * @override
   */
  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData(event, form, formData);

    if (this._ignoreArraySubmit) {
      foundry.utils.deleteProperty(submitData, "system.attacks");
      foundry.utils.deleteProperty(submitData, "system.wounds");
      foundry.utils.deleteProperty(submitData, "system.traits");
      foundry.utils.deleteProperty(submitData, "system.spells");
      return submitData;
    }

    const traits = foundry.utils.getProperty(submitData, "system.traits");
    if (Array.isArray(traits)) {
      foundry.utils.setProperty(
        submitData,
        "system.traits",
        traits.filter((t) => String(t ?? "").trim().length > 0)
      );
    }

    return submitData;
  }

  async #updateArrayField(path, next) {
    this._ignoreArraySubmit = true;
    try {
      await this.document.update({ [path]: next });
    } finally {
      // Allow form submits again after the sheet re-renders with new indices
      setTimeout(() => {
        this._ignoreArraySubmit = false;
      }, 250);
    }
  }

  static async #onRollStat(event, target) {
    const key = target.dataset.key;
    const actor = this.document;
    const st = actor.system.derived.stats[key];
    if (!st) return;
    await rollCheck({ actor, label: st.label, bonus: st.total });
  }

  static async #onRollSkill(event, target) {
    const key = target.dataset.key;
    const actor = this.document;
    const sk = actor.system.derived.skills[key];
    if (!sk) return;
    await rollCheck({ actor, label: sk.label, bonus: sk.total });
  }

  static async #onRollCustomSkill(event, target) {
    const category = target.dataset.category;
    const index = Number(target.dataset.index);
    const actor = this.document;
    const cat = actor.system.derived.skillCategories.find((c) => c.key === category);
    const sk = cat?.customSkills?.[index];
    if (!sk) return;
    const label = sk.name?.trim() || "Custom Skill";
    await rollCheck({ actor, label, bonus: sk.total });
  }

  static async #onRollSave(event, target) {
    const key = target.dataset.key;
    const actor = this.document;
    const sv = actor.system.derived.saves[key];
    if (!sv) return;
    const label = key === "tsr" ? "Toughness SR" : "Willpower SR";
    await rollCheck({ actor, label, bonus: sv.total });
  }

  static async #onRollDefense(event, target) {
    const which = target.dataset.key;
    const actor = this.document;
    const bonus = Number(actor.system.defense[which]) || 0;
    const label = which === "meleeDB" ? "Melee DB" : "Missile DB";
    await rollCheck({ actor, label, bonus });
  }

  static async #onRollAttack(event, target) {
    const index = Number(target.dataset.index);
    const atk = this.document.system.attacks[index];
    if (!atk) return;
    await rollCheck({
      actor: this.document,
      label: atk.name || "Attack",
      bonus: atk.bonus,
      table: atk.table || null,
      crit: atk.crit || null
    });
  }

  static async #onRollSpell(event, target) {
    const key = target.dataset.key;
    const lore = this.document.system.derived.spellLores[key];
    if (!lore) return;
    await rollCheck({ actor: this.document, label: lore.label, bonus: lore.total });
  }

  static async #onRollKnownSpell(event, target) {
    const index = Number(target.dataset.index);
    const spell = this.document.system.spells[index];
    if (!spell) return;
    const lore = this.document.system.derived.spellLores[spell.lore];
    const label = spell.name?.trim() || lore?.label || "Spell";
    await rollCheck({
      actor: this.document,
      label,
      bonus: lore?.total ?? 0
    });
  }

  static async #onAddAttack() {
    const attacks = foundry.utils.deepClone(this.document.system.attacks);
    attacks.push({ name: "", bonus: 0, size: "", table: "", crit: "" });
    await this.#updateArrayField("system.attacks", attacks);
  }

  static async #onDeleteAttack(event, target) {
    event?.preventDefault?.();
    const index = Number(target.dataset.index);
    const attacks = foundry.utils.deepClone(this.document.system.attacks);
    attacks.splice(index, 1);
    await this.#updateArrayField("system.attacks", attacks);
  }

  static async #onAddWound() {
    const wounds = foundry.utils.deepClone(this.document.system.wounds);
    wounds.push({ name: "", bleed: 0, penalty: 0, notes: "" });
    await this.#updateArrayField("system.wounds", wounds);
  }

  static async #onDeleteWound(event, target) {
    event?.preventDefault?.();
    const index = Number(target.dataset.index);
    const wounds = foundry.utils.deepClone(this.document.system.wounds);
    wounds.splice(index, 1);
    await this.#updateArrayField("system.wounds", wounds);
  }

  static async #onAddSpell() {
    const spells = foundry.utils.deepClone(this.document.system.spells ?? []);
    spells.push({ name: "", lore: "", level: 0, mp: 0, notes: "" });
    await this.#updateArrayField("system.spells", spells);
  }

  static async #onDeleteSpell(event, target) {
    event?.preventDefault?.();
    const index = Number(target.dataset.index);
    const spells = foundry.utils.deepClone(this.document.system.spells ?? []);
    spells.splice(index, 1);
    await this.#updateArrayField("system.spells", spells);
  }

  static async #onAddTrait() {
    const traits = foundry.utils.deepClone(this.document.system.traits ?? []);
    traits.push("");
    await this.#updateArrayField("system.traits", traits);
  }

  static async #onDeleteTrait(event, target) {
    event?.preventDefault?.();
    const index = Number(target.dataset.index);
    const traits = foundry.utils.deepClone(this.document.system.traits ?? []);
    traits.splice(index, 1);
    await this.#updateArrayField("system.traits", traits);
  }

  static async #onSetDrive(event, target) {
    const value = Number(target.dataset.value);
    await this.document.update({ "system.pools.drive": value });
  }

  static async #onSetHero(event, target) {
    const value = Number(target.dataset.value);
    await this.document.update({ "system.pools.hero": value });
  }

  static async #onOpenCrits() {
    CriticalBrowser.show();
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
}
