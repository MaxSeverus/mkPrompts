<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

requireAdminAuth();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $rows = $pdo->query('SELECT id, nr, abbreviation, prompt FROM prompts ORDER BY nr ASC')->fetchAll();
    jsonResponse(['ok' => true, 'data' => $rows]);
}

$data = requestData();

if ($method === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt, updated_at) VALUES (:nr, :abbreviation, :prompt, CURRENT_TIMESTAMP)');
    $stmt->execute([
        'nr' => (int)($data['nr'] ?? 0),
        'abbreviation' => trim((string)($data['abbreviation'] ?? '')),
        'prompt' => trim((string)($data['prompt'] ?? '')),
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'PUT') {
    $stmt = $pdo->prepare('UPDATE prompts SET nr=:nr, abbreviation=:abbreviation, prompt=:prompt, updated_at=CURRENT_TIMESTAMP WHERE id=:id');
    $stmt->execute([
        'id' => (int)($data['id'] ?? 0),
        'nr' => (int)($data['nr'] ?? 0),
        'abbreviation' => trim((string)($data['abbreviation'] ?? '')),
        'prompt' => trim((string)($data['prompt'] ?? '')),
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    $stmt = $pdo->prepare('DELETE FROM prompts WHERE id = :id');
    $stmt->execute(['id' => (int)($data['id'] ?? 0)]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
