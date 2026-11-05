"""📄 Zettel vom Chef: „Zeitsaldenliste“ als PDF (oder als kopierter Text) lesen.

Geht nur mit diesem einen Zettel-Typ (Zeiterfassung mit Spalten Datum, Tag, Kommt, Geht, Gesamt …
und unten „Saldo Vormonat / Saldo Übertrag“). Ohne Zusatz-Pakete: Das PDF wird hier selbst
ausgepackt (zlib ist in Python schon drin). Fotos/Scans gehen nicht – da steht kein Text drin.
"""

from __future__ import annotations

import re
import zlib
from typing import Any

MONTHS = {"januar": 1, "februar": 2, "märz": 3, "maerz": 3, "april": 4, "mai": 5, "juni": 6, "juli": 7,
          "august": 8, "september": 9, "oktober": 10, "november": 11, "dezember": 12}
NOT_OK = "Das ist kein Zettel vom Typ „Zeitsaldenliste“ (als PDF vom Computer) – es wurde nichts geändert."


class ZettelError(ValueError):
    """Zettel passt nicht."""


# ------------------------------------------------------------------ 📦 PDF auspacken
def _objects(pdf: bytes) -> dict[int, bytes]:
    return {int(n): body for n, body in re.findall(rb"(\d+)\s+0\s+obj(.*?)endobj", pdf, re.S)}


def _stream(body: bytes) -> bytes | None:
    m = re.search(rb"stream\r?\n(.*?)\r?\n?endstream", body, re.S)
    if not m:
        return None
    raw = m.group(1)
    if b"/FlateDecode" in body.split(b"stream", 1)[0]:
        try:
            return zlib.decompress(raw)
        except zlib.error:
            try:
                return zlib.decompressobj().decompress(raw)
            except zlib.error:
                return None
    return raw


def _cmap(data: bytes) -> dict[int, str]:
    """ToUnicode: Glyph-Nummer → Buchstabe."""
    out: dict[int, str] = {}
    hexs = lambda h: bytes.fromhex(h.decode()).decode("utf-16-be", "ignore")  # noqa: E731
    for block in re.findall(rb"beginbfchar(.*?)endbfchar", data, re.S):
        for a, b in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            out[int(a, 16)] = hexs(b)
    for block in re.findall(rb"beginbfrange(.*?)endbfrange", data, re.S):
        for a, b, c in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])", block):
            lo, hi = int(a, 16), int(b, 16)
            if c.startswith(b"["):
                for i, h in enumerate(re.findall(rb"<([0-9A-Fa-f]+)>", c)):
                    out[lo + i] = hexs(h)
            else:
                start = bytes.fromhex(c[1:-1].decode())
                base = int.from_bytes(start, "big")
                for i in range(hi - lo + 1):
                    out[lo + i] = (base + i).to_bytes(len(start), "big").decode("utf-16-be", "ignore")
    return out


def _fonts(objs: dict[int, bytes]) -> dict[bytes, tuple]:
    """/F1 → (Zeichentabelle, Bytes pro Zeichen)."""
    fonts: dict[bytes, tuple] = {}
    for body in objs.values():
        res = re.search(rb"/Font\s*<<(.*?)>>", body, re.S)
        if not res:
            continue
        for name, ref in re.findall(rb"/(\w+)\s+(\d+)\s+0\s+R", res.group(1)):
            fobj = objs.get(int(ref), b"")
            tu = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", fobj)
            data = _stream(objs.get(int(tu.group(1)), b"")) if tu else None
            wide = 2 if b"/Type0" in fobj or b"Identity-H" in fobj else 1
            fonts[name] = (_cmap(data) if data else {}, wide, _widths(objs, fobj))
    return fonts


def _widths(objs: dict[int, bytes], fobj: bytes) -> dict[int, float]:
    """Breite jedes Zeichens (für die Spalten-Position)."""
    w: dict[int, float] = {}
    m = re.search(rb"/W\s*(\[(?:[^\[\]]|\[[^\]]*\])*\]|\d+\s+0\s+R)", fobj)
    if m:
        arr = m.group(1)
        if not arr.startswith(b"["):
            arr = objs.get(int(arr.split()[0]), b"").strip()
        toks = re.findall(rb"\[[^\]]*\]|[-\d.]+", arr[1:-1] if arr.startswith(b"[") else arr)
        i = 0
        while i < len(toks):
            if i + 1 < len(toks) and toks[i + 1].startswith(b"["):
                c = int(float(toks[i]))
                for j, v in enumerate(toks[i + 1][1:-1].split()):
                    w[c + j] = float(v)
                i += 2
            elif i + 2 < len(toks):
                for c in range(int(float(toks[i])), int(float(toks[i + 1])) + 1):
                    w[c] = float(toks[i + 2])
                i += 3
            else:
                break
    fc = re.search(rb"/FirstChar\s+(\d+)", fobj)
    ws = re.search(rb"/Widths\s*\[([^\]]*)\]", fobj)
    if fc and ws:
        for j, v in enumerate(ws.group(1).split()):
            w[int(fc.group(1)) + j] = float(v)
    return w


