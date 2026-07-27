# Against the Darkmaster (Simple)

A simplified Foundry VTT system (v13–14) for **Against the Darkmaster**. It gives you form-fillable PC and NPC sheets, click-to-roll open-ended d100 checks, bundled hit and critical tables, and light quality-of-life helpers — while leaving rules enforcement, phase order, and damage application to the table.

**Design goal:** actor-native data, click-to-roll, manual conditions. No combat automation, spell pipelines, or custom combat tracker.

---

## Install

1. Copy or symlink this folder into your Foundry `Data/systems/vsdsimple` directory.
2. Restart Foundry and create a world using **Against the Darkmaster (Simple)**.

Or install from the manifest URL in `system.json` if you host releases on GitHub.

---

## Character sheet

Tabs: **Character**, **Combat**, **Magic**, **Notes**.

### Character tab

| Area | What it does |
|------|----------------|
| **Identity** | Name, level, XP, next-level XP, Kin, Culture, Vocation |
| **Passions** | Three free-text passion lines |
| **Drive points** | Click gems to set 0–5 (or clear) |
| **Heroic path** | Click gems for 10–100 in steps of 10 |
| **Stats** | Brawn, Swiftness, Fortitude, Wits, Wisdom, Bearing — Base / Kin / Spec columns; **TOT** is derived. Click the stat name to roll. |
| **Save rolls** | Toughness SR and Willpower SR — Stat (derived from Fortitude/Wisdom), Lvl / Kin / Spec; click name to roll |
| **Special traits** | Add/remove free-text trait rows |
| **Skills** | Body, Combat, Adventuring, Roguery, Lore categories with standard skills; **#Ranks** applies the VsD rank bonus (+5 per rank 1–10, +2 for 11–20, +1 thereafter). Voc / Kin / Spec / Item columns; **TOT** is derived. |
| **Custom skills** | Two named rows per category; you type the name and **Stat bonus** manually |

### Combat tab

