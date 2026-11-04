"""🧠 Das Gehirn vom Stundenzettel: merkt sich jeden Tag und rechnet das Überstunden-Konto aus.

So wird gerechnet (für Doofe 😄):
1. Arbeitstag: (Ende − Anfang) − Pause = Stunden. Die Pause kommt automatisch aus den Pausen-Regeln
   (z. B. mehr als 6 Std. da → 0,50 Std. Pause), außer du trägst selbst eine ein.
2. Urlaub, Krank, Feiertag zählen „Stunden pro Abwesenheitstag“ (Standard 8).
3. Frei zählt 0. „Pauschal“ (z. B. Samstag für feste Euro) zählt gar nicht zu den Stunden.
4. Pro Monat: Summe − bezahlte Stunden (Soll, z. B. 175) = Plus/Minus des Monats.
5. Überstunden-Konto = Stand vom Vormonat (Ü.-Alt) + Plus/Minus + Korrektur = Ü.-Gesamt.
   Monate ganz ohne Einträge zählen nicht mit (sonst gäbe es für Lücken riesige Minusstunden).

Woher kommen die Tage?
- 📅 aus dem Kalender (Termin „Arbeiten“ mit Anfang und Ende) – wenn eingeschaltet,
- 📍 vom Stempeln (Knopf in der Karte oder automatisch, wenn das Handy in die Zone „Arbeit“ kommt/geht),
- ✍️ von Hand in der Karte,
- 📥 aus dem Import (alte Tabelle als Text einfügen).
Was du in der Karte selbst änderst, überschreibt der Kalender nie wieder (der Tag ist dann „von Hand“).
"""

from __future__ import annotations

import calendar as pycal
import hashlib
import hmac
import logging
import re
import secrets
import time
import uuid
from collections.abc import Callable
from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_state_change_event, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    APP_URL,
    PIN_OFF_ITER,
    ABSENCE_KINDS,
    DEFAULT_SETTINGS,
    KINDS,
    MAX_IMPORT_CHARS,
    MAX_LOG,
    MAX_SEEN_OPS,
    READ_BACK_DAYS,
    SIGNAL_UPDATE,
    STORAGE_KEY,
    STORAGE_VERSION,
    SYNC_MINUTES,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)

KIND_NAMES = {"work": "Arbeit", "urlaub": "Urlaub", "krank": "Krank", "feiertag": "Feiertag", "frei": "Frei", "pauschal": "Pauschal"}
_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
# 🧾 Die Zeile, die viele Kalender-Automationen in den Termin schreiben: „[9,25 Stunden (+0,50 h Pause)]“
_DESC_RE = re.compile(r"\[\s*([\d.,]+)\s*Stunden?\s*\(\s*\+\s*([\d.,]+)\s*h\s*Pause\s*\)\s*\]", re.I)


def r2(v: float) -> float:
    return round(float(v) + 0.0, 2)


def num(value: Any, default: float | None = None) -> float | None:
    """„9,25“, „9.25“, 9.25 → 9.25 · leer → default."""
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        raise HomeAssistantError(f"„{value}“ ist keine Zahl")
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("−", "-").replace(" ", "").replace("€", "").replace("Euro", "").replace("euro", "")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError as err:
        raise HomeAssistantError(f"„{value}“ ist keine Zahl") from err


def de_num(v: float) -> str:
    return f"{v:.2f}".replace(".", ",")


def minutes(t: str | None) -> int | None:
    """„06:30“ → 390 Minuten seit Mitternacht."""
    if not t:
        return None
    m = _TIME_RE.match(str(t).strip())
    if not m:
        raise HomeAssistantError(f"„{t}“ ist keine Uhrzeit (so geht's: 06:30)")
    h, mi = int(m.group(1)), int(m.group(2))
    if h > 24 or mi > 59 or (h == 24 and mi):
        raise HomeAssistantError(f"„{t}“ ist keine Uhrzeit")
    return h * 60 + mi


def hhmm(mins: int) -> str:
    return f"{mins // 60:02d}:{mins % 60:02d}"


def auto_pause(brutto: float, rules: list[dict[str, Any]]) -> float:
    """☕ Pause aus den Regeln: die größte Pause, deren Grenze überschritten ist."""
    best = 0.0
    for r in rules or []:
        try:
            if brutto > float(r.get("from", 0)) + 1e-9:
                best = max(best, float(r.get("pause", 0)))
        except (TypeError, ValueError):
            continue
    return best


def day_hours(entry: dict[str, Any], st: dict[str, Any]) -> dict[str, float]:
    """⏱️ Was zählt ein Tag? → {hours, brutto, pause}"""
    kind = entry.get("kind", "work")
    if kind == "work":
        a, b = minutes(entry.get("start")), minutes(entry.get("end"))
        if a is None or b is None:
            return {"hours": 0.0, "brutto": 0.0, "pause": 0.0}
        if b < a:  # 🌙 über Mitternacht
            b += 24 * 60
        brutto = (b - a) / 60
        pause = entry.get("pause")
        if pause is None:  # ☕ nach Regel: Dauer („mehr als 6 Std. da“) oder Uhrzeit beim Gehen („nach 12 Uhr“)
            pause = auto_pause(b / 60 if st.get("pause_by") == "ende" else brutto, st.get("pause_rules"))
        else:
            pause = float(pause)
        return {"hours": r2(max(0.0, brutto - pause)), "brutto": r2(brutto), "pause": r2(pause)}
    if kind in ABSENCE_KINDS:
        h = entry.get("hours")
        return {"hours": r2(float(st.get("absence_hours", 8)) if h is None else float(h)), "brutto": 0.0, "pause": 0.0}
    return {"hours": 0.0, "brutto": 0.0, "pause": 0.0}


def paid_for(month: str, st: dict[str, Any]) -> float:
    """💶 Soll eines Monats: der neueste Zeitraum, der vor/in diesem Monat anfängt – sonst das normale Soll."""
    for p in sorted((p for p in st.get("paid_until") or [] if _MONTH_RE.match(str(p.get("until", "")))), key=lambda p: p["until"]):
        if month <= p["until"]:  # 🗓️ „bis Dezember 2019: 160“ – der früheste passende Zeitraum gewinnt
            return float(p.get("hours", 0))
    best = None
    for p in st.get("paid_periods") or []:
        f = str(p.get("from", ""))
        if _MONTH_RE.match(f) and f <= month and (best is None or f > best[0]):
            best = (f, float(p.get("hours", 0)))
    return float(best[1]) if best else float(st.get("paid_hours", 0))


