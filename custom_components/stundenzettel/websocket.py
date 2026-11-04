"""🔌 Verbindung zur Karte."""

from __future__ import annotations

from datetime import date
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from .const import DOMAIN

NOT_READY = "Der Stundenzettel ist noch nicht eingerichtet (Einstellungen → Geräte & Dienste → Integration hinzufügen → Stundenzettel)"


def _m(hass: HomeAssistant):
    return hass.data.get(DOMAIN, {}).get("manager")


@callback
def async_register(hass: HomeAssistant) -> None:
    for cmd in (ws_subscribe, ws_apply, ws_import, ws_sync, ws_backup, ws_restore, ws_factory_reset, ws_errors_clear, ws_pin_set, ws_pin_check, ws_pdf_store, ws_cal_write_range):
        websocket_api.async_register_command(hass, cmd)


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Alles schicken – und bei jeder Änderung nochmal."""
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return

    @callback
    def push() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], m.snapshot()))

    connection.subscriptions[msg["id"]] = m.add_listener(push)
    connection.send_result(msg["id"])
    push()


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/apply", vol.Required("ops"): vol.All([dict], vol.Length(max=500))})
@callback
def ws_apply(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    user = connection.user.name if connection.user else None
    connection.send_result(msg["id"], {"results": m.apply(msg["ops"], user)})


@websocket_api.websocket_command({
    vol.Required("type"): "stundenzettel/import", vol.Required("text"): str,
    vol.Optional("apply", default=False): bool, vol.Optional("overwrite", default=False): bool,
})
@callback
def ws_import(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """📥 Alte Tabelle als Text: erst ansehen (apply = False), dann übernehmen."""
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    try:
        user = connection.user.name if connection.user else None
        connection.send_result(msg["id"], m.import_text(msg["text"], msg["apply"], msg["overwrite"], user))
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "import_failed", str(err))


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/sync"})
@websocket_api.async_response
async def ws_sync(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """🔁 Jetzt mit dem Kalender abgleichen."""
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    res = await m.async_sync()
    m._notify()  # noqa: SLF001
    connection.send_result(msg["id"], {**res, "cal": m.cal_status})


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/backup"})
@callback
def ws_backup(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    connection.send_result(msg["id"], m.backup())


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/restore", vol.Required("data"): dict})
@websocket_api.require_admin
@callback
def ws_restore(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    try:
        m.restore(msg["data"], connection.user.name if connection.user else None)
        connection.send_result(msg["id"], {"ok": True})
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "restore_failed", str(err))


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/factory_reset"})
@websocket_api.require_admin
@callback
def ws_factory_reset(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    m.factory_reset(connection.user.name if connection.user else None)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/errors_clear"})
@callback
def ws_errors_clear(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    m = _m(hass)
    if m is not None:
        m.errors.clear()
        m._notify()  # noqa: SLF001
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/pin/set", vol.Optional("pin"): vol.Any(str, None), vol.Optional("old"): vol.Any(str, None)})
@callback
def ws_pin_set(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """🔒 PIN festlegen, ändern oder (leer) ausschalten."""
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    try:
        m.set_pin(msg.get("pin"), msg.get("old"), connection.user.name if connection.user else None)
        connection.send_result(msg["id"], {"ok": True})
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "pin", str(err))


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/pin/check", vol.Required("pin"): str})
@callback
def ws_pin_check(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """🔓 Stimmt die PIN? (5× falsch = 1 Minute Pause)"""
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    try:
        connection.send_result(msg["id"], {"ok": m.check_pin(msg["pin"])})
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "pin", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "stundenzettel/pdf/store",
        vol.Required("data"): vol.All(str, vol.Length(max=7_000_000)),
        vol.Optional("name"): vol.All(str, vol.Length(max=120)),
    }
)
@callback
def ws_pdf_store(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """📄 Die Karte hat eine PDF gebaut: kurz bereithalten, Link zurück (für die HA-App auf dem Handy)."""
    from .pdf_share import store_pdf  # noqa: PLC0415

    try:
        result = store_pdf(hass, msg["data"], msg.get("name"))
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command({vol.Required("type"): "stundenzettel/cal_write_range", vol.Required("from"): str, vol.Required("to"): str})
@callback
def ws_cal_write_range(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """📤 Alle Arbeitstage von–bis in den Kalender schreiben."""
    m = _m(hass)
    if m is None:
        connection.send_error(msg["id"], "not_ready", NOT_READY)
        return
    try:
        first, last = date.fromisoformat(msg["from"]), date.fromisoformat(msg["to"])
        user = connection.user.name if connection.user else None
        connection.send_result(msg["id"], {"queued": m.cal_write_range(first, last, user)})
    except ValueError:
        connection.send_error(msg["id"], "bad_date", "Datum bitte so: 2026-11-04")
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "cal_failed", str(err))
