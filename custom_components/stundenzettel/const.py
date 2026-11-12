"""Feste Werte für den Stundenzettel. ⏱️"""

from __future__ import annotations

import json
from pathlib import Path

DOMAIN = "stundenzettel"
VERSION: str = json.loads((Path(__file__).parent / "manifest.json").read_text(encoding="utf-8"))["version"]

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

STATIC_URL = "/stundenzettel/files"
CARD_FILENAME = "stundenzettel-card.js"
PANEL_FILENAME = "stundenzettel-panel.js"
PANEL_URL_PATH = "stundenzettel"

APP_URL = "/stundenzettel/app/"
PIN_OFF_ITER = 100_000  # 📴 Runden für den Offline-Schlüssel der PIN (PBKDF2) – Karte rechnet ohne Netz genauso nach

CONF_SIDEBAR = "sidebar"
CONF_ENTRY = "stundenzettel"  # 👥 Feld in den Aktionen: welcher Stundenzettel
CONF_NAME = "name"
SIGNAL_UPDATE = f"{DOMAIN}_update"

# 📅 Was für ein Tag war das?
#   work     = gearbeitet (von–bis, Pause wird abgezogen)
#   urlaub   = Urlaub (zählt „Stunden pro Abwesenheitstag“)
#   krank    = krank (zählt genauso)
#   feiertag = Feiertag (zählt genauso)
#   frei     = frei / Wochenende / Überstunden abgebummelt (zählt 0)
#   pauschal = extra bezahlt (z. B. Samstag mit fester Summe) – zählt NICHT zu den Stunden
KINDS = ("work", "urlaub", "krank", "feiertag", "frei", "pauschal")
ABSENCE_KINDS = ("urlaub", "krank", "feiertag")

DEFAULT_SETTINGS: dict = {
    # ⏱️ Arbeitszeit
    "paid_hours": 175.0,        # 💶 so viele Stunden bezahlt der Chef pro Monat (Soll)
    "paid_until": [],           # 🗓️ früher anders? [{"until": "2019-12", "hours": 160}] – gilt BIS einschließlich diesem Monat
    "paid_periods": [],         # 🗓️ früher anders? [{"from": "2012-03", "hours": 160}] – gilt ab diesem Monat
    "pause_by": "dauer",        # ☕ Pause nach „dauer“ (Stunden da) oder „ende“ (Uhrzeit beim Gehen)
    "pause_rules": [            # ☕ Pause automatisch: ab MEHR als „from“ Std. Anwesenheit → „pause“ Std. abziehen
        {"from": 0, "pause": 0.25},
        {"from": 6, "pause": 0.5},
    ],
    "absence_hours": 8.0,       # 🏖️ so viele Stunden zählt ein Urlaubs-, Kranken- oder Feiertag
    "round": 15,                # 🔄 Stempelzeiten auf 15 Minuten runden (0 = gar nicht)
    "long_day": 8.0,            # 🥪 „8 Stunden und →“: Tage, an denen man mindestens so lange weg war
    "vacation_days": 30,        # 🏖️ Urlaubsanspruch pro Jahr
    "vacation_carry": {},       # 🧳 Resturlaub aus dem Vorjahr je Jahr, z. B. {"2026": 9}
    "start_balance": 0.0,       # 🐷 Überstunden-Stand, bevor es mit der Karte losging
    "plan": {                   # 📋 normaler Tag je Wochentag (1 = Montag … 7 = Sonntag) – Vorschlag & Kalender-Vorlage
        "1": ["06:30", "16:15"], "2": ["06:30", "16:15"], "3": ["06:30", "16:15"], "4": ["06:30", "16:15"], "5": ["06:30", "12:00"],
    },
    # 📅 Kalender
    "calendar": "",             # z. B. calendar.termine
    "event_title": "Arbeiten",  # so heißt der Termin
    "location": "",             # Ort im Termin (leer = keiner)
    "cal_read": True,           # 📥 Termine „Arbeiten“ in die Liste übernehmen
    "cal_write": False,         # 📤 Änderungen aus der Karte in den Kalender schreiben
    "holiday_calendar": "",     # 🎌 z. B. calendar.feiertage_in_deutschland → Feiertage automatisch
    # 📍 Stempeln per Handy
    "stamp_person": "",         # z. B. person.max
    "stamp_zone": "",           # z. B. zone.arbeit
    # 👁️ Ansicht
    "labels": False,
    "log_on": True,
    "mascot": False,            # ⏰ Maskottchen (Wecker) oben links – Standard aus, wie bei den anderen Karten
    "veil": False,
    "payslip_hint": True,       # 💶 am Monatsanfang erinnern: „Lohnabrechnung da? Ü.-Alt eintragen“              # 🙈 Überstunden & Summen verschleiern (antippen = kurz zeigen)
    "view": {},                 # 👁️ Reiter ausblenden: {"monat": False} / {"jahr": False} / {"stat": False}
    # 🔒 Schutz
    "lock_edit": False,         # ✏️ Ändern (Tage, Stempeln, Monat) nur nach PIN
    "lock_all": False,          # ganze Karte mit PIN sperren (sonst nur ⚙️)
}

READ_BACK_DAYS = 40   # 📥 so viele Tage schaut der Kalender-Abgleich zurück
SYNC_MINUTES = 15     # 🔁 alle 15 Minuten abgleichen
MAX_LOG = 300
MAX_SEEN_OPS = 3000
MAX_IMPORT_CHARS = 3_000_000
