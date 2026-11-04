"""🧪 Baut ausgedachte Beispiel-Daten (keine echten Stunden!) für den Oberflächen-Test und die Screenshots."""

from __future__ import annotations

import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from custom_components.stundenzettel.const import DEFAULT_SETTINGS  # noqa: E402
from custom_components.stundenzettel.manager import compute_months, day_hours  # noqa: E402

random.seed(7)
TODAY = date(2026, 11, 4)
st = {**DEFAULT_SETTINGS, "calendar": "calendar.beispiel", "event_title": "Arbeiten", "cal_write": True, "start_balance": 12.0,
      "holiday_calendar": "calendar.feiertage_beispiel", "stamp_person": "person.max", "stamp_zone": "zone.arbeit"}
days: dict[str, dict] = {}
NOTES = ["Musterstadt – Terrasse", "Beispielweg 3 – Carport", "Werkstatt", "Lager aufräumen", "Kunde Muster – Reklamation", ""]
d = date(2026, 6, 1)
while d < TODAY:
    wd = d.isoweekday()
    iso = d.isoformat()
    if wd <= 5:
        r = random.random()
        if iso in ("2026-10-03",):
            days[iso] = {"kind": "feiertag", "source": "holiday", "note": "Tag der Deutschen Einheit"}
        elif date(2026, 8, 10) <= d <= date(2026, 8, 21):
            days[iso] = {"kind": "urlaub", "source": "card"}
        elif r < 0.03:
            days[iso] = {"kind": "krank", "source": "card"}
        else:
            end = ["16:15", "16:00", "16:30", "15:45", "17:00"][random.randrange(5)] if wd < 5 else "12:00"
            days[iso] = {"kind": "work", "start": "06:30", "end": end, "source": random.choice(["calendar", "calendar", "stamp"]), "note": random.choice(NOTES)}
            if not days[iso]["note"]:
                del days[iso]["note"]
    elif wd == 6 and random.random() < 0.08:
        days[iso] = {"kind": "pauschal", "start": "08:00", "end": "12:00", "amount": 40.0, "source": "card", "note": "Samstag Notdienst"}
    d += timedelta(days=1)
days["2026-11-03"] = {"kind": "work", "start": "06:30", "end": "16:15", "source": "calendar", "note": "Musterstadt – Terrasse"}
days.pop("2026-11-04", None)
months = compute_months(days, {"2026-07": {"adjust": -10, "note": "10 Std. ausgezahlt"}}, st, TODAY)
snap = {
    "version": json.loads(Path("custom_components/stundenzettel/manifest.json").read_text())["version"],
    "settings": st, "days": {k: {**v, **day_hours(v, st)} for k, v in days.items()}, "months": months,
    "months_meta": {"2026-07": {"adjust": -10, "note": "10 Std. ausgezahlt"}}, "stamp": {"in": "06:30", "date": "2026-11-04", "ts": 0},
    "log": [{"ts": 1793770200000, "user": "Max", "text": "⏱️ Eingestempelt um 06:30"}], "errors": [], "today": TODAY.isoformat(),
    "cal": {"ok": True, "last": 1793780100000, "error": None, "can": ["create", "delete"]},
}
cur = months[-1]
snap["summary"] = {"balance": cur["now"], "month_hours": cur["hours"], "month_paid": cur["paid"], "last_month_total": months[-2]["total"],
                   "vacation_taken": 10, "vacation_left": 20, "sick_days": sum(m["krank"] for m in months), "long_days": 0,
                   "stamped_in": True, "stamp_since": "06:30", "today": None, "days": len(days)}
Path("tests/ui/demo.json").write_text(json.dumps(snap, ensure_ascii=False, indent=1))
print("ok", len(days), "Tage, Konto heute", cur["now"])
