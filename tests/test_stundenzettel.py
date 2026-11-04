"""🧪 Tests: Rechnen, Import, Stempeln, Kalender (mit einem Pappkalender statt Google)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from homeassistant.components.calendar import CalendarEntityFeature
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util

from custom_components.stundenzettel import manager as mgr
from custom_components.stundenzettel.const import DEFAULT_SETTINGS, DOMAIN

ST = dict(DEFAULT_SETTINGS)


def test_pause_rules_wie_auf_dem_zettel():
    # 6:30–16:15 → 9,25 · 6:30–12:00 → 5,25 · 6:30–10:45 → 4,00 (ausgedachte Beispiel-Tage)
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "16:15"}, ST)["hours"] == 9.25
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "12:00"}, ST)["hours"] == 5.25
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "10:45"}, ST)["hours"] == 4.0
    assert mgr.day_hours({"kind": "work", "start": "07:00", "end": "17:00", "pause": 0.5}, ST)["hours"] == 9.5
    assert mgr.day_hours({"kind": "urlaub"}, ST)["hours"] == 8
    assert mgr.day_hours({"kind": "pauschal", "amount": 40}, ST)["hours"] == 0


def test_monate_und_konto():
    days = {
        "2026-01-05": {"kind": "work", "start": "06:30", "end": "16:15"},
        "2026-01-06": {"kind": "urlaub"},
        "2026-03-02": {"kind": "krank"},
    }
    st = {**ST, "paid_hours": 10, "start_balance": 5}
    rows = mgr.compute_months(days, {"2026-01": {"adjust": -2}}, st, date(2026, 3, 31))
    jan, feb, mar = rows
    assert jan["hours"] == 17.25 and jan["paid"] == 10 and jan["total"] == pytest.approx(5 + 7.25 - 2)
    assert feb["tracked"] is False and feb["total"] == jan["total"]  # Lücke zählt nicht
    assert mar["old"] == jan["total"] and mar["krank"] == 1
    assert jan["long"] == 1  # 9,75 Std. weg ≥ 8



def test_kommende_monate_zaehlen_nicht():
    """🔮 Schon eingetragener Urlaub im Dezember darf das Konto im November nicht runterziehen."""
    days = {
        "2026-10-05": {"kind": "work", "start": "06:30", "end": "16:15"},
        "2026-11-02": {"kind": "work", "start": "06:30", "end": "16:15"},
        "2026-12-21": {"kind": "urlaub"},
        "2026-12-22": {"kind": "urlaub"},
    }
    st = {**ST, "paid_hours": 9.25, "start_balance": 0}
    rows = mgr.compute_months(days, {}, st, date(2026, 11, 4))
    okt, nov, dez = rows
    assert okt["total"] == 0 and "now" in nov and nov["future"] is False
    assert dez["future"] is True and dez["tracked"] is False and dez["paid"] == 0
    assert dez["total"] == nov["total"] and dez["urlaub"] == 2

def test_soll_frueher_anders():
    st = {**ST, "paid_hours": 175, "paid_periods": [{"from": "2012-03", "hours": 160}, {"from": "2023-01", "hours": 175}]}
    assert mgr.paid_for("2015-06", st) == 160 and mgr.paid_for("2024-02", st) == 175 and mgr.paid_for("2010-01", st) == 175


def test_import_text():
    text = """  März 2012      April 2012
