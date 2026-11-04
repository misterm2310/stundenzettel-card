<img src="docs/icon.png" width="96" align="right" alt="Icon">

# ⏱️ Stundenzettel (timesheet) for Home Assistant

🇩🇪 **Deutsch?** → [README auf Deutsch](README.md)

**No more handwritten timesheets.** The card takes your working hours from your calendar (or you clock in by button, or automatically by phone zone), subtracts the break and keeps your **overtime balance** – just like the old paper sheet.

One click opens it right in your Home Assistant: [![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=misterm2310&repository=stundenzettel-card&category=integration) [![Add integration](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=stundenzettel)

![Preview – Stundenzettel (made-up times only)](docs/screenshot.png)

> 🔒 **Your times stay with you.** Everything lives only in your Home Assistant. No cloud. This repo contains made-up example data only.

> 🧪 **Brand new (version 0.2).** The card speaks German and English (automatically like your Home Assistant, or `language: en`).

## ✨ Features

- ⏱️ Today at a glance: today's hours big at the top (running while clocked in), then hours this month and overtime balance.
- 📅 Reads a daily calendar event (default name „Arbeiten“) with start and end – every 15 minutes, including note and „(+0,50 h Pause)“.
- 📤 Optional: writes your times back to the calendar (Google: delete + create, because Home Assistant can't edit Google events).
- ⏱️ Clock in/out by button or automatically when your phone enters/leaves a zone. Rounding to 5 or 15 minutes.
- ⚖️ Overtime balance per month: total − paid hours = plus/minus, previous balance + plus/minus + correction = new balance. Current month counts the target only up to today.
- 🏖️ Vacation, sick, holiday, day off, flat rate days. Vacation left and sick days per year.
- ☕ Break rules by duration or by the time you leave (e.g. until 12:00 → 0.25, later → 0.50), 💶 paid hours per month (with history like „until Dec 2019: 160“), corrections, 🎌 holidays from a holiday calendar.
- 📥 Import an old sheet by pasting text, then „set the balance“ to the value of the paper sheet.
- 📤 Print & share month or year as PDF (WhatsApp, mail, iPhone printing), print or as text, 📄 CSV, 💾 backup, 📜 log, 📌 sidebar.
- 📱 Offline app for your phone (⚙️ → App & info → Offline app): clock in and enter days without signal, sent later with the original time. Home-screen shortcuts „Kommen“/„Gehen“, fingerprint lock.
- 🔒 PIN lock for ⚙️ or the whole card (checked offline too, relocks after 10 minutes). Forgot it? Devices & services → Stundenzettel → Configure → Reset PIN.
- ⏰ Mascot: a little alarm clock with moods and seasonal costumes (off by default). 🙈 Veil overtime, ↩️ undo, 🧘 calm mode, hide tabs.

## 📦 Installation

1. **HACS → ⋮ → Custom repositories** → `https://github.com/misterm2310/stundenzettel-card`, type **Integration**.
2. Download **Stundenzettel**, restart Home Assistant.
3. **Settings → Devices & services → Add integration → Stundenzettel**.
4. Add the card: `type: custom:stundenzettel-card` (options: `title`, `language: de|en`)

## 🤖 Automations

Sensors: `sensor.stundenzettel_ueberstunden`, `sensor.stundenzettel_stunden_diesen_monat`, `sensor.stundenzettel_resturlaub`, `sensor.stundenzettel_kranktage_dieses_jahr`, `binary_sensor.stundenzettel_eingestempelt`.
Actions: `stundenzettel.kommen` (clock in), `stundenzettel.gehen` (clock out), `stundenzettel.tag_eintragen` (record a day), `stundenzettel.abgleichen` (sync), `stundenzettel.daten_abrufen` (get data).

## 💙 Donate

Free forever. If you like it: [paypal.me/MarcoStrickmann](https://paypal.me/MarcoStrickmann) ☕

Ideas → [Discussions](https://github.com/misterm2310/stundenzettel-card/discussions) · Bugs → [Issues](https://github.com/misterm2310/stundenzettel-card/issues) (please no real working times!)

License: MIT · by [Mister-M](https://github.com/misterm2310) · Icons: [Material Design Icons](https://pictogrammers.com) (Apache 2.0)
