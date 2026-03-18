<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt-Bibliothek</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <div class="app-shell">
    <header class="hero">
      <p class="badge">Prompt-Bibliothek</p>
      <h1>KI-Prompts für den schnellen Einsatz</h1>
      <p>Durchsuche Vorlagen, kopiere mit einem Klick und nutze die Prompts direkt weiter.</p>
      <div class="switch-link-row">
        <a class="button-link" href="admin/">Zum Admin-Bereich</a>
        <a class="button-link" href="https://ki-stammtisch.at/ki-stammtisch/">Zurück zum KI-Stammtisch</a>
        <a id="backLink" class="button-link hidden" href="https://ki-stammtisch.at/ki-stammtisch/">Zurück</a>
      </div>
    </header>

    <section class="notice-card">
      <h2>Geschützte Inhalte – nur für Teilnehmer:innen</h2>
      <p>Diese Sammlung ist für den internen Einsatz bestimmt. Bitte verantwortungsvoll nutzen und nicht extern teilen.</p>
    </section>

    <section class="toolbar">
      <label class="field full">
        <span>Bereich</span>
        <div class="view-switch" id="viewSwitch" role="tablist" aria-label="Inhalte auswählen">
          <button type="button" class="secondary is-active" data-view="prompt" role="tab" aria-selected="true">Prompts</button>
          <button type="button" class="secondary" data-view="exercise" role="tab" aria-selected="false">Übungen</button>
          <button type="button" class="secondary" data-view="link" role="tab" aria-selected="false">Links</button>
        </div>
      </label>
      <label class="field">
        <span>Suche</span>
        <input id="searchInput" type="search" placeholder="Nr, Abkürzung oder Inhalt durchsuchen">
      </label>
      <label class="field">
        <span>Sortieren nach</span>
        <select id="sortSelect"></select>
      </label>
      <button id="dirButton" class="secondary">Aufsteigend</button>
    </section>

    <section id="nrFilterSection" class="card hidden">
      <div class="row gap-12 align-center wrap">
        <strong>Datenschnitt Nr:</strong>
        <div id="nrFilterButtons" class="slicer-buttons"></div>
      </div>
    </section>

    <section id="projectFilterSection" class="card hidden">
      <div class="row gap-12 align-center wrap">
        <strong>Projekt:</strong>
        <div id="projectFilterButtons" class="slicer-buttons"></div>
      </div>
    </section>

    <section id="categoryFilterSection" class="card hidden">
      <div class="row gap-12 align-center wrap">
        <strong>Kategorie:</strong>
        <div id="categoryFilterButtons" class="slicer-buttons"></div>
      </div>
    </section>

    <section>
      <div id="promptList" class="prompt-grid" aria-live="polite"></div>
    </section>
  </div>

  <div id="toast" class="toast" role="status" aria-live="assertive"></div>
  <script src="assets/js/app.js"></script>
</body>
</html>
