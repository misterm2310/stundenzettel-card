"""📊 Sensoren: Überstunden-Konto, Stunden diesen Monat, Urlaub und Krank – für Dashboard und eigene Automationen."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SIGNAL_UPDATE, VERSION


@dataclass(frozen=True, kw_only=True)
class SzSensorDescription(SensorEntityDescription):
    value: Callable[[dict[str, Any]], Any]
    attrs: Callable[[dict[str, Any]], dict[str, Any]] | None = None


SENSORS = [
    SzSensorDescription(key="balance", name="Überstunden", icon="mdi:scale-balance", native_unit_of_measurement="h",
                        state_class=SensorStateClass.MEASUREMENT, suggested_display_precision=2, value=lambda s: s["balance"],
                        attrs=lambda s: {"stand_vormonat": s["last_month_total"]}),
    SzSensorDescription(key="month", name="Stunden diesen Monat", icon="mdi:clock-outline", native_unit_of_measurement="h",
                        state_class=SensorStateClass.MEASUREMENT, suggested_display_precision=2, value=lambda s: s["month_hours"],
                        attrs=lambda s: {"bezahlt": s["month_paid"]}),
    SzSensorDescription(key="vacation_left", name="Resturlaub", icon="mdi:beach", native_unit_of_measurement="Tage",
                        value=lambda s: s["vacation_left"], attrs=lambda s: {"genommen": s["vacation_taken"]}),
    SzSensorDescription(key="sick", name="Kranktage dieses Jahr", icon="mdi:emoticon-sick-outline", native_unit_of_measurement="Tage",
                        value=lambda s: s["sick_days"]),
]


def device_info(entry: ConfigEntry) -> DeviceInfo:
    return DeviceInfo(identifiers={(DOMAIN, entry.entry_id)}, name=entry.title or "Stundenzettel", manufacturer="Mister-M",
                      sw_version=VERSION, entry_type=DeviceEntryType.SERVICE)


def entity_prefix(entry: ConfigEntry) -> str:
    """🏷️ Der erste heißt wie bisher „stundenzettel_…“, jeder weitere nach seinem Namen (z. B. „stundenzettel_anna_…“)."""
    if entry.unique_id in (None, DOMAIN):
        return "stundenzettel"
    slug = _slug(entry.title or "") or str(entry.unique_id)
    return slug if slug.startswith("stundenzettel") else f"stundenzettel_{slug}"


def manager_of(hass: HomeAssistant, entry: ConfigEntry):
    return hass.data[DOMAIN]["managers"][entry.entry_id]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities(SzSensor(hass, entry, d) for d in SENSORS)


def _slug(name: str) -> str:
    out = name.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), (" ", "_")):
        out = out.replace(a, b)
    return "".join(c if c.isalnum() or c == "_" else "_" for c in out).strip("_")


class SzSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, desc: SzSensorDescription) -> None:
        self.hass = hass
        self.entity_description = desc
        self._attr_unique_id = f"{entry.entry_id}_{desc.key}"
        self._attr_device_info = device_info(entry)
        self._entry = entry
        self.entity_id = f"sensor.{entity_prefix(entry)}_{_slug(desc.name)}"

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, f"{SIGNAL_UPDATE}_{self._entry.entry_id}", self._update))

    @callback
    def _update(self) -> None:
        self.async_write_ha_state()

    @property
    def _sum(self) -> dict[str, Any]:
        return manager_of(self.hass, self._entry).summary()

    @property
    def native_value(self) -> Any:
        return self.entity_description.value(self._sum)

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        return self.entity_description.attrs(self._sum) if self.entity_description.attrs else None
