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
    $stmt = $pdo->query('SELECT id, description, url, category FROM links ORDER BY category ASC, description ASC');
    jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO links (description, url, category, updated_at) VALUES (:description, :url, :category, CURRENT_TIMESTAMP)');
    $stmt->execute([
        'description' => trim((string) ($data['description'] ?? '')),
        'url' => trim((string) ($data['url'] ?? '')),
        'category' => normalizeCategory($data['category'] ?? ''),
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'PUT') {
    $stmt = $pdo->prepare('UPDATE links SET description=:description, url=:url, category=:category, updated_at=CURRENT_TIMESTAMP WHERE id=:id');
    $stmt->execute([
        'id' => (int) ($data['id'] ?? 0),
        'description' => trim((string) ($data['description'] ?? '')),
        'url' => trim((string) ($data['url'] ?? '')),
        'category' => normalizeCategory($data['category'] ?? ''),
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    $stmt = $pdo->prepare('DELETE FROM links WHERE id = :id');
    $stmt->execute([
        'id' => (int) ($data['id'] ?? 0),
    ]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
