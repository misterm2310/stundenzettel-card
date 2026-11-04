"""Einrichtung & Optionen. Es gibt genau einen Stundenzettel – alles andere stellt man in der Karte ein (⚙️)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import BooleanSelector

from .const import CONF_SIDEBAR, DOMAIN


class StundenzettelConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="Stundenzettel", data={}, options={CONF_SIDEBAR: bool(user_input.get(CONF_SIDEBAR))})
        return self.async_show_form(step_id="user", data_schema=vol.Schema({vol.Optional(CONF_SIDEBAR, default=True): BooleanSelector()}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return StundenzettelOptionsFlow()


class StundenzettelOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        manager = self.hass.data.get(DOMAIN, {}).get("manager")
        if user_input is not None:
            if user_input.get("reset_pin") and manager is not None:
                manager.clear_pin()  # 🔓 PIN vergessen? Hier setzt ein Admin sie zurück
            return self.async_create_entry(data={CONF_SIDEBAR: bool(user_input.get(CONF_SIDEBAR))})
        schema = vol.Schema({vol.Optional(CONF_SIDEBAR, default=bool(self.config_entry.options.get(CONF_SIDEBAR, False))): BooleanSelector()})
        if manager is not None and manager.data.get("pin"):
            schema = schema.extend({vol.Optional("reset_pin", default=False): BooleanSelector()})
        return self.async_show_form(step_id="init", data_schema=schema)