_TOK = re.compile(rb"\[(?:[^\]\\]|\\.)*\]|<[0-9A-Fa-f\s]*>|\((?:[^()\\]|\\.)*\)|/[^\s/\[\]()<>]+|[-+]?\d*\.?\d+|[A-Za-z'\"*]+")


def _lit(s: bytes) -> bytes:
    out, i = bytearray(), 0
    while i < len(s):
        c = s[i]
        if c == 0x5C and i + 1 < len(s):
            n = s[i + 1]
            if n in b"01234567":
                j = i + 1
                while j < len(s) and j < i + 4 and s[j] in b"01234567":
                    j += 1
                out.append(int(s[i + 1:j], 8) & 0xFF)
                i = j
                continue
            out.append({ord("n"): 10, ord("r"): 13, ord("t"): 9, ord("b"): 8, ord("f"): 12}.get(n, n))
            i += 2
            continue
        out.append(c)
        i += 1
    return bytes(out)


def _decode(raw: bytes, font: tuple, size: float) -> tuple[str, float]:
    """Bytes → (Text, wie breit er ist)."""
    cmap, wide, widths = font
    codes = [int.from_bytes(raw[i:i + wide], "big") for i in range(0, len(raw) - wide + 1, wide)]
    text = "".join(cmap.get(c, "") for c in codes) if cmap else raw.decode("latin-1")
    return text, sum(widths.get(c, 500) for c in codes) / 1000 * size


def pdf_lines(pdf: bytes) -> list[str]:
    """Alle Textzeilen der Seiten, von oben nach unten (so gut es geht)."""
    if not pdf.startswith(b"%PDF"):
        raise ZettelError(NOT_OK)
    objs = _objects(pdf)
    fonts = _fonts(objs)
    pieces: list[tuple[int, float, float, str]] = []  # (Seite, y, x, Text)
    page_no = 0
    for num_, body in sorted(objs.items()):
        if not re.search(rb"/Type\s*/Page\b", body):
            continue
        page_no += 1
        refs = re.search(rb"/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)", body)
        if not refs:
            continue
        data = b"".join(_stream(objs.get(int(r), b"")) or b"" for r in re.findall(rb"(\d+)\s+0\s+R", refs.group(1)))
        font: tuple = ({}, 1, {})
        size = 10.0
        x = y = 0.0
        stack: list[bytes] = []
        for t in _TOK.findall(data):
            if t[:1] in b"[<(/" or re.match(rb"[-+]?\d*\.?\d+$", t):
                stack.append(t)
                continue
            op = t
            if op == b"Tf" and len(stack) >= 2:
                font = fonts.get(stack[-2][1:], ({}, 1, {}))
                size = float(stack[-1])
            elif op == b"Tm" and len(stack) >= 6:
                x, y = float(stack[-2]), float(stack[-1])
            elif op in (b"Td", b"TD") and len(stack) >= 2:
                x, y = x + float(stack[-2]), y + float(stack[-1])
            elif op in (b"Tj", b"'", b'"', b"TJ") and stack:
                arg = stack[-1]
                parts = _TOK.findall(arg[1:-1]) if arg.startswith(b"[") else [arg]
                cx, start, text = x, x, ""
                for p in parts:
                    if p[:1] in b"<(":
                        raw = bytes.fromhex(re.sub(rb"\s", b"", p[1:-1]).decode() or "") if p.startswith(b"<") else _lit(p[1:-1])
                        t2, adv = _decode(raw, font, size)
                        text += t2
                        cx += adv
                    else:
                        try:
                            k = float(p)
                        except ValueError:
                            continue
                        if k < -1500 and text.strip():  # 📏 großer Abstand = neue Spalte
                            pieces.append((page_no, y, start, text))
                            text = ""
                        cx -= k / 1000 * size
                        if not text:
                            start = cx
                if text.strip():
                    pieces.append((page_no, y, start, text))
            stack = []
    rows: list[list[tuple[int, float, float, str]]] = []
    for p in sorted(pieces, key=lambda q: (q[0], q[1], q[2])):
        if rows and rows[-1][0][0] == p[0] and abs(rows[-1][0][1] - p[1]) < 2.5:
            rows[-1].append(p)
        else:
            rows.append([p])
    return ["  ".join(q[3].strip() for q in sorted(r, key=lambda q: q[2])) for r in rows]


