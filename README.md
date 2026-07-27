# Against the Darkmaster (Simple)

A simplified Foundry VTT v14 system for **Against the Darkmaster**: form-fillable character and NPC sheets, click-to-roll (open-ended d100), quick critical tables, and manual token conditions. No combat automation.

## Install

1. Copy or symlink this folder into your Foundry `Data/systems/vsdsimple` directory.
2. Restart Foundry and create a world using **Against the Darkmaster (Simple)**.

## Features

- **Character sheet** — Stats, skills, saves, HP/MP, attacks, wounds, spell lores; totals from light derived helpers (rank bonus + column sums).
- **NPC stat block** — Level, MR, AT, DEF, TSR, WSR, HPs, attacks, Special, CT, Rog/Adv/Lor; click labels to roll.
- **Starter bestiary** — 27 core creatures auto-import into an Actor folder (`VsD Bestiary`) on first GM load (or via System Settings → Import Bestiary).
- **Rolling** — Click a skill/stat/attack → optional modifier → `1d100oe + bonus`.
- **Critical tables** — Scene control (book icon) or sheet window control opens the critical browser. Tables load from `data/critical/*.html`.
- **Conditions** — Assign via token HUD (bleed, stun, etc.). Sheet Combat tab mirrors common toggles with no automatic modifiers.

## Not included

Character generation automation, bestiary text import, spellcasting pipelines, custom combat tracker, or migration from the full `vsd` system.
