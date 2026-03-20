<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

function normalizeCategory(mixed $value): string
{
    return substr(trim((string) $value), 0, 80);
}

requireAdminAuth();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = requestData();

if ($method === 'GET') {
    $sort = (string) ($_GET['sort'] ?? 'category');
    $dir = strtolower((string) ($_GET['dir'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
    $sortMap = [
        'description' => 'description',
        'category' => 'category',
        'action_count' => 'action_count',
        'created_at' => 'created_at',
        'updated_at' => 'updated_at',
    ];
    $orderBy = $sortMap[$sort] ?? 'category';

    $stmt = $pdo->query("SELECT description, url, category, action_count, created_at, updated_at FROM links ORDER BY {$orderBy} {$dir}, category ASC, description ASC");
    jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO links (description, url, category, action_count, created_at, updated_at) VALUES (:description, :url, :category, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
    $stmt->execute([
        'description' => trim((string) ($data['description'] ?? '')),
        'url' => trim((string) ($data['url'] ?? '')),
        'category' => normalizeCategory($data['category'] ?? ''),
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'PUT') {
    $stmt = $pdo->prepare('UPDATE links SET description=:description, url=:url, category=:category, updated_at=CURRENT_TIMESTAMP WHERE url=:old_url');
    $stmt->execute([
        'old_url' => trim((string) ($data['old_url'] ?? '')),
        'description' => trim((string) ($data['description'] ?? '')),
        'url' => trim((string) ($data['url'] ?? '')),
        'category' => normalizeCategory($data['category'] ?? ''),
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    $stmt = $pdo->prepare('DELETE FROM links WHERE url = :url');
    $stmt->execute([
        'url' => trim((string) ($data['url'] ?? '')),
    ]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
