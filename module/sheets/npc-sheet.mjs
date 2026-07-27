import { SYSTEM_ID } from "../config.mjs";
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
    position: { width: 420, height: 640 },
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
      openCrits: NpcSheet.#onOpenCrits
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    body: {
      template: `systems/${SYSTEM_ID}/templates/actor/npc-sheet.hbs`
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.actor = this.document;
    context.derived = this.document.system.derived ?? {};
    context.logo = `systems/${SYSTEM_ID}/icons/darkmaster_logo.png`;
    return context;
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
    await rollCheck({
      actor,
      label: atk.label || "Attack",
      bonus: atk.bonus
    });
  }

  static async #onOpenCrits() {
    CriticalBrowser.show();
  }
}
