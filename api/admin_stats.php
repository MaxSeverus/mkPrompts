<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

requireAdminAuth();

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = requestData();

if ($method === 'GET') {
    jsonResponse([
        'ok' => true,
        'data' => [
            'page_views' => getPageViewCount($pdo),
            'total_usage_count' => getTotalUsageCount($pdo),
        ],
    ]);
}

if ($method === 'PUT') {
    $pageViews = max(0, (int) ($data['page_views'] ?? 0));
    setPageViewCount($pdo, $pageViews);

    jsonResponse([
        'ok' => true,
        'data' => [
            'page_views' => getPageViewCount($pdo),
            'total_usage_count' => getTotalUsageCount($pdo),
        ],
    ]);
}

jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
