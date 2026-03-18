<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

function resolveContentType(string $type): string
{
    return strtolower($type) === 'exercise' ? 'exercise' : 'prompt';
}

$pdo = db();
$q = trim((string)($_GET['q'] ?? ''));
$sort = (string)($_GET['sort'] ?? 'nr');
$dir = strtolower((string)($_GET['dir'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
$type = resolveContentType((string) ($_GET['type'] ?? 'prompt'));
$project = trim((string) ($_GET['project'] ?? ''));

$sortMap = [
    'nr' => 'nr',
    'abbreviation' => 'abbreviation',
    'created_at' => 'created_at',
    'updated_at' => 'updated_at',
];
$orderBy = $sortMap[$sort] ?? 'nr';

$sql = 'SELECT id, nr, abbreviation, prompt, project, created_at, updated_at FROM prompts WHERE content_type = :type';
$params = ['type' => $type];

if ($type === 'exercise') {
    if ($project === '') {
        jsonResponse(['ok' => true, 'data' => []]);
    }

    $sql .= ' AND project = :project';
    $params['project'] = $project;
}

if ($q !== '') {
    $sql .= ' AND (nr LIKE :query OR abbreviation LIKE :query OR prompt LIKE :query)';
    $params['query'] = '%' . $q . '%';
}

$sql .= " ORDER BY {$orderBy} {$dir}, nr ASC, abbreviation ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
