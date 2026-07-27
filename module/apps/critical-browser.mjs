import { CRITICAL_TABLES, ATTACK_TABLES, allTables, SYSTEM_ID } from "../config.mjs";
import { rollCriticalLookup } from "../rolls.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Quick-access browser for critical and attack tables.
 */
export class CriticalBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "vsdsimple-critical-browser",
    classes: [SYSTEM_ID, "critical-browser"],
    position: { width: 360, height: "auto" },
    window: {
      title: "VSDSIMPLE.Crit.browser",
      resizable: false
    },
    actions: {
      openTable: CriticalBrowser.#onOpenTable,
      rollLookup: CriticalBrowser.#onRollLookup
    }
  };

  static PARTS = {
    body: {
      template: `systems/${SYSTEM_ID}/templates/apps/critical-browser.hbs`
    }
  };

  static #instance = null;

  static show() {
    if (!this.#instance) this.#instance = new CriticalBrowser();
    this.#instance.render({ force: true });
    return this.#instance;
  }

  async _prepareContext() {
    return {
      criticals: CRITICAL_TABLES,
      attacks: ATTACK_TABLES
    };
  }

  static async #onOpenTable(event, target) {
    const id = target.dataset.tableId;
    const table = allTables().find((t) => t.id === id);
    if (!table) return;
    await openCriticalTable(table);
  }

  static async #onRollLookup(event, target) {
    const id = target.dataset.tableId;
    const table = allTables().find((t) => t.id === id);
    if (!table) return;
    await rollCriticalLookup(table.label);
  }
}

/**
 * Fetch and display a table HTML file.
 * @param {{ id: string, label: string, file: string, folder?: string }} table
 */
export async function openCriticalTable(table) {
  const folder = table.folder ?? "critical";
  const url = `systems/${SYSTEM_ID}/data/${folder}/${table.file}`;
  let html;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(resp.statusText);
    html = await resp.text();
  } catch (err) {
    ui.notifications.error(`Could not load table: ${table.label}`);
    console.error(err);
    return;
  }

  new CriticalTableViewer({ table, html }).render({ force: true });
}

/**
 * Open a table by id (used from chat buttons).
 * @param {string} tableId
 */
export async function openCriticalTableById(tableId) {
  if (!tableId) return;
  const normalized = String(tableId).toLowerCase().replace(/[^a-z0-9]/g, "");
  const tables = allTables();
  const table =
    tables.find((t) => t.id === normalized) ||
    tables.find((t) => normalized.includes(t.id.replace(/_/g, ""))) ||
    tables.find((t) => t.label.toLowerCase().replace(/[^a-z]/g, "") === normalized);
  if (!table) {
    ui.notifications.warn(`Unknown table: ${tableId}`);
    CriticalBrowser.show();
    return;
  }
  await openCriticalTable(table);
}

class CriticalTableViewer extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "critical-table-viewer"],
    position: { width: 900, height: 700 },
    window: { resizable: true },
    actions: {
      rollLookup: CriticalTableViewer.#onRollLookup
    }
  };

  static PARTS = {
    body: {
      template: `systems/${SYSTEM_ID}/templates/apps/critical-table-viewer.hbs`,
      scrollable: [".table-content"]
    }
  };

  constructor({ table, html }, options = {}) {
    super({
      ...options,
      window: { ...(options.window ?? {}), title: table.label }
    });
    this.table = table;
    this.tableHtml = html;
  }

  async _prepareContext() {
    return {
      table: this.table,
      content: this.tableHtml
    };
  }

  static async #onRollLookup() {
    await rollCriticalLookup(this.table.label);
  }
}
