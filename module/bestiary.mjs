import { SYSTEM_ID } from "./config.mjs";

const BESTIARY_PATH = `systems/${SYSTEM_ID}/data/monsters/bestiary.json`;
const FOLDER_NAME = "VsD Bestiary";
const FLAG_KEY = "bestiaryVersion";
const BESTIARY_VERSION = 1;

/**
 * Register settings and hooks for importing the starter bestiary.
 */
export function registerBestiary() {
  game.settings.register(SYSTEM_ID, FLAG_KEY, {
    name: "Bestiary Import Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register(SYSTEM_ID, "autoImportBestiary", {
    name: "VSDSIMPLE.Bestiary.autoImport",
    hint: "VSDSIMPLE.Bestiary.autoImportHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.registerMenu(SYSTEM_ID, "importBestiary", {
    name: "VSDSIMPLE.Bestiary.importMenu",
    label: "VSDSIMPLE.Bestiary.importButton",
    hint: "VSDSIMPLE.Bestiary.importHint",
    icon: "fas fa-dragon",
    type: BestiaryImportMenu,
    restricted: true
  });
}

/**
 * Settings menu that prompts for import options via DialogV2.
 * Extends FormApplication only because registerMenu requires it.
 */
class BestiaryImportMenu extends FormApplication {
  /** @override */
  async render() {
    const importedVersion = game.settings.get(SYSTEM_ID, FLAG_KEY);
    const force = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("VSDSIMPLE.Bestiary.importMenu") },
      content: `<p>${game.i18n.localize("VSDSIMPLE.Bestiary.importHint")}</p>
        <p class="hint">Imported version: ${importedVersion} / current: ${BESTIARY_VERSION}</p>
        <p>${game.i18n.localize("VSDSIMPLE.Bestiary.forceUpdate")}?</p>`,
      yes: { label: game.i18n.localize("VSDSIMPLE.Bestiary.importButton") },
      no: { label: "Cancel" }
    });
    if (force === null) return this;
    await importBestiary({ force: !!force, notify: true });
    return this;
  }

  async _updateObject() {}
}

/**
 * Load bestiary JSON and create NPC actors in a world folder.
 * @param {{ force?: boolean, notify?: boolean }} [options]
 */
export async function importBestiary({ force = false, notify = false } = {}) {
  if (!game.user.isGM) {
    if (notify) ui.notifications.warn(game.i18n.localize("VSDSIMPLE.Bestiary.gmOnly"));
    return { created: 0, skipped: 0 };
  }

  const current = game.settings.get(SYSTEM_ID, FLAG_KEY);
  if (!force && current >= BESTIARY_VERSION) {
    if (notify) ui.notifications.info(game.i18n.localize("VSDSIMPLE.Bestiary.alreadyImported"));
    return { created: 0, skipped: 0, already: true };
  }

  let data;
  try {
    const resp = await fetch(BESTIARY_PATH);
    if (!resp.ok) throw new Error(resp.statusText);
    data = await resp.json();
  } catch (err) {
    console.error(`${SYSTEM_ID} | Failed to load bestiary`, err);
    ui.notifications.error(game.i18n.localize("VSDSIMPLE.Bestiary.loadFailed"));
    return { created: 0, skipped: 0, error: true };
  }

  const folder = await ensureBestiaryFolder();
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
        [SYSTEM_ID]: { bestiaryId: entry.id, bestiaryVersion: BESTIARY_VERSION }
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

  await game.settings.set(SYSTEM_ID, FLAG_KEY, BESTIARY_VERSION);

  if (notify || created || updated) {
    ui.notifications.info(
      game.i18n.format("VSDSIMPLE.Bestiary.importResult", { created, updated, skipped })
    );
  }

  return { created, updated, skipped };
}

async function ensureBestiaryFolder() {
  const existing = game.folders.find((f) => f.type === "Actor" && f.name === FOLDER_NAME);
  if (existing) return existing;
  return Folder.create({ name: FOLDER_NAME, type: "Actor", color: "#4a4640" });
}

/**
 * Auto-import once for new worlds when the setting is enabled.
 */
export async function maybeAutoImportBestiary() {
  if (!game.user.isGM) return;
  if (!game.settings.get(SYSTEM_ID, "autoImportBestiary")) return;
  const current = game.settings.get(SYSTEM_ID, FLAG_KEY);
  if (current >= BESTIARY_VERSION) return;
  await importBestiary({ force: false, notify: true });
}