15.03.2012    7:00 - 17:00       9,5        02.04.2012    7:00 - 17:00        9,5
16.03.2012    7:00 - 15:30         8        14.04.2012    8:00 - 11:00    33,00 Euro
12.06.2012     7:00 - 10:45     3,5
12.06.2012    11:30 - 16:00    4,25
02.08.2012       Urlaub            8        24.01.2026       Wochenende      0
25.05.2026         Feiertag       8
26.03.3014    7:00 - 16:00   8,5
"""
    found, skipped = mgr.parse_import(text)
    assert found["2012-03-15"] == {"kind": "work", "start": "07:00", "end": "17:00", "pause": 0.5}
    assert found["2012-04-14"]["kind"] == "pauschal" and found["2012-04-14"]["amount"] == 33
    assert found["2012-08-02"]["kind"] == "urlaub" and found["2026-05-25"]["kind"] == "feiertag"
    assert "2026-01-24" not in found and skipped == 2  # Wochenende + Tippfehler-Jahr 3014
    split = found["2012-06-12"]
    assert split["start"] == "07:00" and split["end"] == "16:00"
    assert mgr.day_hours(split, ST)["hours"] == 7.75


def test_beschreibung_lesen():
    note, pause = mgr.parse_desc("Musterstadt - Terrasse\n[9,25 Stunden (+0,50 h Pause)]")
    assert note == "Musterstadt - Terrasse" and pause == 0.5
    assert mgr.desc_line(9.25, 0.5) == "[9,25 Stunden (+0,50 h Pause)]"


class FakeCal:
    """📅 Pappkalender: kann anlegen und löschen, aber NICHT ändern (wie Google in HA)."""

    supported_features = CalendarEntityFeature.CREATE_EVENT | CalendarEntityFeature.DELETE_EVENT

    def __init__(self):
        self.events = []
        self.n = 0

    async def async_get_events(self, hass, start, end):
        return [e for e in self.events if start <= e.start < end]

    async def async_create_event(self, **kw):
        self.n += 1
        self.events.append(SimpleNamespace(uid=f"u{self.n}", recurrence_id=None, start=kw["dtstart"], end=kw["dtend"],
                                           summary=kw["summary"], description=kw.get("description"), location=kw.get("location")))

    async def async_delete_event(self, uid, recurrence_id=None, recurrence_range=None):
        self.events = [e for e in self.events if e.uid != uid]


@pytest.fixture(autouse=True)
async def _zeit(hass: HomeAssistant, freezer):
    await hass.config.async_set_time_zone("Europe/Berlin")
    freezer.move_to(datetime(2026, 11, 4, 12, 0, tzinfo=dt_util.get_time_zone("Europe/Berlin")))


async def _setup(hass: HomeAssistant):
    assert await async_setup_component(hass, "http", {})
    hass.config.components.update({"frontend", "lovelace", "panel_custom"})
    entry = MockConfigEntry(domain=DOMAIN, title="Stundenzettel", data={}, options={"sidebar": False})
    entry.add_to_hass(hass)
    with patch("custom_components.stundenzettel.frontend.add_extra_js_url"):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    return hass.data[DOMAIN]["manager"]


async def test_setup_und_tag(hass: HomeAssistant):
    m = await _setup(hass)
    res = m.apply([{"type": "day_set", "date": "2026-10-29", "kind": "work", "start": "06:30", "end": "16:15", "note": "Beispiel-Baustelle"}])
    assert res[0]["ok"]
    assert m.snapshot()["days"]["2026-10-29"]["hours"] == 9.25
    bad = m.apply([{"type": "day_set", "date": "2026-10-30", "kind": "work", "start": "06:30"}])
    assert not bad[0]["ok"]
    await hass.async_block_till_done()
    assert hass.states.get("sensor.stundenzettel_ueberstunden") is not None
    assert hass.states.get("binary_sensor.stundenzettel_eingestempelt").state == "off"


async def test_kalender_lesen_und_schreiben(hass: HomeAssistant, monkeypatch):
    cal = FakeCal()
    monkeypatch.setattr(mgr, "_cal_entity", lambda hass, eid: cal)
    m = await _setup(hass)
    tz = dt_util.get_default_time_zone()
    d0 = dt_util.now().date() - timedelta(days=3)
    a = datetime.combine(d0, datetime.min.time(), tz) + timedelta(hours=6, minutes=30)
    await cal.async_create_event(dtstart=a, dtend=a + timedelta(hours=9, minutes=45), summary="Arbeiten", description="Beispiel\n[9,25 Stunden (+0,50 h Pause)]")
    m.apply([{"type": "set", "key": "calendar", "value": "calendar.test"}])
    await m.async_sync()
    e = m.data["days"][d0.isoformat()]
    assert e["source"] == "calendar" and e["start"] == "06:30" and e["end"] == "16:15" and e["pause"] == 0.5 and e["note"] == "Beispiel"
    # ✍️ In der Karte ändern + Schreiben an → alter Termin weg, neuer rein (Google kann nicht ändern)
    m.apply([{"type": "set", "key": "cal_write", "value": True}])
    m.apply([{"type": "day_set", "date": d0.isoformat(), "kind": "work", "start": "06:30", "end": "15:00", "note": "Beispiel"}])
    await hass.async_block_till_done()
    assert len(cal.events) == 1
    ev = cal.events[0]
    assert ev.uid != "u1" and ev.end == a + timedelta(hours=8, minutes=30) and ev.description.endswith("[8,00 Stunden (+0,50 h Pause)]")
    await m.async_sync()  # der Kalender überschreibt den Tag „von Hand“ nicht
    assert m.data["days"][d0.isoformat()]["source"] == "card"
    # 🤒 Krank statt Arbeit → Termin wird gelöscht
    m.apply([{"type": "day_set", "date": d0.isoformat(), "kind": "krank"}])
    await hass.async_block_till_done()
    assert cal.events == []


async def test_stempeln(hass: HomeAssistant):
    m = await _setup(hass)
    m.apply([{"type": "set", "key": "round", "value": 15}])
    base = dt_util.now().replace(hour=6, minute=28, second=0, microsecond=0)
    m.apply([{"type": "stamp_in", "ts": base.timestamp() * 1000}])
    assert m.data["stamp"]["in"] == "06:30"
    m.apply([{"type": "stamp_out", "ts": (base + timedelta(hours=9, minutes=49)).timestamp() * 1000}])
    e = m.data["days"][base.date().isoformat()]
    assert (e["start"], e["end"], e["source"]) == ("06:30", "16:15", "stamp") and m.data["stamp"] is None


async def test_zone_stempeln(hass: HomeAssistant):
    m = await _setup(hass)
    hass.states.async_set("zone.arbeit", "0", {"friendly_name": "Arbeit"})
    hass.states.async_set("person.test", "home")
    m.apply([{"type": "set", "key": "stamp_person", "value": "person.test"}, {"type": "set", "key": "stamp_zone", "value": "zone.arbeit"}])
    hass.states.async_set("person.test", "Arbeit")
    await hass.async_block_till_done()
    assert m.data["stamp"] is not None
    hass.states.async_set("person.test", "not_home")
    await hass.async_block_till_done()
    assert m.data["stamp"] is None and m.data["days"]


async def test_import_und_konto_stellen(hass: HomeAssistant):
    m = await _setup(hass)
    prev = m.import_text("01.10.2026 7:00 - 17:00 9,5\n02.10.2026 Urlaub 8", apply=False, overwrite=False)
    assert prev["found"] == 2 and prev["new"] == 2 and not m.data["days"]
    m.import_text("01.10.2026 7:00 - 17:00 9,5\n02.10.2026 Urlaub 8", apply=True, overwrite=False)
    assert len(m.data["days"]) == 2
    res = m.apply([{"type": "balance_fix", "month": "2026-10", "value": 12.5}])
    assert res[0]["ok"]
    assert next(r for r in m.months() if r["month"] == "2026-10")["total"] == 12.5
    b = m.backup()
    m.factory_reset()
    assert not m.data["days"]
    m.restore(b)
    assert len(m.data["days"]) == 2


async def test_einrichten_nur_einmal(hass: HomeAssistant):
    from homeassistant import config_entries

    assert await async_setup_component(hass, "http", {})
    hass.config.components.update({"frontend", "lovelace", "panel_custom", "websocket_api"})
    with patch("custom_components.stundenzettel.async_setup_entry", return_value=True):
        r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
        assert r["type"] == "form"
        r = await hass.config_entries.flow.async_configure(r["flow_id"], {"sidebar": False})
        assert r["type"] == "create_entry"
        r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
        assert r["type"] == "abort"


async def test_pin(hass: HomeAssistant):
    """🔒 PIN: festlegen, prüfen, Offline-Schlüssel, 5× falsch = Pause, Werkseinstellungen behalten sie."""
    import hashlib

    from homeassistant.exceptions import HomeAssistantError

    m = await _setup(hass)
    snap = m.snapshot()
    assert snap["pin"] is False and snap["pin_off"] is None
    m.set_pin("4711")
    snap = m.snapshot()
    assert snap["pin"] is True and "4711" not in str(snap)  # die echte PIN geht nie raus
    off = snap["pin_off"]
    assert hashlib.pbkdf2_hmac("sha256", b"4711", bytes.fromhex(off["salt"]), off["iter"]).hex() == off["hash"]  # so rechnet die Karte offline nach
    assert m.check_pin("4711") and not m.check_pin("0000")
    with pytest.raises(HomeAssistantError):
        m.set_pin("12")  # zu kurz
    with pytest.raises(HomeAssistantError):
        m.set_pin("5555", old="0000")  # alte PIN falsch
    for _ in range(2):  # zusammen mit den 3 Fehlversuchen oben (2× ohne alte PIN) = 5× falsch
        m.check_pin("0000")
    with pytest.raises(HomeAssistantError):
        m.check_pin("4711")  # 5× falsch → 1 Minute Pause
    m._pin_locked_until = 0
    m.factory_reset()
    assert m.snapshot()["pin"] is True  # 💣 alles weg, nur die PIN bleibt
    m.clear_pin()
    assert m.snapshot()["pin"] is False


async def test_ansicht_einstellungen(hass: HomeAssistant):
    """👁️ Neue Schalter: Maskottchen, Verschleiern, Reiter, ganze Karte sperren."""
    m = await _setup(hass)
    res = m.apply([{"type": "set", "key": "mascot", "value": True}, {"type": "set", "key": "view", "value": {"monat": False, "quatsch": True}},
                   {"type": "set", "key": "veil", "value": 1}, {"type": "set", "key": "lock_all", "value": True}])
    assert all(r["ok"] for r in res)
    st = m.snapshot()["settings"]
    assert st["mascot"] is True and st["veil"] is True and st["lock_all"] is True and st["view"] == {"monat": False}


async def test_offline_app_seite(hass: HomeAssistant, hass_client_no_auth):
    """📱 Die Offline-App ist ohne Anmeldung abrufbar, enthält aber keine Daten – nur Programm."""
    await _setup(hass)
    client = await hass_client_no_auth()
    r = await client.get("/stundenzettel/app/")
    body = await r.text()
    assert r.status == 200 and "__SZ_VERSION__" not in body and "stundenzettel-card" in body
    r = await client.get("/stundenzettel/app/sw.js")
    assert r.status == 200 and r.headers.get("Service-Worker-Allowed") == "/stundenzettel/app/"
    assert (await client.get("/stundenzettel/app/manifest.webmanifest")).status == 200
    assert (await client.get("/stundenzettel/app/geheim.json")).status == 404


async def test_resturlaub_vorjahr(hass: HomeAssistant) -> None:
    """🧳 Resturlaub aus dem Vorjahr zählt zum Anspruch dazu, Unsinn wird aussortiert."""
    m = mgr.StundenzettelManager(hass)
    y = str(m.today().year)
    assert m._clean_setting("vacation_carry", {y: "9", "abc": 3, "2025": 0}) == {y: 9.0}
    m.data["settings"]["vacation_carry"] = {y: 9}
    m.data["days"][f"{y}-01-02"] = {"kind": "urlaub"}
    s = m.summary()
    assert s["vacation_carry"] == 9 and s["vacation_left"] == 30 + 9 - 1


def test_pause_nach_uhrzeit_beim_gehen():
    """☕ Marco: Gehen bis 12 Uhr → 0,25 Pause, danach 0,50."""
    st = {**ST, "pause_by": "ende", "pause_rules": [{"from": 0, "pause": 0.25}, {"from": 12, "pause": 0.5}]}
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "12:00"}, st)["hours"] == 5.25
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "12:15"}, st)["pause"] == 0.5
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "16:15"}, st)["hours"] == 9.25
    assert mgr.day_hours({"kind": "work", "start": "06:30", "end": "16:15", "pause": 0}, st)["hours"] == 9.75  # von Hand bleibt von Hand


def test_bezahlt_bis_monat():
    """💶 „bis Dezember 2019: 160“, danach das aktuelle Soll."""
    st = {**ST, "paid_hours": 175, "paid_until": [{"until": "2019-12", "hours": 160}]}
    assert mgr.paid_for("2015-06", st) == 160 and mgr.paid_for("2019-12", st) == 160 and mgr.paid_for("2020-01", st) == 175


async def test_pause_set_und_pdf(hass: HomeAssistant) -> None:
    """📝 Snapshot sagt, ob die Pause wirklich eingetragen ist · 📄 PDF-Link für die HA-App."""
    from custom_components.stundenzettel.pdf_share import get_pdf, store_pdf

    m = mgr.StundenzettelManager(hass)
    m.data["days"]["2026-11-02"] = {"kind": "work", "start": "06:30", "end": "16:15"}
    m.data["days"]["2026-11-03"] = {"kind": "work", "start": "06:30", "end": "16:15", "pause": 0.25}
    days = m.snapshot()["days"]
    assert days["2026-11-02"]["pause_set"] is False and days["2026-11-02"]["pause"] == 0.5
    assert days["2026-11-03"]["pause_set"] is True
    import base64

    r = store_pdf(hass, base64.b64encode(b"%PDF-1.4 test").decode(), "Stundenzettel Nov")
    assert r["url"].startswith("/api/stundenzettel/pdf/") and r["url"].endswith("/Stundenzettel-Nov.pdf")
    assert get_pdf(hass, r["url"].split("/")[4])["data"].startswith(b"%PDF")
    with pytest.raises(ValueError):
        store_pdf(hass, base64.b64encode(b"keine pdf").decode())


async def test_fehlender_termin_kommt_zurueck(hass: HomeAssistant, monkeypatch):
    """📤 Karte ist die Chefin: im Kalender gelöschter Termin wird beim Abgleich neu angelegt – ohne Doppelte."""
    cal = FakeCal()
    monkeypatch.setattr(mgr, "_cal_entity", lambda hass, eid: cal)
    m = await _setup(hass)
    d0 = (dt_util.now().date() - timedelta(days=2)).isoformat()
    m.apply([{"type": "set", "key": "calendar", "value": "calendar.test"}, {"type": "set", "key": "cal_write", "value": True}])
    m.apply([{"type": "day_set", "date": d0, "kind": "work", "start": "06:30", "end": "16:15"}])
    await hass.async_block_till_done()
    assert len(cal.events) == 1
    cal.events = []  # 🗑️ aus Versehen im Kalender gelöscht
    res = await m.async_sync()
    await hass.async_block_till_done()
    assert res.get("write") == 1 and len(cal.events) == 1 and m.data["days"][d0]["source"] == "card"
    await m.async_sync()
    await hass.async_block_till_done()
    assert len(cal.events) == 1  # keine doppelten Termine
    # 📤 Zeitraum nachschreiben
    cal.events = []
    assert m.cal_write_range(date.fromisoformat(d0), dt_util.now().date()) == 1
    await hass.async_block_till_done()
    assert len(cal.events) == 1


TSV = "\n".join([
    "Oktober\t2026\t\t\tNovember\t2026",
    "Datum\tZeit\tStunden\t\tDatum\tZeit\tStunden",
    "01.10.2026\t6:30 - 16:15\t9,25\t\t02.11.2026\t6:30 - 16:15\t9,25",
    "02.10.2026\t6:30 - 16:15\t9,25",
    "\t\t20,5",
    "Bezahlt\t-175\t-154,5\t\tBezahlt\t-175\t-165,75",
    "Ü.-Alt\t\t31\t\tÜ.-Alt\t\t0",
    "Ü.-Gesamt\t\t-123,5\t\tÜ.-Gesamt\t\t-165,75",
    "Urlaubstage\t\t0",
    "Kranktage\t\t0",
    "8 Stunden und ->\t\t2",
])


async def test_import_monatswerte_und_lohnabrechnung(hass: HomeAssistant) -> None:
    """🧾 Import übernimmt die Monatswerte 1:1 · 💶 Ü.-Alt laut Lohnabrechnung · laufender Monat bleibt frei."""
    months = mgr.parse_import_months(TSV)
    assert months["2026-10"] == {"sum": 20.5, "alt": 31.0, "ges": -123.5, "urlaub": 0.0, "krank": 0.0, "long": 2.0}
    m = mgr.StundenzettelManager(hass)
    m.data["months"]["2026-10"] = {"adjust": -10}
    res = m.import_text(TSV, apply=True, overwrite=False)
    assert res["months"] == 1 and "2026-11" not in m.data["months"]  # November wartet auf die Lohnabrechnung
    assert "adjust" not in m.data["months"]["2026-10"]
    rows = {r["month"]: r for r in m.months()}
    okt = rows["2026-10"]
    assert okt["old"] == 31 and okt["hours"] == 20.5 and okt["total"] == -123.5 and okt["sheet"] and okt["long"] == 2
    assert rows["2026-11"]["old"] == -123.5
    # 💶 Lohnabrechnung für November: Konto rechnet mit der Zahl vom Chef weiter, Abweichung sichtbar
    m.apply([{"type": "month_set", "month": "2026-11", "alt": -120}])
    nov = {r["month"]: r for r in m.months()}["2026-11"]
    assert nov["old"] == -120 and nov["alt"] and nov["calc_old"] == -123.5
    m.apply([{"type": "month_set", "month": "2026-11", "alt": None}])
    assert {r["month"]: r for r in m.months()}["2026-11"]["old"] == -123.5
    # 🧮 „Mit Karte neu rechnen“ → Tage zählen wieder
    m.apply([{"type": "month_set", "month": "2026-10", "sheet": None}])
    assert {r["month"]: r for r in m.months()}["2026-10"]["hours"] == 18.5
    # 🥪 8 Stunden und → zählt ohne Pause
    m.data["days"]["2026-09-01"] = {"kind": "work", "start": "06:30", "end": "14:45"}  # 8,25 da, 7,75 ohne Pause
    assert {r["month"]: r for r in m.months()}["2026-09"]["long"] == 0
