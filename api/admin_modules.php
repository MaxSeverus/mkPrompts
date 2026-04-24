<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

requireAdminAuth();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = requestData();

if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT m.id, m.name, m.slug, m.sort_order,
               COUNT(p.id) as prompt_count,
               SUM(CASE WHEN p.content_type = :prompt_type THEN 1 ELSE 0 END) as prompts,
               SUM(CASE WHEN p.content_type = :exercise_type THEN 1 ELSE 0 END) as exercises
        FROM modules m
        LEFT JOIN prompts p ON p.module_id = m.id
        GROUP BY m.id, m.name, m.slug, m.sort_order
        ORDER BY m.sort_order ASC, m.name ASC
    ');
    $stmt->execute(['prompt_type' => 'prompt', 'exercise_type' => 'exercise']);
    jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $name = trim((string)($data['name'] ?? ''));
    $slug = trim((string)($data['slug'] ?? ''));
    $order = (int)($data['sort_order'] ?? 1);

    if (!$name || !$slug) {
        jsonResponse(['ok' => false, 'message' => 'Name und Slug sind erforderlich.'], 400);
    }

    $stmt = $pdo->prepare('INSERT INTO modules (name, slug, sort_order, created_at, updated_at) VALUES (:name, :slug, :order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
    $stmt->execute([
        'name' => $name,
        'slug' => $slug,
        'order' => $order,
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'PUT') {
    $id = (int)($data['id'] ?? 0);
    $name = trim((string)($data['name'] ?? ''));
    $slug = trim((string)($data['slug'] ?? ''));
    $order = (int)($data['sort_order'] ?? 1);

    if (!$id || !$name || !$slug) {
        jsonResponse(['ok' => false, 'message' => 'ID, Name und Slug sind erforderlich.'], 400);
    }

    $stmt = $pdo->prepare('UPDATE modules SET name=:name, slug=:slug, sort_order=:order, updated_at=CURRENT_TIMESTAMP WHERE id=:id');
    $stmt->execute([
        'id' => $id,
        'name' => $name,
        'slug' => $slug,
        'order' => $order,
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    $id = (int)($data['id'] ?? 0);

    if (!$id) {
        jsonResponse(['ok' => false, 'message' => 'ID erforderlich.'], 400);
    }

    $stmt = $pdo->prepare('DELETE FROM modules WHERE id = :id');
    $stmt->execute(['id' => $id]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
