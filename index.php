<?php
  $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
  $host = preg_replace('/:\d+$/', '', $host);

  $forwardedHostRaw = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''));
  $forwardedHost = trim(explode(',', $forwardedHostRaw)[0] ?? '');
  $forwardedHost = preg_replace('/:\d+$/', '', $forwardedHost);

  $isKiKompaktHost = strpos($host, 'ki-kompakt.at') !== false || strpos($forwardedHost, 'ki-kompakt.at') !== false;

  if ($isKiKompaktHost && !headers_sent()) {
    $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
    $uriParts = parse_url($requestUri);
    $path = $uriParts['path'] ?? '/';
    $queryParams = [];

    if (!empty($uriParts['query'])) {
      parse_str($uriParts['query'], $queryParams);
    }

    $queryParams['brand'] = 'kompakt';
    $targetQuery = http_build_query($queryParams);
    $targetUrl = 'https://ki-stammtisch.at' . $path . ($targetQuery !== '' ? '?' . $targetQuery : '');

    header('Location: ' . $targetUrl, true, 302);
    exit;
  }

  $refererHost = strtolower((string) parse_url($_SERVER['HTTP_REFERER'] ?? '', PHP_URL_HOST));
  $refererHost = preg_replace('/:\d+$/', '', $refererHost);

  $requestedBrand = strtolower((string) ($_GET['brand'] ?? ''));
  $cookieBrand = strtolower((string) ($_COOKIE['mkprompts_brand'] ?? ''));

  $isKiKompaktReferer = strpos($refererHost, 'ki-kompakt.at') !== false;

  $brand = 'stammtisch';
  if ($requestedBrand === 'kompakt' || $requestedBrand === 'stammtisch') {
    $brand = $requestedBrand;
  } elseif ($isKiKompaktHost || $isKiKompaktReferer) {
    $brand = 'kompakt';
  } elseif ($cookieBrand === 'kompakt' || $cookieBrand === 'stammtisch') {
    $brand = $cookieBrand;
  }

  if (($cookieBrand !== $brand) && !headers_sent()) {
    setcookie(
      'mkprompts_brand',
      $brand,
      [
        'expires' => time() + 60 * 60 * 24 * 30,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
      ]
    );
  }

  $communityUrl = $brand === 'kompakt' ? 'https://ki-kompakt.at/' : 'https://ki-stammtisch.at/';
  $communityLabel = $brand === 'kompakt' ? 'KI-Kompakt' : 'KI-Stammtisch';
?>
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
        <a href="<?= htmlspecialchars($communityUrl, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener"><?= htmlspecialchars($communityLabel, ENT_QUOTES, 'UTF-8') ?></a>
        <a href="admin/" target="_blank" rel="noopener">Admin</a>
      </nav>
      <button class="theme-toggle" id="themeToggle" title="Design wechseln">🌙</button>
    </header>

    <!-- Toolbar -->
    <section class="toolbar">
      <label class="field">
        <span>Format</span>
        <div class="view-switch" id="viewSwitch" role="tablist" aria-label="Format">
          <button type="button" class="secondary is-active" data-view="prompt" role="tab" aria-selected="true">Prompt</button>
          <button type="button" class="secondary" data-view="exercise" role="tab" aria-selected="false">Übung</button>
          <button type="button" class="secondary" data-view="link" role="tab" aria-selected="false">Link</button>
        </div>
      </label>
      <label class="field" id="titleFilterField">
        <span>Thema</span>
        <div class="slicer-buttons" id="titleFilterButtons" role="group" aria-label="Thema-Filter"></div>
      </label>
      <label class="field hidden" id="linkCategoryFilterField">
        <span>Kategorie</span>
        <div class="slicer-buttons" id="linkCategoryFilterButtons" role="group" aria-label="Kategorie-Filter"></div>
      </label>
      <label class="field" id="searchField">
        <span>Suche</span>
        <input id="searchInput" type="search" placeholder="Titel, Thema oder Inhalt durchsuchen">
      </label>
      <label class="field">
        <span>Sortieren nach</span>
        <select id="sortSelect">
          <option value="newest">Neueste</option>
          <option value="title">A-Z</option>
          <option value="content">Inhalt</option>
          <option value="action_count">Nutzungen</option>
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
