"""⏱️ Bin ich gerade eingestempelt? (an = ja) – praktisch für Automationen."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import SIGNAL_UPDATE
from .sensor import device_info, entity_prefix, manager_of


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([SzStamped(hass, entry)])


class SzStamped(BinarySensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_name = "Eingestempelt"
    _attr_icon = "mdi:account-clock-outline"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._attr_unique_id = f"{entry.entry_id}_stamped"
        self._attr_device_info = device_info(entry)
        self._entry = entry
        self.entity_id = f"binary_sensor.{entity_prefix(entry)}_eingestempelt"

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, f"{SIGNAL_UPDATE}_{self._entry.entry_id}", self.async_write_ha_state))

    @property
    def is_on(self) -> bool:
        return bool(manager_of(self.hass, self._entry).data.get("stamp"))

    @property
    def extra_state_attributes(self):
        st = manager_of(self.hass, self._entry).data.get("stamp") or {}
        return {"seit": st.get("in"), "datum": st.get("date")}
