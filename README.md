# Prompt-Bibliothek (PHP + JS + PDO)

Moderne Web-Anwendung zur öffentlichen Anzeige und internen Verwaltung von KI-Prompts.

## Projektstruktur

```text
mkPrompts/
├── admin/
│   └── index.php              # Admin-Oberfläche (/admin)
├── api/
│   ├── prompts.php            # Öffentliche Prompt-API (Suche/Sortierung)
│   ├── admin_login.php        # Login
│   ├── admin_logout.php       # Logout
│   ├── admin_session.php      # Session-Status
│   └── admin_prompts.php      # CRUD für Admin
├── assets/
│   ├── css/style.css          # Modernes responsives Design
│   └── js/
│       ├── app.js             # Öffentliche Interaktionen
│       └── admin.js           # Admin-Interaktionen
├── data/                      # SQLite-Datei (lokal)
├── src/
│   ├── config.php             # .env + App-Konfiguration
│   ├── db.php                 # PDO + Schema + Seed
│   └── http.php               # JSON/Request/Auth-Helfer
├── index.php                  # Öffentliche Startseite
├── .env.example               # Konfigurationsvorlage
└── .htaccess                  # all-inkl/Apache Unterstützung
```

## Stack-Entscheidung (kurz)

- **PHP + Vanilla JS + CSS**: sehr gut auf klassischem Webhosting (all-inkl) einsetzbar.
- **PDO-Abstraktion**: lokal bequem mit SQLite, produktiv mit MySQL/MariaDB.
- **Kein Build-Schritt**: schnell lokal startbar und einfach deploybar.

## Lokaler Start

1. PHP 8.1+ installieren.
2. Konfiguration erstellen:
   ```bash
   cp .env.example .env
   ```
3. Optional `ADMIN_PASSWORD` in `.env` setzen.
4. App starten:
   ```bash
   php -S 127.0.0.1:8080
   ```
5. Aufrufen:
   - Öffentlich: `http://127.0.0.1:8080/`
   - Admin: `http://127.0.0.1:8080/admin`

## Datenbank-Konfiguration

### Lokal (Standard)
- `DB_DRIVER=sqlite`
- `SQLITE_PATH=./data/prompts.sqlite`

### all-inkl / produktiv
- In `.env` auf `DB_DRIVER=mariadb` (oder `mysql`) wechseln und Zugangsdaten eintragen.
- Tabelle wird beim ersten Aufruf automatisch angelegt.
- Zugangsdaten bleiben außerhalb des Codes in der `.env`.

## Hinweis zu Initialdaten

Die Anwendung übernimmt den gelieferten Platzhalter-Eintrag als Seed:
`[HIER DIE VOLLSTÄNDIGE LISTE DER BESTEHENDEN PROMPTS 1:1 EINFÜGEN]`

Sobald die echte Liste vorliegt, kann sie in `src/db.php` im Seed-Bereich ersetzt werden.

## Vorbereitung für Hosting bei all-inkl

- Dateien direkt per FTP/WebDAV in das Webroot hochladen.
- `.env` mit produktiven Werten ergänzen.
- Schreibrechte für `data/` nur dann nötig, wenn SQLite genutzt wird.
- Für MySQL/MariaDB keine Schreibrechte auf Dateiebene nötig.

## Nächste Ausbaustufen

1. Rollenmodell (mehrere Admins, Rechteverwaltung).
2. Revisionshistorie für Prompt-Änderungen.
3. Kategorien, Tags und Favoriten.
4. CSV/JSON-Import und Export.
5. CSRF-Token + Rate Limiting + Passwort-Hashing in DB.