# ------------------------------------------------------------------ 🔎 Zettel verstehen
def hm(text: str) -> float:
    """„9:13“ → 9,22 · „-3:20“ → -3,33."""
    m = re.fullmatch(r"\s*([-−]?)(\d{1,4}):(\d{2})\s*", text)
    if not m:
        raise ValueError(text)
    v = int(m.group(2)) + int(m.group(3)) / 60
    return round(-v if m.group(1) else v, 2)


_DAY = re.compile(r"^\s*(\d{2})\.(\d{2})\.(\d{4})\s*(Mo|Di|Mi|Do|Fr|Sa|So)(.*)$")
_PAIR = re.compile(r"\b([KGN])\s+(\d{1,2}:\d{2})")
_TIME = re.compile(r"(?<![\d:])[-−]?\d{1,3}:\d{2}(?![\d:])")
_SUM = {"saldo_vm": r"Saldo\s+Vormonat", "saldo_monat": r"Saldo\s+Monat", "saldo_ue": r"Saldo\s+[ÜU]e?bertrag",
        "soll": r"Sollzeit", "gesamt": r"^\s*Gesamt", "diff": r"Differenz", "ist": r"Istzeit", "abwesend": r"^\s*Abwesenheit"}


def parse_zettel(lines: list[str]) -> dict[str, Any]:
    """Textzeilen → {month, days{iso: {h, kind?, pause?}}, saldo_vm, saldo_ue, …}."""
    text = "\n".join(lines)
    head = re.search(r"Zeitsaldenliste\s+([A-Za-zÄÖÜäöü]+)\s+(\d{4})", text)
    if not head or head.group(1).lower() not in MONTHS:
        raise ZettelError(NOT_OK)
    month = f"{head.group(2)}-{MONTHS[head.group(1).lower()]:02d}"
    days: dict[str, dict[str, Any]] = {}
    out: dict[str, Any] = {"month": month, "days": days}
    for line in lines:
        m = _DAY.match(line)
        if m:
            iso = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
            if iso[:7] != month:
                continue
            rest = m.group(5)
            pm = list(_PAIR.finditer(rest))[:2]
            flags = set(re.findall(r"\b(VF|HF|K|U|SU|ZA)\b", rest[: pm[0].start()] if pm else rest))
            vals = [hm(v) for v in _TIME.findall(rest[pm[-1].end():] if pm else rest)]
            came = pm[0].group(2) if pm else "00:00"
            went = pm[1].group(2) if len(pm) > 1 else "00:00"
            e: dict[str, Any] = {}
            if came != "00:00" or went != "00:00":
                e = {"h": vals[0] if vals else 0.0, "in": came, "out": went}
                if len(vals) >= 4:
                    e["pause"] = vals[3]  # Spalten: Gesamt, Tag, Soll, Pause, Mehr.
            if "K" in flags:
                e["kind"] = "krank"
            elif "VF" in flags:
                e["kind"] = "feiertag"
            elif "HF" in flags:
                e["kind"] = "feiertag_halb"
            elif "U" in flags or "SU" in flags:
                e["kind"] = "urlaub"
            if e.get("kind") and "h" not in e and vals:
                e["h"] = vals[-1]  # 🏖️ bei Abwesenheit: die angerechneten Stunden
            if e:
                days[iso] = e
            continue
        for key, pat in _SUM.items():
            if key in out:
                continue
            mm = re.search(pat + r"\s+([-−]?\d{1,4}:\d{2})", line)
            if mm:
                out[key] = hm(mm.group(1))
    if not days and "saldo_ue" not in out:
        raise ZettelError(NOT_OK)
    return out


def read_zettel(data: bytes) -> dict[str, Any]:
    """PDF-Bytes oder Text → Zettel."""
    if data.startswith(b"%PDF"):
        lines = pdf_lines(data)
    else:
        try:
            lines = data.decode("utf-8").splitlines()
        except UnicodeDecodeError as err:
            raise ZettelError(NOT_OK) from err
    return parse_zettel(lines)
