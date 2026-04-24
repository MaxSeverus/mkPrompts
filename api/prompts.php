<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

function resolveContentType(string $type): string
{
    return strtolower($type) === 'exercise' ? 'exercise' : 'prompt';
}

function isGlobalExerciseProject(string $project): bool
{
    return strtolower(trim($project)) === 'alle';
}

$pdo = db();
$q = trim((string)($_GET['q'] ?? ''));
$sort = (string)($_GET['sort'] ?? 'nr');
$dir = strtolower((string)($_GET['dir'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
$type = resolveContentType((string) ($_GET['type'] ?? 'prompt'));
$project = trim((string) ($_GET['project'] ?? ''));
$module = trim((string) ($_GET['module'] ?? ''));

$sortMap = [
    'nr' => 'nr',
    'abbreviation' => 'abbreviation',
    'prompt' => 'prompt',
    'action_count' => 'action_count',
    'created_at' => 'created_at',
    'updated_at' => 'updated_at',
];
$orderBy = $sortMap[$sort] ?? 'nr';

$sql = 'SELECT id, nr, abbreviation, prompt, project, action_count, created_at, updated_at FROM prompts WHERE content_type = :type';
$params = ['type' => $type];

if ($module !== '') {
    $moduleStmt = $pdo->prepare('SELECT id FROM modules WHERE slug = :slug LIMIT 1');
    $moduleStmt->execute(['slug' => $module]);
    $moduleId = $moduleStmt->fetchColumn();
    if ($moduleId !== false) {
        $sql .= ' AND module_id = :module_id';
        $params['module_id'] = (int) $moduleId;
    }
}

if ($type === 'exercise') {
    if ($project === '') {
        $sql .= ' AND LOWER(TRIM(project)) = :global_project';
        $params['global_project'] = 'alle';
    } elseif (isGlobalExerciseProject($project)) {
        $sql .= ' AND LOWER(TRIM(project)) = :project';
        $params['project'] = 'alle';
    } else {
        $sql .= ' AND (project = :project OR LOWER(TRIM(project)) = :global_project)';
        $params['project'] = $project;
        $params['global_project'] = 'alle';
    }
}

if ($q !== '') {
    $sql .= ' AND (nr LIKE :query OR abbreviation LIKE :query OR prompt LIKE :query)';
    $params['query'] = '%' . $q . '%';
}

$sql .= " ORDER BY {$orderBy} {$dir}, nr ASC, abbreviation ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
