<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

function normalizeNr(mixed $value): string
{
    return substr(trim((string) $value), 0, 15);
}

function normalizeProject(mixed $value): string
{
    return substr(trim((string) $value), 0, 80);
}

function resolveContentType(array $input, array $query): string
{
    $value = (string) ($input['type'] ?? $query['type'] ?? 'prompt');
    return strtolower($value) === 'exercise' ? 'exercise' : 'prompt';
}

requireAdminAuth();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = requestData();
$type = resolveContentType($data, $_GET);

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, nr, abbreviation, prompt, project FROM prompts WHERE content_type = :type ORDER BY project ASC, nr ASC');
    $stmt->execute(['type' => $type]);
    jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt, project, content_type, updated_at) VALUES (:nr, :abbreviation, :prompt, :project, :type, CURRENT_TIMESTAMP)');
    $stmt->execute([
        'nr' => normalizeNr($data['nr'] ?? ''),
        'abbreviation' => trim((string)($data['abbreviation'] ?? '')),
        'prompt' => trim((string)($data['prompt'] ?? '')),
        'project' => normalizeProject($data['project'] ?? ''),
        'type' => $type,
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'PUT') {
    $stmt = $pdo->prepare('UPDATE prompts SET nr=:nr, abbreviation=:abbreviation, prompt=:prompt, project=:project, updated_at=CURRENT_TIMESTAMP WHERE id=:id AND content_type=:type');
    $stmt->execute([
        'id' => (int)($data['id'] ?? 0),
        'nr' => normalizeNr($data['nr'] ?? ''),
        'abbreviation' => trim((string)($data['abbreviation'] ?? '')),
        'prompt' => trim((string)($data['prompt'] ?? '')),
        'project' => normalizeProject($data['project'] ?? ''),
        'type' => $type,
    ]);
    jsonResponse(['ok' => true]);
}

if ($method === 'DELETE') {
    $stmt = $pdo->prepare('DELETE FROM prompts WHERE id = :id AND content_type = :type');
    $stmt->execute([
        'id' => (int)($data['id'] ?? 0),
        'type' => $type,
    ]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
