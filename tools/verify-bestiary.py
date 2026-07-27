import json
from pathlib import Path

data = json.loads(Path(r"C:\Users\josh\vsdsimple\vsdsimple\data\monsters\bestiary.json").read_text(encoding="utf-8"))
for m in data:
    s = m["system"]
    atks = [s["attacks"]["first"], s["attacks"]["second"], s["attacks"]["third"]]
    atk_s = ", ".join(
        f"+{a['bonus']} {a['label']}".strip() for a in atks if a["bonus"] or a["label"]
    ) or "-"
    print(
        f"{m['name']:24} L{s['level']:<2} {s['levelType']:11} HP {s['hp']['max']:3} "
        f"DEF {s['def']:3} TSR {s['tsr']:3} | {atk_s}"
    )
    if not s.get("mr") or s["hp"]["max"] == 0:
        print("  WARN incomplete")
