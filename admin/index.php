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
      <h1>Prompt-Verwaltung</h1>
      <p>Prompts hinzufügen, bearbeiten und löschen.</p>
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
          <h2>Prompt speichern</h2>
          <button id="logoutButton" class="secondary">Abmelden</button>
        </div>
        <form id="promptForm" class="form-grid">
          <input type="hidden" id="promptId">
          <label><span>Nr</span><input type="number" id="nrInput" required min="1"></label>
          <label><span>Abkürzung</span><input type="text" id="abbrInput" required maxlength="50"></label>
          <label class="full"><span>Prompt</span><textarea id="promptInput" rows="5" required></textarea></label>
          <div class="full row gap-12">
            <button type="submit">Speichern</button>
            <button type="button" id="resetButton" class="secondary">Zurücksetzen</button>
          </div>
        </form>
      </div>

      <div class="card overflow-x">
        <table>
          <thead>
            <tr><th>Nr</th><th>Abkürzung</th><th>Prompt</th><th>Aktionen</th></tr>
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
