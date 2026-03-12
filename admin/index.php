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
      <p>Prompts und Übungsbeispiele hinzufügen, bearbeiten und löschen.</p>
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
          </div>
        </label>

        <form id="promptForm" class="form-grid">
          <input type="hidden" id="promptId">
          <label><span>Nr</span><input type="text" id="nrInput" required maxlength="15" placeholder="z. B. Meta-Prompts"></label>
          <label><span>Abkürzung</span><input type="text" id="abbrInput" required maxlength="50"></label>
          <label class="full"><span id="contentLabel">Prompt</span><textarea id="promptInput" rows="5" required></textarea></label>
          <div class="full row gap-12">
            <button type="submit">Speichern</button>
            <button type="button" id="resetButton" class="secondary">Zurücksetzen</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h2 id="csvTitle">CSV-Upload</h2>
        <p>CSV-Datei mit den Spalten <strong>nr</strong>, <strong>abbreviation</strong> und <strong>prompt</strong> hochladen.</p>
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

      <div class="card overflow-x">
        <table>
          <thead>
            <tr><th>Nr</th><th>Abkürzung</th><th id="tableContentHeading">Prompt</th><th>Aktionen</th></tr>
          </thead>
          <tbody id="adminTableBody"></tbody>
        </table>
      </div>
    </section>
  </div>

  <div id="toast" class="toast" role="status" aria-live="assertive"></div>
  <script src="../assets/js/admin.js"></script>
</body>
</html>
