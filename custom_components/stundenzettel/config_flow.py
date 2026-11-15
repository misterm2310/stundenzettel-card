"""Einrichtung & Optionen. 👥 Mehrere Stundenzettel gehen (z. B. für zwei Personen mit eigener Firma) – alles andere stellt man in der Karte ein (⚙️)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import BooleanSelector, TextSelector

from .const import CONF_NAME, CONF_SIDEBAR, DOMAIN


def _slug(text: str) -> str:
    out = text.strip().lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        out = out.replace(a, b)
    return "".join(c if c.isalnum() else "_" for c in out).strip("_")[:30]


class StundenzettelConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        first = not self._async_current_entries(include_ignore=False)
        errors: dict[str, str] = {}
        if user_input is not None:
            name = str(user_input.get(CONF_NAME) or "").strip() or "Stundenzettel"
            if first:
                await self.async_set_unique_id(DOMAIN)  # 🥇 der erste speichert wie bisher
            else:
                slug = _slug(name)
                if not slug or slug == DOMAIN:
                    errors[CONF_NAME] = "name_needed"
                else:
                    await self.async_set_unique_id(slug)  # 👥 jeder weitere bekommt eine eigene Kennung aus dem Namen
            if not errors:
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=name, data={}, options={CONF_SIDEBAR: bool(user_input.get(CONF_SIDEBAR))})
        schema = vol.Schema({
            (vol.Optional(CONF_NAME, default="Stundenzettel") if first else vol.Required(CONF_NAME)): TextSelector(),
            vol.Optional(CONF_SIDEBAR, default=True): BooleanSelector(),
        })
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return StundenzettelOptionsFlow()


class StundenzettelOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        manager = self.hass.data.get(DOMAIN, {}).get("managers", {}).get(self.config_entry.entry_id)
        if user_input is not None:
            if user_input.get("reset_pin") and manager is not None:
                manager.clear_pin()  # 🔓 PIN vergessen? Hier setzt ein Admin sie zurück
            return self.async_create_entry(data={CONF_SIDEBAR: bool(user_input.get(CONF_SIDEBAR))})
        schema = vol.Schema({vol.Optional(CONF_SIDEBAR, default=bool(self.config_entry.options.get(CONF_SIDEBAR, False))): BooleanSelector()})
        if manager is not None and manager.data.get("pin"):
            schema = schema.extend({vol.Optional("reset_pin", default=False): BooleanSelector()})
        return self.async_show_form(step_id="init", data_schema=schema)
