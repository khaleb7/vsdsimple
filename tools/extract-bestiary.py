"""Extract VsD bestiary stat blocks into vsdsimple JSON."""
import re
import json
import pathlib

root = pathlib.Path(r"C:\Users\josh\VsDVibe\vsdfoundryvibe\src\vsd-actors")
out_dir = pathlib.Path(r"C:\Users\josh\vsdsimple\vsdsimple\data\monsters")
out_dir.mkdir(parents=True, exist_ok=True)

SKIP = {
    "Actor_Templates_vJyMhaJBSC7Zppx2.yml",
    "Basic_Bestiary_HAC0fVSeVJ4vDQvf.yml",
    "NPC_Humanoid_LtapMjmR4GdiGu2B.yml",
    "NPC_Monster_in2QbzeZ3yThVQvA.yml",
    "NPC_Spellcaster_OaSAu1ALJsprjedz.yml",
    "PC_Template_PW1NDoygtKlSSIt1.yml",
    "Awakened_Tree_i4ALiDtlO8KupdjP.yml",
}

KEYS = [
    "Name",
    "Type",
    "Description",
    "Level",
    "MoveRate",
    "ArmourType",
    "Defence",
    "Toughness",
    "Willpower",
    "HitPoints",
    "Attack",
    "Special",
    "CreatureType",
    "Roguery",
    "Adventuring",
    "Lore",
    "Source",
]


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("\\_", " ").replace("\xa0", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", s).strip()


def parse_level(val: str):
    m = re.match(r"(\d+)\s*(.*)", val.strip())
    if not m:
        return 1, "Common"
    return int(m.group(1)), (m.group(2).strip() or "Common")


def parse_attack(val: str):
    parts = [p.strip() for p in re.split(r"###", val)]
    bonus = 0
    bits = []
    if parts:
        bm = re.search(r"-?\d+", parts[0])
        if bm:
            bonus = int(bm.group(0))
        for p in parts[1:]:
            p = p.strip()
            if p:
                bits.append(p)
    label = " ".join(bits).strip()
    if not label and not bonus:
        return None
    return {"bonus": bonus, "label": label, "type": infer_attack_type(label)}


def infer_attack_type(label: str) -> str:
    """Guess hit/crit table pairing from the attack label."""
    l = label.lower()
    if not l:
        return ""
    if any(w in l for w in ("claw", "bite", "horn", "talon", "sting", "hoof", "beak", "tentacle", "crush", "slam", "gore")):
        return "beast"
    if any(w in l for w in ("bow", "arrow", "ranged", "javelin", "thrown", "sling", "crossbow")):
        return "missile"
    if "grapple" in l or "wrestle" in l:
        return "grapple"
    if any(w in l for w in ("bolt",)):
        return "bolt"
    if "spell" in l:
        return "bolt"
    if "area" in l:
        return "area"
    if any(w in l for w in ("fist", "kick", "brawl", "unarmed", "punch")):
        return "unarmed"
    if any(w in l for w in ("blunt", "club", "mace", "hammer", "staff")):
        return "blunt"
    # Named weapons / generic "Weapon"
    return "edged"


def num(fields, key, default=0):
    v = fields.get(key, "")
    m = re.search(r"-?\d+", str(v))
    return int(m.group(0)) if m else default


def clean_name(name: str, yaml_name: str, filename: str) -> str:
    name = name.strip()
    # "Ghoul (Ghoul)" -> Ghoul; "Giant Eagle (Giant Eagle)" -> Giant Eagle
    m = re.match(r"^(.+?)\s*\(\1\)$", name)
    if m:
        name = m.group(1)
    # "Orc (Orc Soldier)" -> Orc Soldier
    m = re.match(r"^.+\s*\((.+)\)$", name)
    if m and m.group(1) not in name.split("(")[0]:
        name = m.group(1)
    if "Dark Troll Overseer" in yaml_name:
        return "Dark Troll Overseer"
    if filename.startswith("Wild_Beast__"):
        inner = re.search(r"Wild_Beast__(.+)__", filename)
        if inner:
            return inner.group(1).replace("_", " ")
    if filename.startswith("Orc__Orc_Soldier"):
        return "Orc Soldier"
    if filename.startswith("Orc__Dark_Orc"):
        return "Dark Orc Chieftain"
    if filename.startswith("Giant_Spider"):
        return "Lesser Giant Spider"
    if filename.startswith("Giant__Lesser"):
        return "Lesser Giant"
    if filename.startswith("Nightmare"):
        return "Nightmare"
    if filename.startswith("Ghoul"):
        return "Ghoul"
    if filename.startswith("Giant_Eagle"):
        return "Giant Eagle"
    # Fix typo Chieftan -> Chieftain
    name = name.replace("Chieftan", "Chieftain")
    return name


def fields_from_li_block(html_ul: str):
    items = re.findall(r"<li>(.*?)</li>", html_ul, flags=re.S)
    fields = {}
    attacks = []
    for it in items:
        text = strip_html(it)
        if ":" not in text:
            continue
        key, val = text.split(":", 1)
        key, val = key.strip(), val.strip()
        if key == "Attack":
            atk = parse_attack(val)
            if atk:
                attacks.append(atk)
        elif key in KEYS:
            fields[key] = val
    fields["_attacks"] = attacks
    return fields


def fields_from_loose_text(text: str):
    """Fallback when Stat Block markup is broken — pull key: value from biography."""
    fields = {}
    attacks = []
    blob = text.replace("\\n", " ")
    blob = re.sub(r"\s+", " ", blob)

    for m in re.finditer(r"Attack:\s*((?:-?\d+)?\s*(?:###[^#<]*){0,3})", blob):
        val = strip_html(m.group(1))
        if "false" in val.lower():
            continue
        atk = parse_attack(val)
        if atk:
            attacks.append(atk)

    for key in KEYS:
        if key == "Attack":
            continue
        matches = re.findall(rf"{key}:\s*([^:<]{{1,80}}?)(?=\s+(?:{'|'.join(KEYS)}):|\s*<|$)", blob)
        chosen = None
        for raw in matches:
            val = strip_html(raw)
            if "false" in val.lower():
                continue
            if key in (
                "Defence",
                "Toughness",
                "Willpower",
                "HitPoints",
                "Roguery",
                "Adventuring",
                "Lore",
                "Level",
            ) and not re.search(r"-?\d+", val):
                continue
            chosen = val
            break
        if chosen is not None:
            fields[key] = chosen

    # Simpler numeric fallbacks for key combat stats
    for key, pat in [
        ("Defence", r"Defence:\s*(\d+)"),
        ("Toughness", r"Toughness:\s*(-?\d+)"),
        ("Willpower", r"Willpower:\s*(-?\d+)"),
        ("HitPoints", r"HitPoints:\s*(\d+)"),
        ("MoveRate", r"MoveRate:\s*([0-9]+[A-Za-z](?:\s+or\s+[0-9]+[A-Za-z])?)"),
        ("ArmourType", r"ArmourType:\s*([A-Za-z]+)"),
        ("CreatureType", r"CreatureType:\s*([A-Za-z]+)"),
        ("Roguery", r"Roguery:\s*(-?\d+)"),
        ("Adventuring", r"Adventuring:\s*(-?\d+)"),
        ("Lore", r"Lore:\s*(-?\d+)"),
        ("Level", r"Level:\s*(\d+\s*\w*)"),
        ("Special", r"Special:\s*([^<\n]+?)(?=\s+CreatureType:|\s+Roguery:|$)"),
    ]:
        m = re.search(pat, blob)
        if m:
            fields[key] = strip_html(m.group(1))

    fields["_attacks"] = attacks
    return fields


def to_monster(name, f):
    level, level_type = parse_level(f.get("Level", "1 Common"))
    # Fix truncated "Commo" -> Common
    if level_type.startswith("Commo"):
        level_type = "Common"
    if level_type.startswith("A"):
        # "A" alone from truncated Antagonist
        if level_type in ("A", "Antagonis", "Antagonist"):
            level_type = "Antagonist"
    attacks = list(f.get("_attacks", []))
    while len(attacks) < 3:
        attacks.append({"bonus": 0, "label": "", "type": ""})
    attacks = attacks[:3]
    for a in attacks:
        if "type" not in a:
            a["type"] = infer_attack_type(a.get("label", ""))
    special = f.get("Special", "")
    if special in ("0", "-", "—"):
        special = ""
    notes_parts = []
    if f.get("Description"):
        notes_parts.append(f["Description"])
    if f.get("Type"):
        notes_parts.append(f"Type: {f['Type']}")
    if f.get("Source"):
        notes_parts.append(f.get("Source"))
    return {
        "id": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"),
        "name": name,
        "system": {
            "level": level,
            "levelType": level_type,
            "mr": f.get("MoveRate", ""),
            "at": f.get("ArmourType", "NA") or "NA",
            "def": num(f, "Defence"),
            "tsr": num(f, "Toughness"),
            "wsr": num(f, "Willpower"),
            "hp": {
                "value": num(f, "HitPoints", 20),
                "max": num(f, "HitPoints", 20),
            },
            "attacks": {
                "first": attacks[0],
                "second": attacks[1],
                "third": attacks[2],
            },
            "special": special,
            "ct": f.get("CreatureType", ""),
            "rog": num(f, "Roguery"),
            "adv": num(f, "Adventuring"),
            "lor": num(f, "Lore"),
            "notes": "\n".join(notes_parts),
        },
    }


monsters = []
for p in sorted(root.glob("*.yml")):
    if p.name in SKIP:
        continue
    text = p.read_text(encoding="utf-8", errors="replace")
    yaml_name_m = re.search(r"^name:\s*(.+)$", text, re.M)
    yaml_name = yaml_name_m.group(1).strip() if yaml_name_m else p.stem

    m = re.search(r"Stat Block</h1>\s*<ul>(.*?)</ul>", text, re.S | re.I)
    if not m:
        m = re.search(r"Stat Block.*?<ul>(.*?)</ul>", text, re.S | re.I)
    if m:
        f = fields_from_li_block(m.group(1))
    else:
        f = fields_from_loose_text(text)
        if not f.get("Level") and not f.get("_attacks"):
            print("SKIP", p.name)
            continue

    name = clean_name(f.get("Name") or yaml_name, yaml_name, p.name)
    monster = to_monster(name, f)
    monsters.append(monster)
    print("OK", monster["name"], monster["system"]["level"], monster["system"]["levelType"])

monsters.append(
    {
        "id": "draugr",
        "name": "Draugr",
        "system": {
            "level": 7,
            "levelType": "Elite",
            "mr": "15L",
            "at": "MA",
            "def": 40,
            "tsr": 50,
            "wsr": 35,
            "hp": {"value": 95, "max": 95},
            "attacks": {
                "first": {"bonus": 90, "label": "Weapon", "type": "edged"},
                "second": {"bonus": 80, "label": "Large Claw", "type": "beast"},
                "third": {"bonus": 0, "label": "", "type": ""},
            },
            "special": "Stench of Decay, Tremendous Strength",
            "ct": "HH",
            "rog": 30,
            "adv": 70,
            "lor": 0,
            "notes": "Hideously grotesque undead grown from ghouls that consume their own kind.\nType: Draugr\nSource: Core Rules (Ghoul entry)",
        },
    }
)

final = []
ids = set()
for m in monsters:
    base = m["id"]
    n = 2
    while m["id"] in ids:
        m["id"] = f"{base}-{n}"
        n += 1
    ids.add(m["id"])
    final.append(m)

final.sort(key=lambda x: x["name"].lower())
out = out_dir / "bestiary.json"
out.write_text(json.dumps(final, indent=2), encoding="utf-8")
print("Wrote", len(final), "monsters to", out)
for m in final:
    print("-", m["name"])
