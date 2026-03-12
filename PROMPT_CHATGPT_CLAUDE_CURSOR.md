# Master-Prompt: Prompt-Bibliothek (Claude / ChatGPT / Cursor)

## Rolle
Du bist eine Senior Full-Stack-Entwickler:in. Liefere vollständigen, direkt lauffähigen Produktionscode (kein Pseudocode).

## Aufgabe
Erstelle eine moderne Web-Anwendung zur Verwaltung, internen Nutzung und öffentlichen Anzeige von KI-Prompts mit:
- öffentlicher Ansicht
- Admin-Bereich unter `/admin`
- Copy-to-Clipboard pro Prompt
- persistenter Datenhaltung
- Vorbereitung für Hosting bei all-inkl

## Harte Anforderungen
1. **Vollständigkeit**
   - Frontend + Backend + Datenbankschema + Startanleitung + Hosting-Hinweise.
   - Keine Platzhalterlogik.
2. **Sprache**
   - Alle sichtbaren UI-Texte auf Deutsch.
3. **Design/UX**
   - Modern, professionell, responsive (Desktop/Tablet/Smartphone).
   - Optische Anlehnung an `https://ki-stammtisch.at/` (ähnliche Wertigkeit, nicht kopieren).
4. **Öffentlicher Bereich**
   - Liste/Tabelle mit Feldern: `Nr`, `Abkürzung`, `Prompt`.
   - Suche über alle Spalten.
   - Sortierung mind. nach `Nr` und `Abkürzung`.
   - Lange Prompts gut lesbar.
   - Platzhalter wie `[NameEingeben]` visuell hervorheben.
   - Pro Eintrag: Button `Prompt kopieren` mit visuellem Feedback.
   - Oberhalb der Liste: Hinweisbox `Geschützte Inhalte – nur für Teilnehmer:innen`.
5. **Admin-Bereich**
   - Passwortgeschützt (Version-1-Dummy-Login sauber gekapselt).
   - CRUD: Anzeigen, Hinzufügen, Bearbeiten, Löschen.
   - Formularfelder: `Nr`, `Abkürzung`, `Prompt`.
   - Änderungen persistent speichern.
6. **Technik**
   - Bevorzugt: HTML/CSS/JavaScript + leichtes Backend.
   - Datenbank so wählen, dass all-inkl realistisch ist (bevorzugt MySQL/MariaDB-kompatibel).
   - Zugangsdaten per Environment-Variablen / Konfigurationsdatei trennen.
7. **Initialdaten**
   - Nutze exakt diese Einträge beim ersten Start (wenn Liste bereitgestellt wird).
   - Wenn keine Liste bereitgestellt ist: klar als erforderliche Eingabe markieren und saubere Seed-Mechanik liefern.

## Umsetzungsstandard
- Saubere Ordnerstruktur.
- Klar benannte Module.
- Kommentierung nur dort, wo sie echten Mehrwert liefert.
- Erweiterbare Architektur (z. B. Auth austauschbar, API trennbar, DB-Layer separat).
- Sicherheitsbasis: serverseitige Validierung, Escaping, keine Secrets im Code.

## Erwartete Ausgabe (Pflichtformat)
1. **Projektstruktur als Baum**
2. **Vollständige Dateien mit Inhalt**
3. **Kurze Stack-Begründung**
4. **Lokale Startanleitung (Schritt für Schritt)**
5. **DB-Konfiguration (inkl. `.env.example`)**
6. **Hosting-Checkliste für all-inkl**
7. **Nächste sinnvolle Ausbaustufen**

## Qualitätskontrolle vor Ausgabe
Prüfe final selbst:
- [ ] App startet lokal ohne fehlende Kernteile.
- [ ] Public-Ansicht inkl. Suche/Sortierung/Copy funktioniert.
- [ ] Admin-CRUD funktioniert persistent.
- [ ] Responsive Darstellung ist umgesetzt.
- [ ] Alle UI-Texte sind auf Deutsch.

## Optionaler Zusatzauftrag
Wenn sinnvoll, ergänze:
- Pagination bei vielen Prompts
- CSV-Import/Export
- Rollenmodell für mehrere Admins
- Audit-Log für Änderungen