def workdays(year: int, month: int, st: dict[str, Any], upto: int | None = None) -> int:
    """📋 Wie viele normale Arbeitstage (laut Plan) hat der Monat – bzw. bis zum Tag „upto“?"""
    plan = st.get("plan") or {}
    last = pycal.monthrange(year, month)[1] if upto is None else upto
    return sum(1 for d in range(1, last + 1) if str(date(year, month, d).isoweekday()) in plan)


def compute_months(days: dict[str, dict[str, Any]], months_meta: dict[str, dict[str, Any]], st: dict[str, Any], today: date) -> list[dict[str, Any]]:
    """📊 Alle Monate vom ersten Eintrag bis heute – genau wie auf dem Papier-Zettel."""
    by_month: dict[str, list[tuple[str, dict[str, Any]]]] = {}
    for iso, e in days.items():
        by_month.setdefault(iso[:7], []).append((iso, e))
    cur = today.strftime("%Y-%m")
    keys = sorted(set(by_month) | {k for k in months_meta if _MONTH_RE.match(k)} | ({cur} if by_month else set()))
    if not keys:
        return []
    first, last = keys[0], max(keys[-1], cur)
    out: list[dict[str, Any]] = []
    bal = float(st.get("start_balance") or 0)
    y, m = int(first[:4]), int(first[5:7])
    long_day = float(st.get("long_day") or 0)
    while f"{y:04d}-{m:02d}" <= last:
        key = f"{y:04d}-{m:02d}"
        items = by_month.get(key, [])
        meta = months_meta.get(key) or {}
        tot = 0.0
        cnt = {k: 0 for k in KINDS}
        long_n, euro = 0, 0.0
        for _iso, e in items:
            h = day_hours(e, st)
            tot += h["hours"]
            cnt[e.get("kind", "work")] = cnt.get(e.get("kind", "work"), 0) + 1
            if e.get("kind", "work") == "work" and long_day and h["hours"] + 1e-9 >= long_day:  # 🥪 wie auf dem Zettel: ohne Pause gerechnet
                long_n += 1
            if e.get("kind") == "pauschal":
                euro += float(e.get("amount") or 0)
        future = key > cur  # 🔮 Monat kommt erst noch (z. B. schon eingetragener Urlaub) → anzeigen, aber nicht ins Konto
        sheet = meta.get("sheet") if isinstance(meta.get("sheet"), dict) and key < cur else None  # 📥 Werte 1:1 aus dem alten Zettel
        alt = None if future else num(meta.get("alt"))  # 💶 Ü.-Alt laut Lohnabrechnung
        calc_hours, calc_long = tot, long_n
        if sheet:
            if num(sheet.get("sum")) is not None:
                tot = float(sheet["sum"])
            if num(sheet.get("long")) is not None:
                long_n = int(sheet["long"])
        tracked = (bool(items) or "adjust" in meta or alt is not None or bool(sheet) or key == cur) and not future
        soll = paid_for(key, st) if (items or key == cur or meta.get("paid") is not None) else 0.0
        if meta.get("paid") is not None:
            soll = float(meta["paid"])
        if future:
            soll = 0.0
        diff = tot - soll
        adjust = 0.0 if future else float(meta.get("adjust") or 0)
        calc_old = bal
        old = alt if alt is not None else bal
        calc_total = old + diff + adjust
        if sheet and num(sheet.get("ges")) is not None:
            calc_total = float(sheet["ges"])  # 🧾 genau die Zahl vom Zettel (auch wenn er sich mal verrechnet hat)
        bal = calc_total if tracked else bal
        row = {
            "month": key, "hours": r2(tot), "paid": r2(soll), "diff": r2(diff), "adjust": r2(adjust),
            "old": r2(old), "total": r2(bal), "urlaub": cnt["urlaub"], "krank": cnt["krank"], "feiertag": cnt["feiertag"],
            "work": cnt["work"], "long": long_n, "euro": r2(euro), "days": len(items), "tracked": tracked, "note": meta.get("note", ""),
            "future": future, "alt": alt is not None, "calc_old": r2(calc_old), "sheet": bool(sheet),
            "calc_hours": r2(calc_hours), "calc_long": calc_long,
        }
        if key == cur:  # 📍 laufender Monat: Soll nur anteilig bis heute → „Konto heute“
            wd_all = workdays(y, m, st) or 1
            wd_now = workdays(y, m, st, today.day)
            soll_now = soll * wd_now / wd_all
            row["paid_today"] = r2(soll_now)
            row["now"] = r2(old + tot - soll_now + adjust)
        out.append(row)
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def desc_line(hours: float, pause: float) -> str:
    return f"[{de_num(hours)} Stunden (+{de_num(pause)} h Pause)]"


def parse_desc(desc: str | None) -> tuple[str, float | None]:
    """🧾 Termin-Beschreibung → (Notiz ohne die Stunden-Zeile, Pause oder None)."""
    text = str(desc or "")
    m = _DESC_RE.search(text)
    pause = None
    if m:
        try:
            pause = float(m.group(2).replace(",", "."))
        except ValueError:
            pause = None
        text = (text[: m.start()] + text[m.end():])
    note = "\n".join(line.rstrip() for line in text.strip().splitlines() if line.strip())
    return note, pause


# 📥 Import: „15.03.2012  7:00 - 17:00  9,5“ · „02.08.2012 Urlaub 8“ · „14.04.2012 8:00 - 11:00 33,00 Euro“
_IMP_RE = re.compile(
    r"(?P<d>\d{1,2})\.(?P<m>\d{1,2})\.(?P<y>\d{4})[ \t;,]+"
    r"(?:(?P<a>\d{1,2})[:.](?P<am>\d{2})\s*(?:-|–|bis)\s*(?P<b>\d{1,2})[:.](?P<bm>\d{2})"
    r"|(?P<w>[A-Za-zÄÖÜäöüß]+))"
    r"(?:[ \t;,]+(?P<h>-?\d+(?:[.,]\d+)?)(?:\s*(?P<eur>Euro|EUR|€))?)?"
)
_IMP_WORDS = {"urlaub": "urlaub", "krank": "krank", "feiertag": "feiertag", "frei": "frei", "ueberstunden": "frei", "überstunden": "frei"}


