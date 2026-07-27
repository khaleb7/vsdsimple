import { SYSTEM_ID } from "./config.mjs";

const MERP_PATH = `systems/${SYSTEM_ID}/data/monsters/merp/corebook.json`;
const FOLDER_NAME = "MERP";
const FLAG_KEY = "merpBestiaryVersion";
const MERP_VERSION = 1;

/**
 * Register settings and menu for importing MERP CE ST-2 creatures.
 * Auto-import defaults OFF (ICE copyright / opt-in).
 */
export function registerMerpBestiary() {
  game.settings.register(SYSTEM_ID, FLAG_KEY, {
    name: "MERP Bestiary Import Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register(SYSTEM_ID, "autoImportMerpBestiary", {
    name: "VSDSIMPLE.MerpBestiary.autoImport",
    hint: "VSDSIMPLE.MerpBestiary.autoImportHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.registerMenu(SYSTEM_ID, "importMerpBestiary", {
    name: "VSDSIMPLE.MerpBestiary.importMenu",
    label: "VSDSIMPLE.MerpBestiary.importButton",
    hint: "VSDSIMPLE.MerpBestiary.importHint",
    icon: "fas fa-book",
    type: MerpBestiaryImportMenu,
    restricted: true
  });
}

/**
 * Settings menu that prompts for MERP import options via DialogV2.
 */
class MerpBestiaryImportMenu extends FormApplication {
  /** @override */
  async render() {
    const importedVersion = game.settings.get(SYSTEM_ID, FLAG_KEY);
    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("VSDSIMPLE.MerpBestiary.importMenu") },
      content: `<p>${game.i18n.localize("VSDSIMPLE.MerpBestiary.importHint")}</p>
        <p class="hint">Imported version: ${importedVersion} / current: ${MERP_VERSION}</p>
        <p class="hint">${game.i18n.localize("VSDSIMPLE.MerpBestiary.copyrightHint")}</p>`,
      buttons: [
        {
          action: "import",
          label: game.i18n.localize("VSDSIMPLE.MerpBestiary.importNew"),
          icon: "fas fa-file-import",
          default: true,
          callback: () => "import"
        },
        {
          action: "force",
          label: game.i18n.localize("VSDSIMPLE.MerpBestiary.importForce"),
          icon: "fas fa-sync",
          callback: () => "force"
        },
        {
          action: "cancel",
          label: game.i18n.localize("VSDSIMPLE.MerpBestiary.cancel"),
          icon: "fas fa-times",
          callback: () => "cancel"
        }
      ],
      rejectClose: false
    });

    if (!choice || choice === "cancel") return this;
    await importMerpBestiary({ force: choice === "force", notify: true });
    return this;
  }

  async _updateObject() {}
}

/**
 * Load MERP corebook JSON and create NPC actors in the MERP folder.
 * @param {{ force?: boolean, notify?: boolean }} [options]
 */
export async function importMerpBestiary({ force = false, notify = false } = {}) {
  if (!game.user.isGM) {
    if (notify) ui.notifications.warn(game.i18n.localize("VSDSIMPLE.MerpBestiary.gmOnly"));
    return { created: 0, skipped: 0 };
  }

  const current = game.settings.get(SYSTEM_ID, FLAG_KEY);
  if (!force && current >= MERP_VERSION) {
    if (notify) ui.notifications.info(game.i18n.localize("VSDSIMPLE.MerpBestiary.alreadyImported"));
    return { created: 0, skipped: 0, already: true };
  }

  let data;
  try {
    const resp = await fetch(MERP_PATH);
    if (!resp.ok) throw new Error(resp.statusText);
    data = await resp.json();
  } catch (err) {
    console.error(`${SYSTEM_ID} | Failed to load MERP creatures`, err);
    ui.notifications.error(game.i18n.localize("VSDSIMPLE.MerpBestiary.loadFailed"));
    return { created: 0, skipped: 0, error: true };
  }

  const folder = await ensureMerpFolder();
  const existing = new Map(
    game.actors.filter((a) => a.folder?.id === folder.id).map((a) => [a.name, a])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of data) {
    const payload = {
      name: entry.name,
      type: "npc",
      img: entry.img || `systems/${SYSTEM_ID}/icons/darkmaster_logo_offset.png`,
      folder: folder.id,
      system: entry.system,
      prototypeToken: {
        name: entry.name,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        bar1: { attribute: "hp" },
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER
      },
      flags: {
        [SYSTEM_ID]: { merpId: entry.id, merpBestiaryVersion: MERP_VERSION, source: "MERP CE ST-2" }
      }
    };

    const prior = existing.get(entry.name);
    if (prior) {
      if (force) {
        await prior.update({
          system: payload.system,
          img: payload.img,
          prototypeToken: payload.prototypeToken,
          flags: payload.flags
        });
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    await Actor.create(payload);
    created++;
  }

  await game.settings.set(SYSTEM_ID, FLAG_KEY, MERP_VERSION);

  if (notify || created || updated) {
    ui.notifications.info(
      game.i18n.format("VSDSIMPLE.MerpBestiary.importResult", { created, updated, skipped })
    );
  }

  return { created, updated, skipped };
}

async function ensureMerpFolder() {
  const existing = game.folders.find((f) => f.type === "Actor" && f.name === FOLDER_NAME);
  if (existing) return existing;
  return Folder.create({ name: FOLDER_NAME, type: "Actor", color: "#5c4033" });
}

/**
 * Auto-import only when the setting is enabled (default off).
 */
export async function maybeAutoImportMerpBestiary() {
  if (!game.user.isGM) return;
  if (!game.settings.get(SYSTEM_ID, "autoImportMerpBestiary")) return;
  const current = game.settings.get(SYSTEM_ID, FLAG_KEY);
  if (current >= MERP_VERSION) return;
  await importMerpBestiary({ force: false, notify: true });
}
