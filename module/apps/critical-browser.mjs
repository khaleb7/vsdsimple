import { CRITICAL_TABLES, ATTACK_TABLES, allTables, SYSTEM_ID } from "../config.mjs";
import { rollCriticalLookup } from "../rolls.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const CRIT_SEVERITY = {
  A: "Superficial",
  B: "Light",
  C: "Moderate",
  D: "Grievous",
  E: "Lethal",
  Sup: "Superficial",
  Lig: "Light",
  Mod: "Moderate",
  Gri: "Grievous",
  Let: "Lethal"
};

/**
 * Quick-access browser for combat hit charts and critical tables.
 */
export class CriticalBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "vsdsimple-critical-browser",
    classes: [SYSTEM_ID, "critical-browser"],
    position: { width: 380, height: "auto" },
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

  /**
   * @param {{ focus?: "attacks"|"criticals" }} [options]
   */
  static show(options = {}) {
    if (!this.#instance) this.#instance = new CriticalBrowser();
    this.#instance._focusSection = options.focus ?? null;
    this.#instance.render({ force: true });
    return this.#instance;
  }

  async _prepareContext() {
    return {
      criticals: CRITICAL_TABLES,
      attacks: ATTACK_TABLES
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    if (this._focusSection === "attacks") {
      this.element?.querySelector?.(".hit-charts-section")?.scrollIntoView?.({ block: "start" });
    }
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
 * @param {{ id: string, label: string, file: string, folder?: string, kind?: string }} table
 */
export async function openCriticalTable(table) {
  const folder = table.folder ?? "critical";
  const url = `systems/${SYSTEM_ID}/data/${folder}/${table.file}`;
  let html;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(resp.statusText);
    // Normalize NBSP that some exported table HTML used between tags/attributes
    html = (await resp.text()).replace(/\u00a0/g, " ");
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
  const raw = String(tableId).toLowerCase().trim();
  const normalized = raw.replace(/[^a-z0-9]/g, "");
  const tables = allTables();
  const table =
    tables.find((t) => t.id === raw) ||
    tables.find((t) => t.id.replace(/_/g, "") === normalized) ||
    tables.find((t) => normalized.includes(t.id.replace(/_/g, ""))) ||
    tables.find((t) => t.label.toLowerCase().replace(/[^a-z]/g, "") === normalized);
  if (!table) {
    ui.notifications.warn(`Unknown table: ${tableId}`);
    CriticalBrowser.show();
    return;
  }
  await openCriticalTable(table);
}

/**
 * Post a clicked table entry to chat (no automation).
 * @param {HTMLElement} el
 * @param {{ label?: string }} [meta]
 */
export async function postTableEntryToChat(el, meta = {}) {
  if (!el) return;

  // Prefer the clicked rollable cell; otherwise the row
  const cell = el.closest?.("[data-type='attack'], [data-type='critical'], .rollable") ?? el;
  const row = cell.closest?.("tr") ?? cell;
  const dataset = { ...row.dataset, ...cell.dataset };
  const type = dataset.type || (cell.classList?.contains("result-na") || cell.classList?.contains("result-la")
    || cell.classList?.contains("result-ma") || cell.classList?.contains("result-ha")
    ? "attack"
    : row.classList?.contains("rollable")
      ? "critical"
      : null);

  if (!type && !dataset.result && !dataset.hits) {
    // Plain row click on critical table without dataset on cell — use row
    if (row.classList?.contains("tablerow") && row.dataset.result) {
      return postCriticalResult(row.dataset, meta);
    }
    return;
  }

  if (type === "attack" || dataset.armour || dataset.hits !== undefined) {
    return postAttackResult(dataset, row.dataset, meta);
  }
  if (type === "critical" || dataset.result) {
    return postCriticalResult(dataset, meta);
  }
}

async function postAttackResult(dataset, rowDataset = {}, meta = {}) {
  const table = dataset.table || rowDataset.table || meta.label || "Attack Table";
  const roll = dataset.roll || rowDataset.roll || "—";
  const armour = (dataset.armour || "—").toUpperCase();
  const hits = dataset.hits ?? dataset.result ?? "0";
  const critRaw = (dataset.crit || "").trim();
  const critLabel = expandCritCode(critRaw);

  let content = `<div class="vsdsimple-table-chat">
    <div class="roll-header"><strong>${foundry.utils.escapeHTML(meta.label || "Hit Chart")}</strong></div>
    <table class="table-result">
      <tr><td>Table</td><td>${foundry.utils.escapeHTML(table)}</td></tr>
      <tr><td>Roll</td><td>${foundry.utils.escapeHTML(String(roll))}</td></tr>
      <tr><td>Armor</td><td><strong>${foundry.utils.escapeHTML(armour)}</strong></td></tr>
    </table>
    <p class="damageresult"><strong>${foundry.utils.escapeHTML(String(hits))}</strong> hits</p>`;
  if (critLabel) {
    content += `<p class="critseverity"><strong>${foundry.utils.escapeHTML(critLabel)}</strong> critical</p>`;
  }
  content += `</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content
  });
}

async function postCriticalResult(dataset, meta = {}) {
  const table = dataset.table || meta.label || "Critical Table";
  const roll = dataset.roll || "—";
  const result = dataset.result || "";
  const hits = dataset.hits1 && dataset.hits1 !== "0" ? dataset.hits1 : null;
  const bleed = dataset.bleed1 && dataset.bleed1 !== "0" ? dataset.bleed1 : null;
  const action = dataset.action1 && dataset.action1 !== "0" ? dataset.action1 : null;

  let content = `<div class="vsdsimple-table-chat">
    <div class="roll-header"><strong>${foundry.utils.escapeHTML(meta.label || "Critical")}</strong></div>
    <table class="table-result">
      <tr><td>Table</td><td>${foundry.utils.escapeHTML(table)}</td></tr>
      <tr><td>Roll</td><td>${foundry.utils.escapeHTML(String(roll))}</td></tr>
    </table>
    <p class="critresult">${foundry.utils.escapeHTML(result)}</p>`;
  const bits = [];
  if (hits) bits.push(`+${hits} hits`);
  if (bleed) bits.push(`${bleed} bleed`);
  if (action) bits.push(`-${action} actions`);
  if (bits.length) content += `<p class="crit-meta">${bits.join(" · ")}</p>`;
  content += `</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content
  });
}

function expandCritCode(raw) {
  if (!raw) return "";
  const text = String(raw).trim();
  // e.g. "Sup", "Lig", "A", "5A"
  const m = text.match(/^(\d+)?\s*([A-Za-z]+)$/);
  if (!m) return text;
  const code = m[2];
  const sev = CRIT_SEVERITY[code] || CRIT_SEVERITY[code[0]] || code;
  return m[1] ? `${sev} (+${m[1]})` : sev;
}

class CriticalTableViewer extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "critical-table-viewer"],
    position: { width: 900, height: 700 },
    window: { resizable: true },
    actions: {
      rollLookup: CriticalTableViewer.#onRollLookup,
      rollSeverity: CriticalTableViewer.#onRollSeverity,
      openHitCharts: CriticalTableViewer.#onOpenHitCharts,
      openCritCharts: CriticalTableViewer.#onOpenCritCharts,
      openBrowser: CriticalTableViewer.#onOpenBrowser
    }
  };

  static PARTS = {
    body: {
      template: `systems/${SYSTEM_ID}/templates/apps/critical-table-viewer.hbs`,
      scrollable: [".table-content"]
    }
  };

  constructor({ table, html }, options = {}) {
    const kindLabel =
      table.kind === "attack"
        ? game.i18n.localize("VSDSIMPLE.Crit.hitCharts")
        : game.i18n.localize("VSDSIMPLE.Crit.critCharts");
    super({
      ...options,
      window: { ...(options.window ?? {}), title: `${kindLabel}: ${table.label}` }
    });
    this.table = table;
    this.tableHtml = html;
  }

  async _prepareContext() {
    const kind = this.table.kind ?? (this.table.folder === "attacks" ? "attack" : "critical");
    return {
      table: this.table,
      content: this.tableHtml,
      isCritical: kind === "critical",
      isAttack: kind === "attack",
      severities: [
        { key: "Sup", label: "Sup", mod: 0 },
        { key: "Lig", label: "Lig", mod: 10 },
        { key: "Mod", label: "Mod", mod: 20 },
        { key: "Gri", label: "Gri", mod: 30 },
        { key: "Let", label: "Let", mod: 50 }
      ]
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element?.querySelector?.(".table-content");
    if (!root || root.dataset.chatBound) return;
    root.dataset.chatBound = "1";
    root.addEventListener("click", (ev) => this.#onTableClick(ev));
  }

  async #onTableClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Attack chart: click a specific armor result cell
    const attackCell = target.closest("td.rollable[data-type='attack'], td[data-type='attack'], td.result-na.rollable, td.result-la.rollable, td.result-ma.rollable, td.result-ha.rollable");
    if (attackCell) {
      event.preventDefault();
      await postTableEntryToChat(attackCell, { label: this.table.label });
      return;
    }

    // Critical chart: click anywhere on a result row
    const critRow = target.closest("tr.rollable[data-type='critical'], tr.tablerow.rollable, tr[data-type='critical']");
    if (critRow && critRow.dataset.result) {
      event.preventDefault();
      await postTableEntryToChat(critRow, { label: this.table.label });
      return;
    }

    // Fallback: any .rollable with a result
    const rollable = target.closest(".rollable");
    if (rollable && (rollable.dataset.result || rollable.dataset.hits !== undefined)) {
      event.preventDefault();
      await postTableEntryToChat(rollable, { label: this.table.label });
    }
  }

  static async #onRollLookup() {
    await rollCriticalLookup(this.table.label);
  }

  static async #onRollSeverity(event, target) {
    const severity = target.dataset.severity;
    const mod = Number(target.dataset.mod) || 0;
    await rollCriticalLookup(this.table.label, { severity, mod });
  }

  static async #onOpenHitCharts() {
    CriticalBrowser.show({ focus: "attacks" });
    const edged = ATTACK_TABLES.find((t) => t.id === "edged");
    if (edged) await openCriticalTable(edged);
  }

  static async #onOpenCritCharts() {
    CriticalBrowser.show({ focus: "criticals" });
  }

  static async #onOpenBrowser() {
    CriticalBrowser.show();
  }
}
