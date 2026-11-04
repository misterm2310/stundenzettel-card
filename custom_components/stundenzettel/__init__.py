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
from .const import CONF_SIDEBAR, DOMAIN, KINDS
from .frontend import async_set_sidebar, async_setup_frontend
from .manager import StundenzettelManager

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR]


def get_manager(hass: HomeAssistant) -> StundenzettelManager:
    m = hass.data.get(DOMAIN, {}).get("manager")
    if m is None:
        raise HomeAssistantError("Der Stundenzettel ist noch nicht eingerichtet.")
    return m


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Einmalig: Karte + Offline-App bereitstellen, Websocket und Aktionen anmelden."""
    hass.data.setdefault(DOMAIN, {})
    await async_setup_frontend(hass)
    async_register_app(hass)
    ws.async_register(hass)
    _register_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    manager = StundenzettelManager(hass, entry.entry_id, entry.title)
    await manager.async_load()
    hass.data[DOMAIN]["manager"] = manager
    manager.async_start()
    entry.async_on_unload(manager.async_stop)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    await async_set_sidebar(hass, bool(entry.options.get(CONF_SIDEBAR, False)))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        manager: StundenzettelManager | None = hass.data[DOMAIN].pop("manager", None)
        await async_set_sidebar(hass, False)
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
        _check(get_manager(hass).apply([{"type": "stamp_in"}], await _user_name(hass, call)))

    async def gehen(call: ServiceCall) -> None:
        _check(get_manager(hass).apply([{"type": "stamp_out"}], await _user_name(hass, call)))

    async def tag(call: ServiceCall) -> None:
        op = {"type": "day_set", "date": str(call.data["datum"]), "kind": call.data.get("art", "work"),
              "start": call.data.get("von"), "end": call.data.get("bis"), "pause": call.data.get("pause"),
              "note": call.data.get("notiz"), "hours": call.data.get("stunden"), "amount": call.data.get("betrag")}
        for k in ("start", "end"):
            if op[k] is not None:
                op[k] = str(op[k])[:5]
        _check(get_manager(hass).apply([op], await _user_name(hass, call)))

    async def abgleichen(call: ServiceCall) -> ServiceResponse:
        return await get_manager(hass).async_sync()

    async def abrufen(call: ServiceCall) -> ServiceResponse:
        m = get_manager(hass)
        return {"zusammenfassung": m.summary(), "monate": m.months()[-13:]}

    hass.services.async_register(DOMAIN, "kommen", kommen, vol.Schema({}))
    hass.services.async_register(DOMAIN, "gehen", gehen, vol.Schema({}))
    hass.services.async_register(DOMAIN, "tag_eintragen", tag, vol.Schema({
        vol.Required("datum"): cv.date, vol.Optional("art", default="work"): vol.In(KINDS),
        vol.Optional("von"): cv.time, vol.Optional("bis"): cv.time, vol.Optional("pause"): vol.Coerce(float),
        vol.Optional("stunden"): vol.Coerce(float), vol.Optional("betrag"): vol.Coerce(float), vol.Optional("notiz"): cv.string,
    }))
    hass.services.async_register(DOMAIN, "abgleichen", abgleichen, vol.Schema({}), supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "daten_abrufen", abrufen, vol.Schema({}), supports_response=SupportsResponse.ONLY)
