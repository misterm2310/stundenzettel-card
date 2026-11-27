<img src="docs/icon.png" width="96" align="right" alt="Icon">

# ⏱️ Stundenzettel (timesheet) for Home Assistant

🇩🇪 **Deutsch?** → [README auf Deutsch](README.md)

**No more handwritten timesheets.** The card takes your working hours from your calendar (or you clock in by button, or automatically by phone zone), subtracts the break and keeps your **overtime balance** – just like the old paper sheet.

One click opens it right in your Home Assistant: [![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=misterm2310&repository=stundenzettel-card&category=integration) [![Add integration](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=stundenzettel) [![Downloads](https://img.shields.io/github/downloads/misterm2310/stundenzettel-card/total?label=Downloads)](https://github.com/misterm2310/stundenzettel-card/releases)

![Preview – Stundenzettel (made-up times only)](docs/screenshot.png)

> 🔒 **Your times stay with you.** Everything lives only in your Home Assistant. No cloud. This repo contains made-up example data only.

> 🧪 **Brand new (version 0.2).** The card speaks German and English (automatically like your Home Assistant, or `language: en`).

## ✨ Features

- ⏱️ Today at a glance: today's hours big at the top (running while clocked in), then hours this month and overtime balance.
- 📅 Reads a daily calendar event (default name „Arbeiten“) with start and end – every 15 minutes, including note and „(+0,50 h Pause)“.
- 📤 Optional: writes your times back to the calendar (Google: delete + create, because Home Assistant can't edit Google events). Missing events are created again; „write all days“ catches up on a whole period.
- ⏱️ Two fields „Kommen“/„Gehen“ (arrive/leave) under Today – tap, change the time, done. ⏱️ clocks in/out now, or automatically when your phone enters/leaves a zone. Rounding to 5 or 15 minutes.
- ⚖️ Overtime balance per month: total − paid hours = plus/minus, previous balance + plus/minus + correction = new balance. Current month counts the target only up to today. 💶 Enter the carried-over balance from your payslip each month – the card continues with your boss's number and shows the difference.
- 📊 Statistics: overtime curve, hours per month with target line, weekdays, vacation & sick per year, records – for one year or all years.
- 🏖️ Work, vacation, sick, holiday, day off, flat rate days. Vacation left and sick days per year. Under vacation you pick **full day | ½ day** (½ counts half plus what you still worked that day), under sick **me | child** – child sick is counted separately (for the German child sickness benefit).
- 📆 Several days at once: in a day with vacation, sick or day off just pick **“To”** (e.g. “until Friday”) and save once – or “vacation 3rd–14th” in the vacation planner. Weekends, days off and holidays are skipped.
- 🗓️ Vacation planner with bridge days (in a day under vacation → “Plan vacation” or Today → 📆 Several days): “take the 2nd–5th and 12 days are left” (across New Year for both years) plus tips where 1 vacation day gets you 4 days off, from your holiday calendar.
- ✂️ Split day: two time blocks on one day (e.g. 6–11 and 13–17 with the doctor in between) – the gap already counts as a break.
- 🔍 Note search across all days: “When was I in Lünen?” – tap a hit to jump to the day.
- ⚠️ Calendar conflict: if your calendar says vacation/sick but you clocked in (or “Arbeiten” in the calendar but vacation in the card), Today shows a note – “View” or “That's fine”.
- ☕ Break rules by duration or by the time you leave (e.g. until 12:00 → 0.25, later → 0.50), 💶 paid hours per month (with history like „until Dec 2019: 160“), corrections, 🎌 holidays from a holiday calendar.
- 📄 Compare your employer's timesheet: pick the „Zeitsaldenliste“ PDF in a month – where their hours differ they appear left of yours (green = employer has more, red = fewer), plus their balance; „Saldo Vormonat“ can be taken over as carried-over hours with one tap. Works only with this timesheet type (PDF from a computer, no photos).
- ⓘ Tap-help: small ⓘ next to the fields in ⚙️ instead of long texts.
- 📥 Import an old sheet by pasting text. From Google Sheets/Excel the monthly values come along too (total, carried over, balance, 8 hours and more), otherwise „set the balance“ to the value of the paper sheet.
- 📤 Print & share month or year as PDF (WhatsApp, mail, iPhone printing), print or as text – with ✍️ signature lines for you and your employer at the bottom, 📄 CSV, 💾 backup, 📜 log, 📌 sidebar.
- 📱 Offline app for your phone (⚙️ → App & info → Offline app): clock in and enter days without signal, sent later with the original time – on Android (Chrome) even in the background when the app is closed. Home-screen shortcuts „Kommen“/„Gehen“, fingerprint lock.
- 📅 Flip through days in Today: ‹ › at the top of the hours tile or swipe.
- 👥 Several timesheets: for a second person with their own employer simply add the integration again (with its own name) – own entries, own PIN, own sensors. In the card editor you pick which timesheet the card shows.
- 📝 Note bar: on work days your 6 most used places and 6 activities sit right under Arrive/Leave in Today (learned from your notes) – **one tap and it's in the note**, also while clocked in and offline, with ↩️ undo. Each place goes on a new line. If the note only says “Baustelle” from the calendar, the place replaces it (word adjustable under ⚙️ → Notes); the times from the calendar stay. The day form has the same buttons (work only). 📍 **Place from phone**: in ⚙️ → Clock in by phone pick your HA app's “… Geocoded location” sensor – the town you are in (e.g. Lünen) is shown first and preselected.
- 🔒 PIN lock for ⚙️, for changes in the month and to older days (today and yesterday stay free) or the whole card (checked offline too, relocks after 10 minutes). Forgot it? Devices & services → Stundenzettel → Configure → Reset PIN.
- ⏰ Mascot: a little alarm clock with moods and seasonal costumes (off by default). 🙈 Veil overtime, ↩️ undo, 🧘 calm mode, hide tabs.

## 📦 Installation

Install via HACS (from Home Assistant 2026.11: Settings > Marketplace).

1. **HACS → ⋮ → Custom repositories** → `https://github.com/misterm2310/stundenzettel-card`, type **Integration**.
2. Download **Stundenzettel**, restart Home Assistant.
3. **Settings → Devices & services → Add integration → Stundenzettel**.
4. Add the card: `type: custom:stundenzettel-card` (options: `title`, `language: de|en`)

## 🤖 Automations

Sensors: `sensor.stundenzettel_ueberstunden`, `sensor.stundenzettel_stunden_diesen_monat`, `sensor.stundenzettel_resturlaub`, `sensor.stundenzettel_kranktage_dieses_jahr`, `sensor.stundenzettel_kind_krank_dieses_jahr` (child sick days), `binary_sensor.stundenzettel_eingestempelt`.
Actions: `stundenzettel.kommen` (clock in), `stundenzettel.gehen` (clock out), `stundenzettel.tag_eintragen` (record a day), `stundenzettel.abgleichen` (sync), `stundenzettel.daten_abrufen` (get data). With several timesheets pick the one you mean in the **Timesheet** field (empty = the first); the sensors of a second timesheet are named after it, e.g. `sensor.stundenzettel_erika_ueberstunden`.

**⏳ When will the next beta come?** To be honest: I build these integrations with the help of Claude (AI). How fast new betas come depends on how much Claude quota (tokens) is available. Once it is used up, I have to wait until it is refilled – no tokens, no betas. 😅 Thank you for your patience and understanding! 🙏

## 💙 Donate

⭐ **Like the card? Give us a star:** on [GitHub](https://github.com/misterm2310/stundenzettel-card), tap “⭐ Star” at the top right (free GitHub account needed) – that shows me how many people like the card and helps others find it. The button is also under ⚙️ → Credits.

📊 **Download counter:** the “Downloads” badge at the top counts how often the ready-made ZIP file of the releases (betas and official versions together) was downloaded. Only GitHub counts this, nothing about you is sent.

Free forever. If you like it: [paypal.me/MarcoStrickmann](https://paypal.me/MarcoStrickmann) ☕

Ideas → [Discussions](https://github.com/misterm2310/stundenzettel-card/discussions) · Bugs → [Issues](https://github.com/misterm2310/stundenzettel-card/issues) (please no real working times!)

License: MIT · by [Mister-M](https://github.com/misterm2310) · Icons: [Material Design Icons](https://pictogrammers.com) (Apache 2.0)
