<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin · Prompt-Bibliothek</title>
  <link rel="stylesheet" href="../assets/css/style.css?v=20260425-compact-4">
</head>
<body>
  <div class="app-shell admin-shell">
    <section id="loginCard" class="card max-500">
      <h2>Anmeldung</h2>
      <p>Bitte Passwort eingeben, um den Admin-Bereich zu öffnen.</p>
      <form id="loginForm" class="stack gap-12">
        <input type="password" id="passwordInput" required placeholder="Admin-Passwort">
        <button type="submit">Anmelden</button>
      </form>
    </section>

    <section id="adminPanel" class="hidden stack gap-20">
      <div class="card" id="adminTopPanelCard">
        <details id="adminInfoDetails" class="collapsible-panel">
          <summary>Admin-Bereich</summary>
          <div class="collapsible-content">
            <p>Prompts, Übungsbeispiele und Links hinzufügen, bearbeiten und löschen.</p>
            <div class="row gap-12 align-center wrap">
              <a class="button-link" href="../">Zum Benutzerbereich</a>
              <button id="logoutButton" class="secondary" type="button">Abmelden</button>
            </div>
          </div>
        </details>

        <details id="pageViewsDetails" class="collapsible-panel">
          <summary>Seitenaufrufzähler</summary>
          <div class="collapsible-content">
            <p>Gezählt werden eindeutige Besucher:innen pro Tag im Benutzerbereich.</p>
            <form id="pageViewForm" class="row gap-12 align-center wrap">
              <label class="field">
                <span>Stand</span>
                <input type="number" id="pageViewInput" min="0" step="1" value="0">
              </label>
              <div class="stats-inline-card">
                <span>Summe aller Nutzungen</span>
                <strong id="totalUsageCount">0</strong>
              </div>
              <button type="submit">Speichern</button>
              <button type="button" id="pageViewResetButton" class="secondary">Auf 0 setzen</button>
            </form>
          </div>
        </details>

        <details id="csvDetails" class="collapsible-panel">
          <summary id="csvTitle">CSV-Upload (Prompts)</summary>
          <div class="collapsible-content" id="csvCard">
            <p id="csvDescription">CSV-Datei mit den Spalten <strong>nr</strong> (Kürzel intern), <strong>abbreviation</strong> (Titel), <strong>project</strong> (Thema) und <strong>prompt</strong> hochladen.</p>
            <form id="csvUploadForm" class="stack gap-12">
              <input type="file" id="csvFileInput" accept=",.csv,text/csv" required>
              <div class="row gap-12">
                <button type="submit">CSV importieren</button>
                <small id="csvHint">Der Import ersetzt bestehende Einträge mit gleichem Kürzel und Titel.</small>
              </div>
            </form>
            <hr>
            <div class="row gap-12 align-center">
              <button type="button" id="csvExportButton" class="secondary">CSV exportieren</button>
              <small>Exportiert alle vorhandenen Einträge als CSV-Datei.</small>
            </div>
          </div>
        </details>
      </div>

      <div class="card">
        <details id="editorDetails" class="collapsible-panel">
          <summary id="editorTitle">Prompt speichern</summary>
          <div class="collapsible-content">
            <label class="field">
              <span>Bereich</span>
              <div class="view-switch" id="viewSwitch" role="tablist" aria-label="Inhalte auswählen">
                <button type="button" class="secondary is-active" data-view="prompt" role="tab" aria-selected="true">Prompts</button>
                <button type="button" class="secondary" data-view="exercise" role="tab" aria-selected="false">Übungen</button>
                <button type="button" class="secondary" data-view="link" role="tab" aria-selected="false">Links</button>
                <button type="button" class="secondary" data-view="module" role="tab" aria-selected="false">Module</button>
              </div>
            </label>

            <form id="adminEntryForm" class="form-grid">
              <input type="hidden" id="promptId">
              <input type="hidden" id="linkOriginalUrl">

              <label data-form-group="text"><span id="nrLabel">Titel</span><input type="text" id="nrInput" maxlength="50" placeholder="z. B. DSGVO"></label>
              <label data-form-group="text"><span>mkAbk</span><input type="text" id="abbrInput" maxlength="50"></label>
              <label data-form-group="text"><span>Thema</span><input type="text" id="projectInput" maxlength="80" placeholder="z. B. Datenschutz"></label>
              <label class="full" data-form-group="text"><span id="contentLabel">Prompt</span><textarea id="promptInput" rows="1"></textarea></label>
              <small id="formattingHint" class="full field-hint">Formatierung in Inhalt und Titel mit [B]...[/B], [I]...[/I] und [U]...[/U] möglich.</small>

              <label class="full hidden" data-form-group="link"><span>Beschreibung</span><input type="text" id="linkDescriptionInput" maxlength="255"></label>
              <label class="hidden" data-form-group="link"><span>URL</span><input type="url" id="linkUrlInput" maxlength="500" placeholder="https://..."></label>
              <label class="hidden" data-form-group="link"><span>Kategorie</span><input type="text" id="linkCategoryInput" maxlength="80"></label>

              <div class="full row gap-12">
                <button type="submit">Speichern</button>
                <button type="button" id="resetButton" class="secondary">Zurücksetzen</button>
              </div>
            </form>
          </div>
        </details>
      </div>
      <div id="moduleSection" class="card hidden">
        <p>Module sind Kategorien, unter denen Prompts und Übungen organisiert werden.</p>

        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 0.5rem;">Neues Modul erstellen</h3>
          <form id="moduleForm" class="stack gap-12">
            <label class="field">
              <span>Name</span>
              <input type="text" id="moduleName" placeholder="z. B. Anfänger" required>
            </label>
            <label class="field">
              <span>Slug</span>
              <input type="text" id="moduleSlug" placeholder="z. B. anfaenger" pattern="[a-z0-9\-]+" required>
            </label>
            <label class="field">
              <span>Sortierungsreihenfolge</span>
              <input type="number" id="moduleOrder" min="1" value="1" required>
            </label>
            <button type="submit">Modul erstellen</button>
          </form>
        </div>

        <div class="overflow-x">
          <h3>Vorhandene Module</h3>
          <table id="moduleTable">
            <thead>
              <tr><th>Name</th><th>Slug</th><th>Reihenfolge</th><th>Inhalte</th><th>Aktionen</th></tr>
            </thead>
            <tbody id="moduleTableBody"></tbody>
          </table>
        </div>
      </div>

      <div id="adminTitleFilterSection" class="card hidden">
        <div class="row gap-12 align-center wrap">
          <strong>Thema:</strong>
          <div id="adminTitleFilterButtons" class="slicer-buttons"></div>
        </div>
      </div>

      <div id="adminCategoryFilterSection" class="card hidden">
        <div class="row gap-12 align-center wrap">
          <strong>Kategorie:</strong>
          <div id="adminCategoryFilterButtons" class="slicer-buttons"></div>
        </div>
      </div>

      <div class="card">
        <div class="row gap-12 align-center wrap">
          <label class="field">
            <span>Suchen/Sortieren</span>
            <input id="adminSearchInput" type="search" placeholder="Suchbegriff im Inhalt">
          </label>
          <label class="field">
            <span>Sortieren</span>
            <select id="adminSortSelect"></select>
          </label>
          <button type="button" id="adminDirButton" class="secondary">Aufsteigend</button>
        </div>
      </div>

      <div class="card overflow-x">
        <table id="promptTable">
          <thead>
            <tr><th>Aktionen</th><th>mkAbk</th><th>Titel</th><th>Thema</th><th id="tableContentHeading">Inhalt</th><th>Nutzungen</th><th>Erstellt am</th><th>Geändert am</th></tr>
          </thead>
          <tbody id="adminTableBody"></tbody>
        </table>

        <table id="linkTable" class="hidden">
          <thead>
            <tr><th>Aktionen</th><th>Beschreibung</th><th>URL</th><th>Kategorie</th><th>Nutzungen</th><th>Erstellt am</th><th>Geändert am</th></tr>
          </thead>
          <tbody id="adminLinkTableBody"></tbody>
        </table>
      </div>
    </section>
  </div>

  <div id="toast" class="toast" role="status" aria-live="assertive"></div>
  <script src="../assets/js/admin.js?v=20260427-8"></script>
</body>
</html>
