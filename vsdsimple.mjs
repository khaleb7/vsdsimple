import { CharacterDataModel } from "./module/data/character.mjs";
import { NpcDataModel } from "./module/data/npc.mjs";
import { CharacterSheet } from "./module/sheets/character-sheet.mjs";
import { NpcSheet } from "./module/sheets/npc-sheet.mjs";
import { registerOpenEndedDie } from "./module/dice/open-ended.mjs";
import { CriticalBrowser, openCriticalTableById } from "./module/apps/critical-browser.mjs";
import { SYSTEM_ID, getStatusEffects } from "./module/config.mjs";
import { registerHandlebarsHelpers } from "./module/helpers.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing Against the Darkmaster (Simple)`);

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc: NpcDataModel
  };

  CONFIG.Actor.documentClass = VsDSimpleActor;

  registerOpenEndedDie();
  registerHandlebarsHelpers();

  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "VSDSIMPLE.Sheet.character"
  });
  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, NpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "VSDSIMPLE.Sheet.npc"
  });

  CONFIG.statusEffects = getStatusEffects();
  CONFIG.controlIcons.defeated = `systems/${SYSTEM_ID}/icons/defeated.png`;

  game.keybindings.register(SYSTEM_ID, "openCrits", {
    name: "VSDSIMPLE.Crit.browser",
    editable: [{ key: "KeyC", modifiers: ["Alt"] }],
    onDown: () => {
      CriticalBrowser.show();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  console.log(`${SYSTEM_ID} | Ready`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tools = controls.tokens?.tools ?? controls.find?.((c) => c.name === "token")?.tools;
  const tokenControls = Array.isArray(controls)
    ? controls.find((c) => c.name === "token")
    : controls.tokens;

  const critTool = {
    name: "vsdsimple-crits",
    title: "VSDSIMPLE.Crit.browser",
    icon: "fas fa-book-dead",
    button: true,
    onChange: () => CriticalBrowser.show(),
    onClick: () => CriticalBrowser.show()
  };

  // Foundry v13+ object map of controls
  if (controls.tokens?.tools) {
    controls.tokens.tools["vsdsimple-crits"] = critTool;
    return;
  }
  // Legacy array form
  if (tokenControls?.tools) {
    if (Array.isArray(tokenControls.tools)) tokenControls.tools.push(critTool);
    else tokenControls.tools["vsdsimple-crits"] = critTool;
  }
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  html.querySelectorAll?.(".open-crit-table")?.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      openCriticalTableById(btn.dataset.table);
    });
  });
});

// Fallback for older chat render hook
Hooks.on("renderChatMessage", (message, html) => {
  const root = html instanceof HTMLElement ? html : html[0];
  root?.querySelectorAll?.(".open-crit-table")?.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      openCriticalTableById(btn.dataset.table);
    });
  });
});

/**
 * Actor document with sensible token bar defaults per type.
 */
class VsDSimpleActor extends Actor {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const prototypeToken = {};
    if (data.type === "character") {
      prototypeToken.actorLink = true;
      prototypeToken.bar1 = { attribute: "pools.hp" };
      prototypeToken.bar2 = { attribute: "pools.mp" };
      prototypeToken.displayName = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
    } else if (data.type === "npc") {
      prototypeToken.bar1 = { attribute: "hp" };
      prototypeToken.bar2 = { attribute: null };
      prototypeToken.displayName = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
    }
    this.updateSource({ prototypeToken });
  }
}