def parse_import(text: str) -> tuple[dict[str, dict[str, Any]], int]:
    """Text (aus PDF, Tabelle oder CSV) → {datum: eintrag}, Anzahl übersprungen."""
    found: dict[str, dict[str, Any]] = {}
    skipped = 0
    for mt in _IMP_RE.finditer(text):
        try:
            dd = date(int(mt["y"]), int(mt["m"]), int(mt["d"]))
            if not 1980 <= dd.year <= date.today().year + 2:  # 🤓 Tippfehler wie „3014“ statt „2014“ überspringen
                raise ValueError
            iso = dd.isoformat()
        except ValueError:
            skipped += 1
            continue
        h = float(mt["h"].replace(",", ".")) if mt["h"] else None
        if mt["a"]:
            start, end = hhmm(int(mt["a"]) * 60 + int(mt["am"])), hhmm(int(mt["b"]) * 60 + int(mt["bm"]))
            if mt["eur"]:
                e = {"kind": "pauschal", "start": start, "end": end, "amount": h or 0.0}
            else:
                e = {"kind": "work", "start": start, "end": end}
                if h is not None:
                    a, b = minutes(start), minutes(end)
                    if b < a:
                        b += 1440
                    e["pause"] = r2(max(0.0, (b - a) / 60 - h))  # 🧮 alte Werte genau so übernehmen, wie sie auf dem Zettel stehen
        else:
            w = mt["w"].lower()
            kind = _IMP_WORDS.get(w)
            if kind is None:
                skipped += 1  # z. B. „Wochenende“ → braucht keinen Eintrag
                continue
            e = {"kind": kind}
            if kind in ABSENCE_KINDS and h is not None:
                e["hours"] = h
        if iso in found:  # zwei Zeilen am selben Tag (z. B. 7–10:45 und 11:30–16) → zusammenfassen
            old = found[iso]
            if old.get("kind") == "work" and e.get("kind") == "work":
                a1, b1, a2, b2 = minutes(old["start"]), minutes(old["end"]), minutes(e["start"]), minutes(e["end"])
                gap = max(0, a2 - b1) / 60
                old["start"], old["end"] = hhmm(min(a1, a2)), hhmm(max(b1, b2))
                old["pause"] = r2(float(old.get("pause") or 0) + float(e.get("pause") or 0) + gap)
                continue
        found[iso] = e
    return found, skipped


_MONTH_SHORT = {"jan": 1, "feb": 2, "mär": 3, "mae": 3, "mar": 3, "apr": 4, "mai": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "okt": 10, "nov": 11, "dez": 12}


def _month_no(text: str) -> int | None:
    """„Oktober“, „Okt.“ oder auch vertippt „Septem“ → 10 / 9 (die ersten drei Buchstaben reichen)."""
    t = text.strip().lower().rstrip(".")
    return _MONTH_SHORT.get(t[:3]) if 3 <= len(t) <= 10 and t.isalpha() else None


def parse_import_months(text: str) -> dict[str, dict[str, float]]:
    """🧾 Monatswerte aus der alten Tabelle (Strg+A aus Google Sheets/Excel = Spalten mit Tabs).

    Pro Monatsblock: Überschrift „Oktober | 2026“, darunter die Tage, dann Summe, „Bezahlt“,
    „Ü.-Alt“, „Ü.-Gesamt“, „Urlaubstage“, „Kranktage“, „8 Stunden und ->“ – jeweils zwei Spalten weiter rechts die Zahl.
    """
    if "\t" not in text:
        return {}
    grid = [line.split("\t") for line in text.splitlines()]

    def cell(r: int, c: int) -> str:
        return grid[r][c].strip() if 0 <= r < len(grid) and 0 <= c < len(grid[r]) else ""

    def val(r: int, c: int) -> float | None:
        try:
            return num(cell(r, c))
        except HomeAssistantError:
            return None

    labels = {"ü.-alt": "alt", "ü.-gesamt": "ges", "urlaubstage": "urlaub", "kranktage": "krank"}
    out: dict[str, dict[str, float]] = {}
    for r, row in enumerate(grid):
        for c, x in enumerate(row):
            mon = _month_no(x)
            year = cell(r, c + 1)
            if not mon or not (year.isdigit() and len(year) == 4):
                continue
            key = f"{year}-{mon:02d}"
            vals: dict[str, float] = {}
            for rr in range(r + 1, min(r + 70, len(grid))):
                lab = cell(rr, c).lower()
                if _month_no(lab) and cell(rr, c + 1).isdigit():
                    break  # nächster Monatsblock
                if lab == "bezahlt" and "sum" not in vals:
                    v = val(rr - 1, c + 2)
                    if v is not None:
                        vals["sum"] = v
                if lab in labels:
                    v = val(rr, c + 2)
                    if v is not None:
                        vals[labels[lab]] = v
                elif lab.startswith("8 stunden") or lab.startswith("8 std"):
                    v = val(rr, c + 2)
                    if v is not None:
                        vals["long"] = v
            if "alt" in vals or "ges" in vals:
                out[key] = vals
    return out


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def _empty() -> dict[str, Any]:
    return {"days": {}, "months": {}, "settings": dict(DEFAULT_SETTINGS), "stamp": None, "log": [], "seen": [],
            "pin": None, "pin_off": None}  # 🔒 PIN nur als Prüfsumme · 📴 Offline-Schlüssel (PBKDF2) für die Karte ohne Netz


def _cal_entity(hass: HomeAssistant, entity_id: str):
    """📅 Das Kalender-Objekt in HA (für lesen MIT Termin-Nummer, ändern und löschen)."""
    comp = None
    try:
        from homeassistant.components.calendar import DATA_COMPONENT  # noqa: PLC0415

        comp = hass.data.get(DATA_COMPONENT)
    except ImportError:
        comp = None
    if comp is None:
        comp = hass.data.get("calendar")
    if comp is None or not hasattr(comp, "get_entity"):
        return None
    return comp.get_entity(entity_id)


def _local(v: Any) -> datetime | None:
    if isinstance(v, datetime):
        return dt_util.as_local(v) if v.tzinfo else v.replace(tzinfo=dt_util.get_default_time_zone())
    return None


