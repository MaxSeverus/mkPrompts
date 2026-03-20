<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

$pdo = db();
jsonResponse([
    'ok' => true,
    'data' => [
        'page_views' => getPageViewCount($pdo),
    ],
]);
