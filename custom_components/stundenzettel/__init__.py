"""⏱️ Stundenzettel – Arbeitszeit, Überstunden-Konto, Urlaub und Krank in Home Assistant (auch aus dem Kalender)."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import websocket as ws
from .app_view import async_register_app
from .const import CONF_ENTRY, CONF_SIDEBAR, DOMAIN, KINDS, PANEL_URL_PATH, STORAGE_KEY
from .frontend import async_set_sidebar, async_setup_frontend
from .manager import StundenzettelManager

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR]


def find_manager(hass: HomeAssistant, entry_id: str | None = None) -> StundenzettelManager | None:
    """👥 Welcher Stundenzettel? Ohne Angabe = der erste (so wie bisher)."""
    data = hass.data.get(DOMAIN, {})
    if entry_id:
        return data.get("managers", {}).get(entry_id)
    return data.get("manager") or next(iter(data.get("managers", {}).values()), None)


def get_manager(hass: HomeAssistant, entry_id: str | None = None) -> StundenzettelManager:
    m = find_manager(hass, entry_id)
    if m is None:
        raise HomeAssistantError("Diesen Stundenzettel gibt es nicht (oder er ist noch nicht eingerichtet).")
    return m


def is_first(entry: ConfigEntry) -> bool:
    """🥇 Der erste Stundenzettel (unique_id = Domain) behält Speicher, Sensor-Namen und Seitenleiste wie bisher."""
    return entry.unique_id in (None, DOMAIN)


def panel_path(entry: ConfigEntry) -> str:
    return PANEL_URL_PATH if is_first(entry) else f"{PANEL_URL_PATH}-{str(entry.unique_id).lower()}"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Einmalig: Karte + Offline-App bereitstellen, Websocket und Aktionen anmelden."""
    hass.data.setdefault(DOMAIN, {})
    await async_setup_frontend(hass)
    async_register_app(hass)
    ws.async_register(hass)
    _register_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    key = STORAGE_KEY if is_first(entry) else f"{STORAGE_KEY}.{entry.entry_id}"
    manager = StundenzettelManager(hass, entry.entry_id, entry.title, key)
    await manager.async_load()
    hass.data[DOMAIN].setdefault("managers", {})[entry.entry_id] = manager
    if is_first(entry):
        hass.data[DOMAIN]["manager"] = manager
    manager.async_start()
    entry.async_on_unload(manager.async_stop)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    await async_set_sidebar(hass, bool(entry.options.get(CONF_SIDEBAR, False)), panel_path(entry), entry.title, None if is_first(entry) else entry.entry_id)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        manager: StundenzettelManager | None = hass.data[DOMAIN].get("managers", {}).pop(entry.entry_id, None)
        if hass.data[DOMAIN].get("manager") is manager:
            hass.data[DOMAIN].pop("manager", None)
        await async_set_sidebar(hass, False, panel_path(entry))
        if manager is not None:
            await manager.async_save_now()
    return unloaded


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def _user_name(hass: HomeAssistant, call: ServiceCall) -> str | None:
    if not call.context.user_id:
        return None
    user = await hass.auth.async_get_user(call.context.user_id)
    return user.name if user else None


def _check(results: list[dict]) -> None:
    for r in results:
        if not r.get("ok"):
            raise HomeAssistantError(r.get("error") or "Das hat nicht geklappt")


def _register_services(hass: HomeAssistant) -> None:
    async def kommen(call: ServiceCall) -> None:
        _check(get_manager(hass, call.data.get(CONF_ENTRY)).apply([{"type": "stamp_in"}], await _user_name(hass, call)))

    async def gehen(call: ServiceCall) -> None:
        _check(get_manager(hass, call.data.get(CONF_ENTRY)).apply([{"type": "stamp_out"}], await _user_name(hass, call)))

    async def tag(call: ServiceCall) -> None:
        op = {"type": "day_set", "date": str(call.data["datum"]), "kind": call.data.get("art", "work"),
              "start": call.data.get("von"), "end": call.data.get("bis"), "pause": call.data.get("pause"),
              "note": call.data.get("notiz"), "hours": call.data.get("stunden"), "amount": call.data.get("betrag")}
        for k in ("start", "end"):
            if op[k] is not None:
                op[k] = str(op[k])[:5]
        _check(get_manager(hass, call.data.get(CONF_ENTRY)).apply([op], await _user_name(hass, call)))

    async def abgleichen(call: ServiceCall) -> ServiceResponse:
        return await get_manager(hass, call.data.get(CONF_ENTRY)).async_sync()

    async def abrufen(call: ServiceCall) -> ServiceResponse:
        m = get_manager(hass, call.data.get(CONF_ENTRY))
        return {"zusammenfassung": m.summary(), "monate": m.months()[-13:]}

    which = {vol.Optional(CONF_ENTRY): cv.string}  # 👥 welcher Stundenzettel (leer = der erste)
    hass.services.async_register(DOMAIN, "kommen", kommen, vol.Schema(which))
    hass.services.async_register(DOMAIN, "gehen", gehen, vol.Schema(which))
    hass.services.async_register(DOMAIN, "tag_eintragen", tag, vol.Schema({**which,
        vol.Required("datum"): cv.date, vol.Optional("art", default="work"): vol.In(KINDS),
        vol.Optional("von"): cv.time, vol.Optional("bis"): cv.time, vol.Optional("pause"): vol.Coerce(float),
        vol.Optional("stunden"): vol.Coerce(float), vol.Optional("betrag"): vol.Coerce(float), vol.Optional("notiz"): cv.string,
    }))
    hass.services.async_register(DOMAIN, "abgleichen", abgleichen, vol.Schema(which), supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "daten_abrufen", abrufen, vol.Schema(which), supports_response=SupportsResponse.ONLY)