class StundenzettelManager:
    """Speichert alles und schickt der Karte bei jeder Änderung den neuen Stand."""

    def __init__(self, hass: HomeAssistant, entry_id: str = "", title: str = "Stundenzettel") -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.title = title
        self.store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.data: dict[str, Any] = _empty()
        self._listeners: list[Callable[[], None]] = []
        self._unsubs: list[Callable[[], None]] = []
        self._writing: set[str] = set()
        self._dirty_cal: set[str] = set()
        self.cal_status: dict[str, Any] = {"ok": None, "last": None, "error": None, "can": []}
        self.errors: list[dict[str, Any]] = []
        self._snap_cache: tuple[int, dict[str, Any]] | None = None
        self._rev = 0
        self._pin_fails = 0
        self._pin_locked_until = 0.0

    # ------------------------------------------------------------------ 💾 Laden & Speichern
    async def async_load(self) -> None:
        raw = await self.store.async_load()
        d = _empty()
        if isinstance(raw, dict):
            d.update({k: raw[k] for k in d if k in raw})
            d["settings"] = {**DEFAULT_SETTINGS, **(raw.get("settings") or {})}
        self.data = d

    def _save(self) -> None:
        self._rev += 1
        self.store.async_delay_save(lambda: self.data, 1.0)
        self._notify()

    async def async_save_now(self) -> None:
        await self.store.async_save(self.data)

    @property
    def settings(self) -> dict[str, Any]:
        return self.data["settings"]

    # ------------------------------------------------------------------ 📣 Wer will Bescheid wissen?
    def add_listener(self, fn: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(fn)

        def remove() -> None:
            if fn in self._listeners:
                self._listeners.remove(fn)

        return remove

    @callback
    def _notify(self) -> None:
        for fn in list(self._listeners):
            try:
                fn()
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Stundenzettel: Karte konnte nicht benachrichtigt werden")
        async_dispatcher_send(self.hass, SIGNAL_UPDATE)

    def _err(self, text: str) -> None:
        self.errors.insert(0, {"ts": int(time.time() * 1000), "text": text})
        del self.errors[50:]
        _LOGGER.warning("Stundenzettel: %s", text)

    def _log(self, user: str | None, text: str) -> None:
        if self.settings.get("log_on") is False:
            return
        self.data["log"].insert(0, {"ts": int(time.time() * 1000), "user": user or "", "text": text})
        del self.data["log"][MAX_LOG:]

    # ------------------------------------------------------------------ ⏰ Start & Stopp
    @callback
    def async_start(self) -> None:
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, timedelta(minutes=SYNC_MINUTES)))
        self._watch_person()
        self.hass.async_create_task(self._first_sync())

    async def _first_sync(self, tries: int = 0) -> None:
        """🔁 Erster Abgleich nach dem Start: Kalender ist beim HA-Start oft noch nicht da – dann bis zu 5× jede Minute nochmal."""
        await self.async_sync()
        if self.cal_status.get("ok") is False and tries < 5:
            async def _again(_now: datetime) -> None:
                await self._first_sync(tries + 1)
            self._unsubs.append(async_call_later(self.hass, 60, _again))

    @callback
    def async_stop(self) -> None:
        for u in self._unsubs:
            u()
        self._unsubs.clear()

    async def _tick(self, _now: datetime | None = None) -> None:
        await self.async_sync()
        self._notify()  # 🕒 „Konto heute“ ändert sich auch ohne neue Einträge (neuer Tag)

    def _watch_person(self) -> None:
        if getattr(self, "_person_unsub", None):
            self._person_unsub()
            self._person_unsub = None
        person = self.settings.get("stamp_person")
        if not person or not self.settings.get("stamp_zone"):
            return
        self._person_unsub = async_track_state_change_event(self.hass, [person], self._person_changed)
        self._unsubs.append(lambda: self._person_unsub() if self._person_unsub else None)

    def _zone_state(self) -> str | None:
        """📍 Welchen Zustand hat die Person, wenn sie in der Zone ist? (zone.home → „home“, sonst der Zonen-Name)"""
        z = self.settings.get("stamp_zone")
        if not z:
            return None
        if z == "zone.home":
            return "home"
        st = self.hass.states.get(z)
        return (st.attributes.get("friendly_name") if st else None) or z.split(".", 1)[-1]

    @callback
    def _person_changed(self, event: Event) -> None:
        zone = self._zone_state()
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if not zone or new is None:
            return
        was, now = (old.state if old else None), new.state
        if was != zone and now == zone:
            self._stamp_in(None, "📍 Automatisch eingestempelt (Zone)")
        elif was == zone and now != zone:
            self._stamp_out(None, "📍 Automatisch ausgestempelt (Zone)")
        else:
            return
        self._save()

    # ------------------------------------------------------------------ 🧮 Rechnen
    def today(self) -> date:
        return dt_util.now().date()

    def months(self) -> list[dict[str, Any]]:
        return compute_months(self.data["days"], self.data["months"], self.settings, self.today())

    def summary(self) -> dict[str, Any]:
        months = self.months()
        key = self.today().strftime("%Y-%m")
        idx = next((i for i, m in enumerate(months) if m["month"] == key), None)  # 📍 heute zählt – nicht der letzte Monat mit Einträgen
        cur = months[idx] if idx is not None else None
        year = str(self.today().year)
        ym = [m for m in months if m["month"].startswith(year)]
        urlaub = sum(m["urlaub"] for m in ym)
        carry = float((self.settings.get("vacation_carry") or {}).get(year) or 0)  # 🧳 Resturlaub aus dem Vorjahr
        stamp = self.data.get("stamp")
        today = self.data["days"].get(self.today().isoformat())
        return {
            "balance": cur["now"] if cur and "now" in cur else (cur["total"] if cur else float(self.settings.get("start_balance") or 0)),
            "month_hours": cur["hours"] if cur else 0.0,
            "month_paid": cur["paid"] if cur else 0.0,
            "last_month_total": months[idx - 1]["total"] if idx else None,
            "vacation_taken": urlaub,
            "vacation_carry": carry,
            "vacation_left": r2(int(self.settings.get("vacation_days") or 0) + carry - urlaub),
            "sick_days": sum(m["krank"] for m in ym),
            "long_days": sum(m["long"] for m in ym),
            "stamped_in": bool(stamp),
            "stamp_since": stamp.get("in") if stamp else None,
            "today": {**today, **day_hours(today, self.settings)} if today else None,
            "days": len(self.data["days"]),
        }

    def snapshot(self) -> dict[str, Any]:
        if self._snap_cache and self._snap_cache[0] == self._rev and self._snap_cache[1].get("_day") == self.today().isoformat():
            snap = dict(self._snap_cache[1])
        else:
            days = {iso: {**e, **day_hours(e, self.settings), "pause_set": e.get("pause") is not None} for iso, e in self.data["days"].items()}  # 📝 pause_set: Pause steht wirklich drin (sonst nach Regel)
            snap = {"days": days, "months": self.months(), "_day": self.today().isoformat()}
            self._snap_cache = (self._rev, snap)
            snap = dict(snap)
        snap.update({
            "version": VERSION,
            "settings": self.settings,
            "months_meta": self.data["months"],
            "stamp": self.data.get("stamp"),
            "log": self.data["log"][:100],
            "summary": self.summary(),
            "cal": self.cal_status,
            "errors": self.errors[:20],
            "today": self.today().isoformat(),
            "pin": bool(self.data.get("pin")),
            "pin_off": self.data.get("pin_off") if self.data.get("pin") else None,  # 📴 nie die echte PIN, nur der Offline-Schlüssel
            "app_url": self._app_url(),
        })
        return snap

    def _app_url(self) -> str | None:
        """📱 Adresse der Offline-App von unterwegs (Nabu Casa bzw. externe https-Adresse) – wie bei der Einkaufsliste."""
        try:
            from homeassistant.helpers.network import NoURLAvailableError, get_url  # noqa: PLC0415
        except ImportError:  # pragma: no cover
            return None
        try:
            base = get_url(self.hass, allow_internal=False, allow_ip=False, require_ssl=True, prefer_cloud=True)
        except NoURLAvailableError:
            return None
        except Exception:  # noqa: BLE001
            return None
        return base.rstrip("/") + APP_URL

    # ------------------------------------------------------------------ 🔒 PIN (wie bei Einkaufsliste und Kegelclub)
    @staticmethod
    def _pin_hash(pin: str, salt: str) -> str:
        return salt + "$" + hashlib.sha256((salt + str(pin)).encode()).hexdigest()

    @staticmethod
    def _pin_offline(pin: str) -> dict[str, Any]:
        """📴 Stark verwürfelte PIN, damit die Karte sie ohne Netz selbst prüfen kann (die echte PIN geht nie raus)."""
        salt = secrets.token_hex(16)
        return {"salt": salt, "iter": PIN_OFF_ITER, "hash": hashlib.pbkdf2_hmac("sha256", str(pin).encode(), bytes.fromhex(salt), PIN_OFF_ITER).hex()}

    def check_pin(self, pin: str | None) -> bool:
        """PIN prüfen. 5× falsch = 60 Sekunden Pause (gegen Durchprobieren)."""
        if not self.data.get("pin"):
            return True
        left = self._pin_locked_until - time.monotonic()
        if left > 0:
            raise HomeAssistantError(f"Zu oft falsch – bitte {int(left) + 1} Sekunden warten")
        salt = self.data["pin"].split("$", 1)[0]
        ok = hmac.compare_digest(self._pin_hash(str(pin or ""), salt), self.data["pin"])
        if ok:
            self._pin_fails = 0
            if not self.data.get("pin_off"):
                self.data["pin_off"] = self._pin_offline(str(pin))
                self._save()
        else:
            self._pin_fails += 1
            if self._pin_fails >= 5:
                self._pin_fails = 0
                self._pin_locked_until = time.monotonic() + 60
        return ok

    def set_pin(self, pin: str | None, old: str | None = None, user: str | None = None) -> None:
        if self.data.get("pin") and not self.check_pin(old):
            raise HomeAssistantError("Die alte PIN stimmt nicht")
        pin = (pin or "").strip()
        if pin and not re.fullmatch(r"\d{4,8}", pin):
            raise HomeAssistantError("Die PIN muss 4 bis 8 Ziffern haben")
        self.data["pin"] = self._pin_hash(pin, secrets.token_hex(8)) if pin else None
        self.data["pin_off"] = self._pin_offline(pin) if pin else None
        self._log(user, "🔒 PIN festgelegt" if pin else "🔓 PIN ausgeschaltet")
        self._save()

    def clear_pin(self) -> None:
        self.data["pin"] = None
        self.data["pin_off"] = None
        self._pin_fails = 0
        self._pin_locked_until = 0.0
        self._log(None, "🔓 PIN zurückgesetzt (Geräte & Dienste)")
        self._save()

    # ------------------------------------------------------------------ ✍️ Änderungen
    def apply(self, ops: list[dict[str, Any]], user: str | None = None) -> list[dict[str, Any]]:
        results = []
        changed = False
        seen = self.data["seen"]
        for op in ops:
            oid = op.get("op_id")
            if oid and oid in seen:
                results.append({"op_id": oid, "ok": True, "dup": True})
                continue
            try:
                self._apply_one(op, user)
                results.append({"op_id": oid, "ok": True})
                changed = True
                if oid:
                    seen.append(oid)
            except HomeAssistantError as err:
                results.append({"op_id": oid, "ok": False, "error": str(err)})
            except (KeyError, TypeError, ValueError) as err:
                results.append({"op_id": oid, "ok": False, "error": f"Ungültige Änderung ({err})"})
        del seen[:-MAX_SEEN_OPS]
        if changed:
            self._save()
            self._flush_calendar()
        return results

    def _clean_day(self, op: dict[str, Any]) -> dict[str, Any]:
        kind = op.get("kind", "work")
        if kind not in KINDS:
            raise HomeAssistantError(f"Unbekannte Art „{kind}“")
        e: dict[str, Any] = {"kind": kind, "source": op.get("source", "card")}
        if kind in ("work", "pauschal"):
            a, b = minutes(op.get("start")), minutes(op.get("end"))
            if kind == "work" and (a is None or b is None):
                raise HomeAssistantError("Bitte Anfang und Ende eintragen")
            if a is not None:
                e["start"] = hhmm(a)
            if b is not None:
                e["end"] = hhmm(b)
        if kind == "work" and op.get("pause") not in (None, ""):
            p = num(op.get("pause"))
            if p is None or p < 0 or p > 12:
                raise HomeAssistantError("Die Pause muss zwischen 0 und 12 Stunden liegen")
            e["pause"] = r2(p)
        if kind in ABSENCE_KINDS and op.get("hours") not in (None, ""):
            e["hours"] = r2(num(op["hours"]) or 0)
        if kind == "pauschal":
            e["amount"] = r2(num(op.get("amount"), 0) or 0)
        note = str(op.get("note") or "").strip()[:500]
        if note:
            e["note"] = note
        return e

    def _apply_one(self, op: dict[str, Any], user: str | None) -> None:
        t = op.get("type")
        days = self.data["days"]
        st = self.settings
        if t == "day_set":
            iso = str(op.get("date", ""))
            if not _DATE_RE.match(iso):
                raise HomeAssistantError("Datum fehlt (so geht's: 2026-11-04)")
            date.fromisoformat(iso)
            e = self._clean_day(op)
            old = days.get(iso)
            if old and old.get("event_uid"):
                e["event_uid"] = old["event_uid"]
            days[iso] = e
            self._log(user, f"✍️ {iso}: {KIND_NAMES[e['kind']]}" + (f" {e.get('start')}–{e.get('end')}" if e["kind"] == "work" else ""))
            self._dirty_cal.add(iso)
        elif t == "day_delete":
            iso = str(op.get("date", ""))
            if days.pop(iso, None) is not None:
                self._log(user, f"🗑️ {iso} gelöscht")
                self._dirty_cal.add(iso)
        elif t == "stamp_in":
            self._stamp_in(op.get("ts"), "⏱️ Eingestempelt", user)
        elif t == "stamp_out":
            self._stamp_out(op.get("ts"), "⏱️ Ausgestempelt", user)
        elif t == "stamp_cancel":
            self.data["stamp"] = None
            self._log(user, "⏱️ Stempeln abgebrochen")
        elif t == "set":
            key = op.get("key")
            if key not in DEFAULT_SETTINGS:
                raise HomeAssistantError(f"Unbekannte Einstellung „{key}“")
            st[key] = self._clean_setting(key, op.get("value"))
            if key in ("stamp_person", "stamp_zone"):
                self._watch_person()
            if key in ("calendar", "event_title", "cal_read", "holiday_calendar"):
                self.hass.async_create_task(self.async_sync())
        elif t == "month_set":
            key = str(op.get("month", ""))
            if not _MONTH_RE.match(key):
                raise HomeAssistantError("Monat fehlt (so geht's: 2026-11)")
            meta = dict(self.data["months"].get(key) or {})
            if "sheet" in op and not op.get("sheet"):
                meta.pop("sheet", None)  # 🧮 „Mit Karte neu rechnen“
            for f in ("adjust", "paid", "alt"):
                if f in op:
                    v = num(op[f])
                    if v is None:
                        meta.pop(f, None)
                    else:
                        meta[f] = r2(v)
            if "note" in op:
                meta["note"] = str(op.get("note") or "").strip()[:300]
                if not meta["note"]:
                    meta.pop("note")
            if meta:
                self.data["months"][key] = meta
            else:
                self.data["months"].pop(key, None)
            self._log(user, f"🗓️ {key}: Korrektur {de_num(meta.get('adjust', 0))} Std." + (f" · Ü.-Alt laut Lohnabrechnung {de_num(meta['alt'])}" if "alt" in meta else ""))
        elif t == "balance_fix":
            # 🎯 „Laut Zettel stand das Konto Ende Monat X bei Y“ → Korrektur so setzen, dass es passt
            key = str(op.get("month", ""))
            want = num(op.get("value"))
            if not _MONTH_RE.match(key) or want is None:
                raise HomeAssistantError("Monat und Stand angeben")
            row = next((m for m in self.months() if m["month"] == key), None)
            if row is None:
                raise HomeAssistantError(f"Für {key} gibt es keine Einträge")
            meta = dict(self.data["months"].get(key) or {})
            if row.get("sheet"):  # 📥 Monat kommt 1:1 vom alten Zettel → dort die Zahl ersetzen
                meta["sheet"] = {**meta["sheet"], "ges": r2(want)}
            else:
                meta["adjust"] = r2(float(meta.get("adjust") or 0) + want - row["total"])
            self.data["months"][key] = meta
            self._log(user, f"🎯 {key}: Konto auf {de_num(want)} Std. gestellt")
        elif t == "clear_log":
            self.data["log"] = []
        else:
            raise HomeAssistantError(f"Unbekannte Änderung „{t}“")
        self._rev += 1

    def _clean_setting(self, key: str, value: Any) -> Any:
        default = DEFAULT_SETTINGS[key]
        if isinstance(default, bool):
            return bool(value)
        if isinstance(default, (int, float)):
            v = num(value, 0) or 0.0
            if v < -10000 or v > 10000:
                raise HomeAssistantError("Die Zahl ist zu groß")
            return int(v) if isinstance(default, int) else r2(v)
        if key == "pause_rules":
            rules = []
            for r in value or []:
                rules.append({"from": r2(num(r.get("from"), 0) or 0), "pause": r2(num(r.get("pause"), 0) or 0)})
            return sorted(rules, key=lambda r: r["from"])[:10]
        if key == "paid_periods":
            out = []
            for p in value or []:
                f = str(p.get("from", ""))
                if not _MONTH_RE.match(f):
                    raise HomeAssistantError("Monat bitte so: 2012-03")
                out.append({"from": f, "hours": r2(num(p.get("hours"), 0) or 0)})
            return sorted(out, key=lambda p: p["from"])[:50]
        if key == "pause_by":
            return "ende" if value == "ende" else "dauer"
        if key == "paid_until":
            out = []
            for p in value or []:
                u = str(p.get("until", ""))
                if not _MONTH_RE.match(u):
                    raise HomeAssistantError("Monat bitte so: 2019-12")
                out.append({"until": u, "hours": r2(num(p.get("hours"), 0) or 0)})
            return sorted(out, key=lambda p: p["until"])[:50]
        if key == "vacation_carry":  # 🧳 {"2026": 9} – nur echte Jahre, ganze/halbe Tage
            out = {}
            for y, n in (value or {}).items():
                v = num(n, 0) or 0.0
                if str(y).isdigit() and len(str(y)) == 4 and 0 < abs(v) <= 400:
                    out[str(y)] = r2(v)
            return out
        if key == "view":
            return {k: bool(v) for k, v in (value or {}).items() if k in ("monat", "jahr", "stat")}
        if key == "plan":
            plan = {}
            for wd, se in (value or {}).items():
                if str(wd) in {"1", "2", "3", "4", "5", "6", "7"} and isinstance(se, (list, tuple)) and len(se) == 2:
                    plan[str(wd)] = [hhmm(minutes(se[0])), hhmm(minutes(se[1]))]
            return plan
        return str(value or "").strip()[:120]

    # ------------------------------------------------------------------ ⏱️ Stempeln
    def _now_min(self, ts: Any) -> tuple[str, int]:
        now = dt_util.as_local(dt_util.utc_from_timestamp(float(ts) / 1000)) if ts else dt_util.now()
        mins = now.hour * 60 + now.minute
        step = int(self.settings.get("round") or 0)
        if step > 0:
            mins = int(round(mins / step) * step)
            mins = min(mins, 24 * 60 - 1)
        return now.date().isoformat(), mins

    def _stamp_in(self, ts: Any, text: str, user: str | None = None) -> None:
        if self.data.get("stamp"):
            return  # schon drin – nichts doppelt
        iso, mins = self._now_min(ts)
        self.data["stamp"] = {"in": hhmm(mins), "date": iso, "ts": int(time.time() * 1000)}
        self._log(user, f"{text} um {hhmm(mins)}")

    def _stamp_out(self, ts: Any, text: str, user: str | None = None) -> None:
        stamp = self.data.get("stamp")
        if not stamp:
            return
        iso, mins = self._now_min(ts)
        if iso != stamp.get("date"):
            iso, mins = stamp["date"], 24 * 60 - 1  # 🌙 über Mitternacht vergessen → Ende 23:59 am Stempel-Tag
        start = minutes(stamp["in"])
        e = self.data["days"].get(iso)
        if e and e.get("kind") == "work" and e.get("start") and e.get("source") == "stamp":
            start = min(start, minutes(e["start"]))  # 2. Besuch am Tag: Anfang bleibt der erste
        new = {"kind": "work", "start": hhmm(start), "end": hhmm(max(mins, start)), "source": "stamp"}
        if e and e.get("note"):
            new["note"] = e["note"]
        if e and e.get("event_uid"):
            new["event_uid"] = e["event_uid"]
        self.data["days"][iso] = new
        self.data["stamp"] = None
        self._dirty_cal.add(iso)
        self._log(user, f"{text} um {hhmm(mins)} ({new['start']}–{new['end']})")
        self._flush_calendar()

    # ------------------------------------------------------------------ 📅 Kalender
    def _flush_calendar(self) -> None:
        if not self._dirty_cal:
            return
        dirty, self._dirty_cal = self._dirty_cal, set()
        if not (self.settings.get("cal_write") and self.settings.get("calendar")):
            return
        for iso in sorted(dirty):
            self.hass.async_create_task(self.async_write_day(iso))

    async def _events(self, ent, start: datetime, end: datetime) -> list:
        return list(await ent.async_get_events(self.hass, start, end))

    def _match(self, ev) -> bool:
        return str(getattr(ev, "summary", "") or "").strip().casefold() == str(self.settings.get("event_title") or "").strip().casefold()

    async def async_sync(self) -> dict[str, Any]:
        """📥 Termine „Arbeiten“ (und Feiertage) der letzten Wochen in die Liste holen."""
        st = self.settings
        res = {"read": 0, "holidays": 0}
        tz = dt_util.get_default_time_zone()
        today = self.today()
        start = datetime.combine(today - timedelta(days=READ_BACK_DAYS), datetime.min.time(), tz)
        end = datetime.combine(today + timedelta(days=2), datetime.min.time(), tz)
        changed = False
        if st.get("calendar") and st.get("cal_read"):
            ent = _cal_entity(self.hass, st["calendar"])
            if ent is None:
                self.cal_status = {**self.cal_status, "ok": False, "error": f"Kalender {st['calendar']} nicht gefunden"}
            else:
                try:
                    events = [e for e in await self._events(ent, start, end) if self._match(e)]
                    self.cal_status = {"ok": True, "last": int(time.time() * 1000), "error": None, "can": self._features(ent)}
                    seen_days = set()
                    for ev in events:
                        a, b = _local(ev.start), _local(ev.end)
                        if a is None or b is None:
                            continue
                        iso = a.date().isoformat()
                        seen_days.add(iso)
                        cur = self.data["days"].get(iso)
                        if cur and cur.get("source") != "calendar":
                            if not cur.get("event_uid") and getattr(ev, "uid", None):
                                cur["event_uid"] = ev.uid
                            continue  # ✋ von Hand/gestempelt → Kalender überschreibt nie
                        note, pause = parse_desc(getattr(ev, "description", None))
                        e = {"kind": "work", "start": a.strftime("%H:%M"), "end": b.strftime("%H:%M") if b.date() == a.date() else "23:59", "source": "calendar"}
                        if pause is not None:
                            e["pause"] = pause
                        if note:
                            e["note"] = note
                        if getattr(ev, "uid", None):
                            e["event_uid"] = ev.uid
                        if a.date() == today and b > dt_util.now():
                            e["provisional"] = True  # ⏳ heute noch nicht vorbei – Ende kann sich noch ändern
                        if cur != e:
                            self.data["days"][iso] = e
                            changed = True
                            res["read"] += 1
                    for iso, cur in list(self.data["days"].items()):  # 🗑️ Termin weg → Tag aus dem Kalender auch weg
                        if cur.get("source") == "calendar" and start.date().isoformat() <= iso < end.date().isoformat() and iso not in seen_days:
                            del self.data["days"][iso]
                            changed = True
                    if st.get("cal_write"):  # 📤 Karte ist die Chefin: fehlt ein Termin (z. B. im Kalender gelöscht) → neu anlegen
                        for iso, cur in self.data["days"].items():
                            if (start.date().isoformat() <= iso <= today.isoformat() and iso not in seen_days and cur.get("source") != "calendar"
                                    and cur.get("kind") == "work" and cur.get("start") and cur.get("end")):
                                self._dirty_cal.add(iso)
                                res["write"] = res.get("write", 0) + 1
                except Exception as err:  # noqa: BLE001
                    self.cal_status = {**self.cal_status, "ok": False, "error": f"Kalender lesen ging nicht: {err}"}
                    self._err(self.cal_status["error"])
        if st.get("holiday_calendar"):
            hent = _cal_entity(self.hass, st["holiday_calendar"])
            if hent is not None:
                try:
                    for ev in await self._events(hent, start, end):
                        d0 = ev.start if isinstance(ev.start, date) and not isinstance(ev.start, datetime) else (_local(ev.start).date() if _local(ev.start) else None)
                        if d0 is None or d0.isoweekday() > 5:
                            continue
                        iso = d0.isoformat()
                        cur = self.data["days"].get(iso)
                        if cur is None or cur.get("source") == "calendar":
                            self.data["days"][iso] = {"kind": "feiertag", "source": "holiday", "note": str(ev.summary or "")[:80]}
                            changed = True
                            res["holidays"] += 1
                except Exception as err:  # noqa: BLE001
                    self._err(f"Feiertage lesen ging nicht: {err}")
        if changed:
            self._save()
        self._flush_calendar()
        return res

    def cal_write_range(self, first: date, last: date, user: str | None = None) -> int:
        """📤 Alle Arbeitstage von–bis in den Kalender schreiben (läuft im Hintergrund, Tag für Tag)."""
        if not self.settings.get("calendar"):
            raise HomeAssistantError("Erst einen Kalender wählen")
        if last < first:
            first, last = last, first
        if (last - first).days > 400:
            raise HomeAssistantError("Höchstens gut ein Jahr auf einmal")
        isos = sorted(iso for iso, e in self.data["days"].items() if first.isoformat() <= iso <= last.isoformat() and e.get("kind") == "work" and e.get("start") and e.get("end"))

        async def run() -> None:
            for iso in isos:
                await self.async_write_day(iso)
        self.hass.async_create_task(run())
        self._log(user, f"📤 {len(isos)} Tage ({first.isoformat()} bis {last.isoformat()}) werden in den Kalender geschrieben")
        return len(isos)

    @staticmethod
    def _features(ent) -> list[str]:
        from homeassistant.components.calendar import CalendarEntityFeature  # noqa: PLC0415

        f = int(getattr(ent, "supported_features", 0) or 0)
        return [n for n, flag in (("create", CalendarEntityFeature.CREATE_EVENT), ("delete", CalendarEntityFeature.DELETE_EVENT), ("update", CalendarEntityFeature.UPDATE_EVENT)) if f & flag]

    async def async_write_day(self, iso: str) -> None:
        """📤 Einen Tag in den Kalender schreiben: Termin anlegen, ändern (oder löschen + neu) oder entfernen."""
        from homeassistant.components.calendar import CalendarEntityFeature  # noqa: PLC0415

        st = self.settings
        ent = _cal_entity(self.hass, st.get("calendar", ""))
        if ent is None:
            self._err(f"Kalender {st.get('calendar')} nicht gefunden – {iso} nicht eingetragen")
            return
        feats = int(getattr(ent, "supported_features", 0) or 0)
        tz = dt_util.get_default_time_zone()
        d0 = date.fromisoformat(iso)
        day_start = datetime.combine(d0, datetime.min.time(), tz)
        try:
            events = [e for e in await self._events(ent, day_start, day_start + timedelta(days=1)) if self._match(e) and _local(e.start) and _local(e.start).date() == d0]
            e = self.data["days"].get(iso)
            want = None
            if e and e.get("kind") == "work" and e.get("start") and e.get("end"):
                h = day_hours(e, st)
                a = datetime.combine(d0, datetime.min.time(), tz) + timedelta(minutes=minutes(e["start"]))
                bm = minutes(e["end"])
                b = datetime.combine(d0, datetime.min.time(), tz) + timedelta(minutes=bm if bm >= minutes(e["start"]) else bm + 1440)
                desc = ((e.get("note") or "").strip() + "\n" + desc_line(h["hours"], h["pause"])).strip()
                want = {"summary": st.get("event_title") or "Arbeiten", "dtstart": a, "dtend": b, "description": desc}
                if st.get("location"):
                    want["location"] = st["location"]
            if want is None:
                for ev in events:
                    if feats & CalendarEntityFeature.DELETE_EVENT and ev.uid:
                        await ent.async_delete_event(ev.uid, recurrence_id=ev.recurrence_id)
                return
            if events:
                ev = events[0]
                same = _local(ev.start) == want["dtstart"] and _local(ev.end) == want["dtend"] and (ev.description or "").strip() == want["description"]
                if not same:
                    if feats & CalendarEntityFeature.UPDATE_EVENT and ev.uid:
                        await ent.async_update_event(ev.uid, want, recurrence_id=ev.recurrence_id)
                    elif feats & CalendarEntityFeature.DELETE_EVENT and feats & CalendarEntityFeature.CREATE_EVENT and ev.uid:
                        await ent.async_delete_event(ev.uid, recurrence_id=ev.recurrence_id)  # 🔁 Google kann nicht ändern → alt weg, neu rein
                        await ent.async_create_event(**want)
                    else:
                        self._err(f"Der Kalender kann Termine nicht ändern – {iso} bitte von Hand anpassen")
                for extra in events[1:]:  # doppelte Termine am selben Tag aufräumen
                    if feats & CalendarEntityFeature.DELETE_EVENT and extra.uid:
                        await ent.async_delete_event(extra.uid, recurrence_id=extra.recurrence_id)
            elif feats & CalendarEntityFeature.CREATE_EVENT:
                await ent.async_create_event(**want)
            else:
                self._err("Der Kalender kann keine Termine anlegen")
            self.cal_status = {**self.cal_status, "ok": True, "error": None, "can": self._features(ent), "wrote": int(time.time() * 1000)}
        except Exception as err:  # noqa: BLE001
            self._err(f"Kalender schreiben ({iso}) ging nicht: {err}")
        self._notify()

    # ------------------------------------------------------------------ 📥 Import & Sicherung
    def import_text(self, text: str, apply: bool, overwrite: bool, user: str | None = None) -> dict[str, Any]:
        if len(text) > MAX_IMPORT_CHARS:
            raise HomeAssistantError("Der Text ist zu lang")
        found, skipped = parse_import(text)
        cur = self.today().strftime("%Y-%m")
        months = {k: v for k, v in parse_import_months(text).items() if k < cur}  # 🧾 nur fertige Monate (der laufende wartet auf die Lohnabrechnung)
        days = self.data["days"]
        new = sum(1 for iso in found if iso not in days)
        clash = sum(1 for iso in found if iso in days)
        res = {"found": len(found), "new": new, "clash": clash, "skipped": skipped,
               "first": min(found) if found else None, "last": max(found) if found else None, "months": len(months)}
        if apply and months:
            for key, v in months.items():
                meta = dict(self.data["months"].get(key) or {})
                if meta.get("sheet") and not overwrite:
                    continue
                meta["sheet"] = {k: r2(v[k]) for k in ("sum", "ges", "long") if k in v}
                if "alt" in v:
                    meta["alt"] = r2(v["alt"])
                meta.pop("adjust", None)  # 🎯 alte „Konto stellen“-Korrektur braucht es jetzt nicht mehr
                self.data["months"][key] = meta
            self._log(user, f"📥 Import: Zettel-Werte für {len(months)} Monate übernommen")
        if apply and (found or months):
            n = 0
            for iso, e in found.items():
                if iso in days and not overwrite:
                    continue
                days[iso] = {**e, "source": "import"}
                n += 1
            res["applied"] = n
            self._log(user, f"📥 Import: {n} Tage übernommen")
            self._save()
        return res

    def restore(self, backup: dict[str, Any], user: str | None = None) -> None:
        if not isinstance(backup, dict) or not isinstance(backup.get("days"), dict):
            raise HomeAssistantError("Das ist keine Stundenzettel-Sicherung")
        d = _empty()
        d["days"] = {k: v for k, v in backup["days"].items() if _DATE_RE.match(k) and isinstance(v, dict) and v.get("kind") in KINDS}
        d["months"] = {k: v for k, v in (backup.get("months") or {}).items() if _MONTH_RE.match(k) and isinstance(v, dict)}
        d["settings"] = {**DEFAULT_SETTINGS, **{k: v for k, v in (backup.get("settings") or {}).items() if k in DEFAULT_SETTINGS}}
        d["log"] = self.data["log"]
        d["pin"], d["pin_off"] = self.data.get("pin"), self.data.get("pin_off")  # 🔒 die PIN bleibt
        self.data = d
        self._log(user, f"💾 Sicherung eingespielt ({len(d['days'])} Tage)")
        self._watch_person()
        self._save()

    def backup(self) -> dict[str, Any]:
        return {"kind": "stundenzettel-sicherung", "version": VERSION, "days": self.data["days"], "months": self.data["months"], "settings": self.settings}

    def factory_reset(self, user: str | None = None) -> None:
        """💣 Alles zurück auf Anfang – nur die PIN bleibt."""
        pin, pin_off = self.data.get("pin"), self.data.get("pin_off")
        self.data = _empty()
        self.data["pin"], self.data["pin_off"] = pin, pin_off
        self._log(user, "💣 Werkseinstellungen")
        self._watch_person()
        self._save()
