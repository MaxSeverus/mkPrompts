# mkPrompts – Moderne Prompt-Bibliothek

Eine moderne Web-Anwendung zur Verwaltung und öffentlichen Anzeige von KI-Prompts mit:

- **Öffentlichem Bereich** (`/`) mit Suche, Sortierung und Copy-to-Clipboard.
- **Geschütztem Admin-Bereich** (`/admin`) mit Login und vollständigem CRUD.
- **Persistenter Speicherung** per SQLite (`data/prompts.db`).

## Projektstruktur

- `app.py` – Python-HTTP-Server inkl. REST-API, Passwortschutz, Session-Cookie und Datenbanklogik.
- `static/index.html` – Öffentliche Ansicht.
- `static/admin.html` – Admin-Ansicht (Login + Verwaltung).
- `static/styles.css` – Modernes responsives Styling.
- `static/shared.js` – Gemeinsame Hilfsfunktionen (Escaping + Parameter-Highlighting).
- `static/public.js` – Frontend-Logik für die öffentliche Tabelle.
- `static/admin.js` – Frontend-Logik für den Admin-Bereich.
- `data/prompts.db` – SQLite-Datenbank (wird beim Start automatisch angelegt).

## Start lokal

```bash
python3 app.py
```

Danach erreichbar unter: `http://localhost:8000`

### Optionale Umgebungsvariablen

```bash
export ADMIN_PASSWORD="dein-passwort"
export SESSION_SECRET="lange-zufallszeichenkette"
export PORT=8000
python3 app.py
```

## Hinweise

- Initialdaten sind aktuell mit dem vom Auftrag gelieferten Platzhalter vorbelegt:
  - `[HIER DIE VOLLSTÄNDIGE LISTE DER BESTEHENDEN PROMPTS 1:1 EINFÜGEN]`
- Sobald die vollständige Prompt-Liste vorliegt, kann sie direkt per Admin-Maske oder DB-Seed ersetzt werden.

## Nächste sinnvolle Ausbaustufen

1. Rollen-/Benutzerverwaltung statt Single-Passwort.
2. Versionierung und Historie je Prompt.
3. Tags/Kategorien + Filterchips.
4. CSV/JSON Import & Export.
5. Audit-Log für Änderungen im Admin-Bereich.
6. Testsuite (API + UI) und CI-Pipeline.
7. Deployment-Setup (Docker, Reverse Proxy, HTTPS, Backups).
