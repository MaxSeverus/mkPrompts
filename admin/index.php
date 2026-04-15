<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin · Prompt-Bibliothek</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
  <div class="app-shell admin-shell">
    <header class="hero compact">
      <p class="badge">Admin-Bereich</p>
      <h1>Inhalte verwalten</h1>
      <p>Prompts, Übungsbeispiele und Links hinzufügen, bearbeiten und löschen.</p>
      <div class="switch-link-row">
        <a class="button-link" href="../">Zum Benutzerbereich</a>
      </div>
    </header>

    <section id="loginCard" class="card max-500">
      <h2>Anmeldung</h2>
      <p>Bitte Passwort eingeben, um den Admin-Bereich zu öffnen.</p>
      <form id="loginForm" class="stack gap-12">
        <input type="password" id="passwordInput" required placeholder="Admin-Passwort">
        <button type="submit">Anmelden</button>
      </form>
    </section>

    <section id="adminPanel" class="hidden stack gap-20">
      <div class="card">
        <div class="row between align-center">
          <h2 id="editorTitle">Prompt speichern</h2>
          <button id="logoutButton" class="secondary">Abmelden</button>
        </div>

        <label class="field">
          <span>Bereich</span>
          <div class="view-switch" id="viewSwitch" role="tablist" aria-label="Inhalte auswählen">
            <button type="button" class="secondary is-active" data-view="prompt" role="tab" aria-selected="true">Prompts</button>
            <button type="button" class="secondary" data-view="exercise" role="tab" aria-selected="false">Übungen</button>
            <button type="button" class="secondary" data-view="link" role="tab" aria-selected="false">Links</button>
          </div>
        </label>

        <form id="adminEntryForm" class="form-grid">
          <input type="hidden" id="promptId">
          <input type="hidden" id="linkOriginalUrl">

          <label data-form-group="text"><span id="nrLabel">Nr</span><input type="text" id="nrInput" maxlength="15" placeholder="z. B. 1"></label>
          <label data-form-group="text"><span>Abkürzung</span><input type="text" id="abbrInput" maxlength="50"></label>
          <label data-form-group="text"><span>Projekt</span><input type="text" id="projectInput" maxlength="80" placeholder="z. B. Website-Relaunch"></label>
          <label class="full" data-form-group="text"><span id="contentLabel">Prompt</span><textarea id="promptInput" rows="5"></textarea></label>
          <small id="formattingHint" class="full field-hint">Formatierung in Prompt und Abkürzung mit [B]...[/B], [I]...[/I] und [U]...[/U] möglich.</small>

          <label class="full hidden" data-form-group="link"><span>Beschreibung</span><input type="text" id="linkDescriptionInput" maxlength="255"></label>
          <label class="hidden" data-form-group="link"><span>URL</span><input type="url" id="linkUrlInput" maxlength="500" placeholder="https://..."></label>
          <label class="hidden" data-form-group="link"><span>Kategorie</span><input type="text" id="linkCategoryInput" maxlength="80"></label>

          <div class="full row gap-12">
            <button type="submit">Speichern</button>
            <button type="button" id="resetButton" class="secondary">Zurücksetzen</button>
          </div>
        </form>
      </div>


      <div class="card">
        <div class="row between align-center wrap gap-12">
          <div>
            <h2>Seitenaufrufzähler</h2>
            <p>Gezählt werden eindeutige Besucher:innen pro Tag im Benutzerbereich.</p>
          </div>
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
      </div>

      <div id="csvCard" class="card">
        <h2 id="csvTitle">CSV-Upload</h2>
        <p id="csvDescription">CSV-Datei mit den Spalten <strong>nr</strong>, <strong>abbreviation</strong>, <strong>project</strong> und <strong>prompt</strong> hochladen.</p>
        <form id="csvUploadForm" class="stack gap-12">
          <input type="file" id="csvFileInput" accept=",.csv,text/csv" required>
          <div class="row gap-12">
            <button type="submit">CSV importieren</button>
            <small id="csvHint">Der Import ersetzt bestehende Einträge mit gleicher Nr oder Abkürzung.</small>
          </div>
        </form>
        <hr>
        <div class="row gap-12 align-center">
          <button type="button" id="csvExportButton" class="secondary">CSV exportieren</button>
          <small>Exportiert alle vorhandenen Einträge als CSV-Datei.</small>
        </div>
      </div>

      <div id="adminNrFilterSection" class="card hidden">
        <div class="row gap-12 align-center wrap">
          <strong>Datenschnitt Nr:</strong>
          <div id="adminNrFilterButtons" class="slicer-buttons"></div>
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
            <span>Sortieren nach</span>
            <select id="adminSortSelect"></select>
          </label>
          <button type="button" id="adminDirButton" class="secondary">Aufsteigend</button>
        </div>
      </div>

      <div class="card overflow-x">
        <table id="promptTable">
          <thead>
            <tr><th>Aktionen</th><th>Nr</th><th>Abkürzung</th><th>Projekt</th><th id="tableContentHeading">Prompt</th><th>Nutzungen</th><th>Erstellt am</th><th>Geändert am</th></tr>
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
  <script src="../assets/js/admin.js?v=20260415-1"></script>
</body>
</html>
