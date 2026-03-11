#!/usr/bin/env python3
"""Prompt-Bibliothek mit öffentlichem Bereich und Admin-CRUD (ohne externe Abhängigkeiten)."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import csv
import io
import re
import urllib.parse
import cgi
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
ROOT_INDEX = BASE_DIR / "index.html"
DB_PATH = BASE_DIR / "data" / "prompts.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "mkprompts-demo-2026")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")

DEFAULT_SITE_CONTENT = {
    "hero_title": "KI Prompt Hub",
    "hero_subtitle": "Eine moderne JavaScript-Seite mit kuratierter Prompt-Bibliothek und live Datenbank-Anbindung.",
    "hero_badge": "Datenbank-gestützt",
    "highlights": [
        {"title": "Schnelle Suche", "text": "Durchsuche alle Prompts in Millisekunden und kopiere sie direkt."},
        {"title": "Saubere Struktur", "text": "Sortierung nach Nummer oder Kürzel für einen klaren Workflow."},
        {"title": "Zentral gepflegt", "text": "Alle Inhalte werden über Datenbanktabellen verwaltet."},
    ],
}


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nr INTEGER NOT NULL,
            abkuerzung TEXT NOT NULL,
            prompt TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS site_content (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            content_json TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute("SELECT COUNT(*) FROM site_content")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO site_content (id, content_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)",
            (json.dumps(DEFAULT_SITE_CONTENT, ensure_ascii=False),),
        )
    conn.commit()
    conn.close()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_site_content(conn: sqlite3.Connection) -> dict[str, Any]:
    row = conn.execute("SELECT content_json FROM site_content WHERE id = 1").fetchone()
    if not row:
        return DEFAULT_SITE_CONTENT
    try:
        data = json.loads(row["content_json"])
    except json.JSONDecodeError:
        return DEFAULT_SITE_CONTENT
    return data if isinstance(data, dict) else DEFAULT_SITE_CONTENT


def sign_value(value: str) -> str:
    signature = hmac.new(SESSION_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{signature}"


def is_valid_signed_value(signed: str) -> bool:
    try:
        value, signature = signed.rsplit(".", 1)
    except ValueError:
        return False
    expected = hmac.new(SESSION_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


def parse_csv_prompts(file_bytes: bytes) -> list[dict[str, Any]]:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    rows: list[dict[str, Any]] = []
    reader = csv.DictReader(io.StringIO(text), delimiter=",")
    if reader.fieldnames and {"nr", "abkuerzung", "prompt"}.issubset({h.strip().lower() for h in reader.fieldnames}):
        for row in reader:
            mapped = {k.strip().lower(): (v or "") for k, v in row.items()}
            rows.append(
                {
                    "nr": int(str(mapped.get("nr", "")).strip()),
                    "abkuerzung": str(mapped.get("abkuerzung", "")).strip(),
                    "prompt": str(mapped.get("prompt", "")).strip(),
                }
            )
        return [r for r in rows if r["abkuerzung"] and r["prompt"]]

    reader_plain = csv.reader(io.StringIO(text), delimiter=",")
    for line in reader_plain:
        if len(line) < 3:
            continue
        rows.append({"nr": int(str(line[0]).strip()), "abkuerzung": str(line[1]).strip(), "prompt": str(line[2]).strip()})
    return [r for r in rows if r["abkuerzung"] and r["prompt"]]


def parse_php_prompts(file_bytes: bytes) -> list[dict[str, Any]]:
    text = file_bytes.decode("utf-8", errors="replace")
    chunks = re.findall(r"(?:array\s*\(|\[)(.*?)(?:\)|\])", text, flags=re.S)
    rows: list[dict[str, Any]] = []
    for chunk in chunks:
        nr_match = re.search(r"['\"]nr['\"]\s*=>\s*(\d+)", chunk)
        abk_match = re.search(r"['\"]abkuerzung['\"]\s*=>\s*['\"](.*?)['\"]", chunk, flags=re.S)
        prompt_match = re.search(r"['\"]prompt['\"]\s*=>\s*['\"](.*?)['\"]", chunk, flags=re.S)
        if not (nr_match and abk_match and prompt_match):
            continue
        prompt = prompt_match.group(1).replace("\\n", "\n").strip()
        rows.append(
            {
                "nr": int(nr_match.group(1)),
                "abkuerzung": abk_match.group(1).strip(),
                "prompt": prompt,
            }
        )
    return [r for r in rows if r["abkuerzung"] and r["prompt"]]


class AppHandler(BaseHTTPRequestHandler):
    def _parse_json(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"
        return json.loads(body.decode("utf-8"))

    def _send_json(self, payload: dict[str, Any] | list[Any], status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_static(self, path: str) -> tuple[bytes, str] | None:
        cleaned = path.lstrip("/") or "index.html"
        if cleaned == "index.html":
            target = ROOT_INDEX.resolve()
            base = BASE_DIR.resolve()
        elif cleaned.startswith("static/"):
            target = (BASE_DIR / cleaned).resolve()
            base = BASE_DIR.resolve()
        else:
            target = (STATIC_DIR / cleaned).resolve()
            base = STATIC_DIR.resolve()

        if not str(target).startswith(str(base)) or not target.exists() or target.is_dir():
            return None
        ctype = "text/plain; charset=utf-8"
        if target.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif target.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif target.suffix == ".js":
            ctype = "application/javascript; charset=utf-8"
        return target.read_bytes(), ctype

    def _is_admin(self) -> bool:
        raw = self.headers.get("Cookie", "")
        cookie = SimpleCookie()
        cookie.load(raw)
        token = cookie.get("admin_session")
        return bool(token and is_valid_signed_value(token.value))

    def _forbidden(self) -> None:
        self._send_json({"error": "Nicht autorisiert."}, 401)

    def _set_session_cookie(self) -> None:
        value = sign_value(secrets.token_hex(16))
        self.send_header("Set-Cookie", f"admin_session={value}; Path=/; HttpOnly; SameSite=Lax")

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/prompts":
            query = urllib.parse.parse_qs(parsed.query)
            sort = query.get("sort", ["nr"])[0]
            order_by = "nr ASC, abkuerzung ASC" if sort == "nr" else "abkuerzung COLLATE NOCASE ASC, nr ASC"
            conn = get_conn()
            rows = conn.execute(f"SELECT id, nr, abkuerzung, prompt FROM prompts ORDER BY {order_by}").fetchall()
            conn.close()
            self._send_json([dict(row) for row in rows])
            return

        if parsed.path == "/api/admin/prompts":
            if not self._is_admin():
                self._forbidden()
                return
            conn = get_conn()
            rows = conn.execute("SELECT id, nr, abkuerzung, prompt FROM prompts ORDER BY nr ASC, abkuerzung ASC").fetchall()
            conn.close()
            self._send_json([dict(row) for row in rows])
            return

        if parsed.path == "/api/admin/status":
            self._send_json({"authenticated": self._is_admin()})
            return

        if parsed.path == "/api/site-content":
            conn = get_conn()
            content = get_site_content(conn)
            conn.close()
            self._send_json(content)
            return

        if parsed.path == "/api/admin/site-content":
            if not self._is_admin():
                self._forbidden()
                return
            conn = get_conn()
            content = get_site_content(conn)
            conn.close()
            self._send_json(content)
            return

        if parsed.path == "/admin":
            parsed = parsed._replace(path="/admin.html")

        if parsed.path == "/":
            parsed = parsed._replace(path="/index.html")

        static_result = self._read_static(parsed.path)
        if not static_result:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content, ctype = static_result
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/admin/login":
            payload = self._parse_json()
            submitted = payload.get("password", "")
            if hmac.compare_digest(submitted, ADMIN_PASSWORD):
                data = json.dumps({"success": True}, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._set_session_cookie()
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self._send_json({"success": False, "error": "Passwort ungültig."}, 401)
            return

        if self.path == "/api/admin/logout":
            data = json.dumps({"success": True}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", "admin_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path == "/api/admin/prompts":
            if not self._is_admin():
                self._forbidden()
                return
            payload = self._parse_json()
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO prompts (nr, abkuerzung, prompt, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                (int(payload["nr"]), payload["abkuerzung"].strip(), payload["prompt"].strip()),
            )
            conn.commit()
            inserted = conn.execute("SELECT id, nr, abkuerzung, prompt FROM prompts WHERE id = ?", (cur.lastrowid,)).fetchone()
            conn.close()
            self._send_json(dict(inserted), 201)
            return

        if self.path == "/api/admin/import":
            if not self._is_admin():
                self._forbidden()
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                    "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
                },
            )
            if "file" not in form:
                self._send_json({"error": "Keine Datei empfangen."}, 400)
                return
            file_item = form["file"]
            if not getattr(file_item, "filename", ""):
                self._send_json({"error": "Keine Datei empfangen."}, 400)
                return

            filename = file_item.filename.lower()
            file_data = file_item.file.read()

            try:
                if filename.endswith(".csv"):
                    imported = parse_csv_prompts(file_data)
                elif filename.endswith(".php"):
                    imported = parse_php_prompts(file_data)
                else:
                    self._send_json({"error": "Nur CSV- oder PHP-Dateien sind erlaubt."}, 400)
                    return
            except (ValueError, TypeError):
                self._send_json({"error": "Datei konnte nicht verarbeitet werden."}, 400)
                return

            if not imported:
                self._send_json({"error": "Keine gültigen Prompt-Einträge gefunden."}, 400)
                return

            conn = get_conn()
            conn.executemany(
                "INSERT INTO prompts (nr, abkuerzung, prompt, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                [(item["nr"], item["abkuerzung"], item["prompt"]) for item in imported],
            )
            conn.commit()
            conn.close()
            self._send_json({"success": True, "imported": len(imported)})
            return

        if self.path == "/api/admin/site-content":
            if not self._is_admin():
                self._forbidden()
                return
            payload = self._parse_json()
            if not isinstance(payload, dict):
                self._send_json({"error": "Ungültige Daten."}, 400)
                return
            merged = {
                "hero_title": str(payload.get("hero_title", DEFAULT_SITE_CONTENT["hero_title"])).strip() or DEFAULT_SITE_CONTENT["hero_title"],
                "hero_subtitle": str(payload.get("hero_subtitle", DEFAULT_SITE_CONTENT["hero_subtitle"])).strip()
                or DEFAULT_SITE_CONTENT["hero_subtitle"],
                "hero_badge": str(payload.get("hero_badge", DEFAULT_SITE_CONTENT["hero_badge"])).strip() or DEFAULT_SITE_CONTENT["hero_badge"],
                "highlights": payload.get("highlights", DEFAULT_SITE_CONTENT["highlights"]),
            }
            if not isinstance(merged["highlights"], list):
                merged["highlights"] = DEFAULT_SITE_CONTENT["highlights"]

            conn = get_conn()
            conn.execute(
                """UPDATE site_content
                   SET content_json = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = 1""",
                (json.dumps(merged, ensure_ascii=False),),
            )
            conn.commit()
            conn.close()
            self._send_json(merged)
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:  # noqa: N802
        if not self.path.startswith("/api/admin/prompts/"):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not self._is_admin():
            self._forbidden()
            return
        prompt_id = int(self.path.rsplit("/", 1)[1])
        payload = self._parse_json()
        conn = get_conn()
        conn.execute(
            """UPDATE prompts
               SET nr = ?, abkuerzung = ?, prompt = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (int(payload["nr"]), payload["abkuerzung"].strip(), payload["prompt"].strip(), prompt_id),
        )
        conn.commit()
        row = conn.execute("SELECT id, nr, abkuerzung, prompt FROM prompts WHERE id = ?", (prompt_id,)).fetchone()
        conn.close()
        if not row:
            self._send_json({"error": "Prompt nicht gefunden."}, 404)
            return
        self._send_json(dict(row))

    def do_DELETE(self) -> None:  # noqa: N802
        if not self.path.startswith("/api/admin/prompts/"):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not self._is_admin():
            self._forbidden()
            return
        prompt_id = int(self.path.rsplit("/", 1)[1])
        conn = get_conn()
        conn.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))
        conn.commit()
        conn.close()
        self._send_json({"success": True})


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Server läuft auf http://{HOST}:{PORT}")
    server.serve_forever()