| Area | What it does |
|------|----------------|
| **Hit points** | Current / max; quick **−5 / −1 / +1 / +5** buttons on current HP |
| **Magic points** | Current / max; same quick-adjust buttons |
| **Wounds** | Read-only **Bleed** and **Penalties** totals (sum of injury rows below) |
| **Planned phases** | Toggle chips for Move, Spell, Ranged, Melee, Other, Wait (see [Combat phase planning](#combat-phase-planning)) |
| **Conditions** | Toggle icons (mirrors token HUD); no automatic modifiers applied |
| **Injuries** | Add rows with name, bleed, penalty, notes; duplicate or delete rows |
| **Defense** | Armor type, move rate, Melee DB, Missile DB (click DB labels to roll) |
| **Attacks** | Weapon name, bonus, size, hit table id, crit table id; roll die per row; duplicate or delete |

### Magic tab

| Area | What it does |
|------|----------------|
| **Spell lores** | All ten lores with ranks and Voc / Kin / Spec / Item; click lore name to roll total |
| **Known spells** | Reference list (name, linked lore, level, MP, notes). Click die to roll the linked lore total — spend MP yourself |

### Notes tab

Biography and general notes (free text).

### Sheet tools

- **Shift+click** any roll label to skip the situational modifier prompt (rolls at 0 mod).
- **Copy stat block** (clipboard icon in the title bar) — plain-text export of the actor for Discord or notes.

---

## NPC sheet

Tabs: **Stat Block**, **Combat**, **Notes**.

### Stat block tab

Classic VsD layout: Level, MR, AT, DEF, TSR, WSR, HP (read-only here — edit on Combat), three attacks, Special, CT, Rog / Adv / Lor.

Each attack has bonus, label, and **attack type** (Edged, Blunt, Missile, etc.). Type sets the default hit chart and crit table pairing. Click attack headings or stat abbreviations to roll.

### Combat tab

Editable HP (current / max) with quick-adjust buttons, wound totals, conditions, and injury rows (same pattern as PCs).

### Sheet tools

Shift+click rolls, copy stat block to clipboard.

---

## Rolling

1. Click a roll label (stat, skill, save, defense DB, attack, spell lore, known spell, or NPC field).
2. Optionally enter a **situational modifier** in the dialog (skip with **Shift+click**).
3. The system rolls **1d100oe + bonus** and posts to chat with a success band:
   - Blunder (&lt; 5)
   - Failure (&lt; 75)
   - Partial success (&lt; 100)
   - Success (&lt; 175)
   - Absolute success (175+)

Attack rolls that include a **Table** and **Crit** id on the sheet show **Hit** and **Crit** buttons in chat to open the matching table in the browser.

NPC attacks use the type dropdown for table pairing; PCs type table ids manually (e.g. `edged`, `cut`).

---

## Combat tables

Open the table browser from:

- Token toolbar **book** icon (scene controls)
- Sheet title bar **book** icon
- **Alt+C** keybinding

Includes **Combat Hit Charts** (by armor: NA / LA / MA / HA) and **Critical Strikes**. Crit viewers have severity chips (Sup, Lig, Mod, Gri, Let) that roll d100 with the VsD severity modifier — you look up the result on the table yourself.

Table HTML lives in `data/critical/` and `data/attacks/`.

---

## Conditions and wounds

- Assign conditions from the **token HUD** (right-click token → status icons) or the sheet Combat tab.
- **No automatic modifiers** — Engaged, Bleeding, Stunned, etc. are reminders only; apply effects at the table.
- **Injuries** on the sheet: each row has bleed and penalty; totals show at the top of the Combat tab and on a **token HUD badge** when non-zero.
- On a combatant’s **turn start**, the GM gets a chat whisper with bleed/penalty totals (optional: owners get the same whisper). Totals are never applied to HP automatically.

---

## Combat phase planning

Lightweight round planning — **not** a full APECS / initiative engine.

1. Each PC toggles one or more **Planned phases** on the Combat tab: Move, Spell, Ranged, Melee, Other, Wait.
2. Phase chips appear as badges on that combatant’s row in Foundry’s **combat tracker** (visibility: everyone, owner + GM, or GM only — world setting).
3. The GM can click **Sort by phase** in the tracker to set initiative from the highest declared phase (Move first, then Spell, etc.). This is a **suggestion** — adjust manually as needed.
4. Optionally **clear all PC phase toggles** when a new round starts (world setting).

Players declare intent; the GM still adjudicates order and actions.

---

## Bestiary

### VsD starter bestiary (27 creatures)

- Auto-imports into an Actor folder named **VsD Bestiary** on first GM world load (if enabled).
- **Settings → Import Bestiary** — import new only, or force-update existing by name.

### MERP creatures (68 ST-2 conversions)

- Bundled but **not** auto-imported (ICE copyright — private use with books you own).
- **Settings → Import MERP Creatures** into a **MERP** folder.
- Optional world setting to auto-import on first load.

---

## Audit and tracking

When enabled (world settings), **non-GM** edits to a PC sheet whisper all GMs in chat:

| Setting | Tracks |
|---------|--------|
| **Whisper sheet stat/skill changes to GM** | Stats, saves, skills, custom skills, spell lores |
| **Whisper Drive/Hero changes to GM** | Drive and Hero point changes |

GM edits are never audited. Useful for spotting sheet changes between sessions.

**Condition toggle chat** (separate setting): post public or GM-only messages when conditions are added or removed.

---

## World settings

**Configure Settings → Against the Darkmaster (Simple)**

| Setting | Default | Purpose |
|---------|---------|---------|
| Whisper sheet stat/skill changes to GM | On | Audit log for stat/skill/save/lore edits |
| Whisper Drive/Hero changes to GM | On | Audit log for pool spends |
| Condition toggle chat | GM whisper | Off / public / GM whisper on condition change |
| Combat phase planning | On | Phase chips on sheet and tracker |
| Phase badge visibility | Everyone | Who sees tracker badges |
| Clear phases on new round | On | Reset PC phase toggles each round |
| Wound reminder to players | On | Owners get bleed/pen whisper on their turn |
| Defeated nudge at 0 HP | On | Toast when HP hits 0 (no auto-Defeated) |
| Token HUD HP quick adjust | On | GM −5/−1/+1/+5 on token HUD |
| Auto-import starter bestiary | On | First-load bestiary import |
| Auto-import MERP creatures | Off | First-load MERP import |

---

## Example: GM combat workflow

This walkthrough shows how a GM might run one round using **only** what vsdsimple provides. All rulings stay manual.

### Before combat

1. Drag PCs and monsters (from **VsD Bestiary** or your own NPCs) onto the scene.
2. Confirm token bars: PCs show HP and MP; NPCs show HP.
3. In **Configure Settings**, confirm phase planning and wound reminders match your table’s preferences.

### Round start — declaration

1. Start combat in Foundry (add all combatants to the tracker).
2. Ask players to open the **Combat** tab and toggle **Planned phases** (e.g. Aragorn: Move + Melee; Mage: Spell).
3. Check the combat tracker — phase badges appear next to names.
4. Click **Sort by phase** if you want initiative pre-filled from declarations (highest phase first). Tweak initiative by hand for interrupts, readiness, or surprises.
5. Announce the phase order you are actually using for the round (the sort is a helper, not law).

### Monster turn

1. Select the goblin token. Use **token HUD HP** (−5 / −1 / +1 / +5) if you are scratch-padding damage on the NPC, or edit HP on the NPC **Combat** tab.
2. Click the goblin’s **1st Atk** on the stat block to roll. Chat shows the open-ended total and band.
3. If it hits, click **Hit** in chat → open the hit chart → read NA/LA/MA/HA result and apply damage manually.
4. On a crit, click **Crit** → pick severity (e.g. Mod) → roll → look up on the table → apply wound/bleed/penalty on the **target’s sheet** (injury row), not via automation.

### Player turn

1. When a PC’s turn begins, the GM (and optionally the player) may get a **wound nudge** whisper if bleed/penalty totals are non-zero — reminder only.
2. The player rolls from the sheet (Shift+click if no situational mod). You adjudicate hit/miss and damage.
3. Player adjusts **current HP** with quick buttons or by typing. At **0 HP**, the GM sees a **Defeated nudge** toast — mark **Defeated** on the token HUD if appropriate.
4. If the player changes stats or spends Drive mid-fight, enabled **audit whispers** notify the GM in chat.

### Conditions and engagement

1. Toggle **Engaged**, **Prone**, **Bleeding**, etc. from the token HUD as the fiction demands.
2. If condition chat is on, the table (or GM) sees gain/loss messages.
3. Bleed/penalty **totals** on the sheet do not reduce HP each round — the GM applies bleed damage when the rules say to.

### End of round

1. Advance the round in Foundry. If **clear phases on new round** is on, PC phase chips reset; players declare again.
2. Repeat. Use **Combat Tables** (Alt+C) any time you need hit or crit lookups.

### After combat

- Copy stat blocks (**clipboard** icon) for session notes.
- Review **audit whispers** if you need to reconcile sheet changes with what happened in play.

---

## What is not included

- Character generation or advancement automation
- DP / XP spending rules
- Spellcasting pipelines (MRR, weave, overcasting, etc.)
- Automatic bleed damage, defense modifiers, or condition effects
- Custom combat tracker replacing Foundry’s (phases use badges + optional sort only)
- Migration from the full Foundry `vsd` system
- OCR or text import for bestiary PDFs

---

## License

See `LICENSE`. MERP creature data is for private use with source books you own.
