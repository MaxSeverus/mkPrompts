<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mkprompts – KI-Prompts für schnellen Einsatz</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <div class="app-shell">
    <!-- Sticky Header -->
    <header class="sticky-header">
      <div class="logo">mkprompts</div>
      <nav id="headerNav">
        <a href="https://ki-stammtisch.at/" target="_blank" rel="noopener">KI-Stammtisch</a>
        <a href="admin/" target="_blank" rel="noopener">Admin</a>
      </nav>
      <button class="theme-toggle" id="themeToggle" title="Design wechseln">🌙</button>
    </header>

    <!-- Hero/Intro -->
    <section class="hero">
      <p class="badge">Prompt-Sammlung</p>
      <h1>mkprompts</h1>
      <p>Durchsuche Vorlagen nach Modul und Projekt. Kopiere mit einem Klick und nutze direkt weiter.</p>
    </section>


    <!-- Toolbar -->
    <section class="toolbar">
      <label class="field">
        <span>Bereich</span>
        <div class="view-switch" id="viewSwitch" role="tablist" aria-label="Inhalte">
          <button type="button" class="secondary is-active" data-view="prompt" role="tab" aria-selected="true">Prompts</button>
          <button type="button" class="secondary" data-view="exercise" role="tab" aria-selected="false">Übungen</button>
          <button type="button" class="secondary" data-view="link" role="tab" aria-selected="false">Links</button>
        </div>
      </label>
      <label class="field">
        <span>Datenschnitt Nr</span>
        <div class="slicer-buttons" id="nrFilterButtons" role="group" aria-label="Datenschnitt"></div>
      </label>
      <label class="field">
        <span>Projekt</span>
        <select id="projectFilter">
          <option value="">Alle</option>
        </select>
      </label>
      <label class="field">
        <span>Suche</span>
        <input id="searchInput" type="search" placeholder="Nr, Abkürzung oder Inhalt…">
      </label>
      <label class="field">
        <span>Sortieren nach</span>
        <select id="sortSelect">
          <option value="nr">Nr</option>
          <option value="abbreviation">Abkürzung</option>
          <option value="created_at">Datum</option>
          <option value="action_count">Beliebtheit</option>
        </select>
      </label>
      <label class="field">
        <button id="dirButton" class="secondary" type="button">Aufsteigend</button>
      </label>
    </section>

    <!-- Content Area -->
    <section class="content">
      <div id="promptList" class="prompt-grid" aria-live="polite" aria-label="Inhalte">
        <!-- Wird von JavaScript gefüllt -->
      </div>
    </section>

    <!-- Stats Footer -->
    <section class="page-stats-footer" aria-label="Seitenstatistik">
      <div class="counter-badge counter-badge-subtle">
        <span>Seitenaufrufe</span>
        <strong id="pageViewCount">0</strong>
        <small>unique pro Tag</small>
      </div>
    </section>
  </div>

  <!-- Toast Notifications -->
  <div id="toast" class="toast" role="status" aria-live="assertive"></div>

  <script src="assets/js/router.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>
