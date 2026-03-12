<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

$pdo = db();
$q = trim((string)($_GET['q'] ?? ''));
$sort = (string)($_GET['sort'] ?? 'nr');
$dir = strtolower((string)($_GET['dir'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';

$sortMap = ['nr' => 'nr', 'abbreviation' => 'abbreviation'];
$orderBy = $sortMap[$sort] ?? 'nr';

$sql = 'SELECT id, nr, abbreviation, prompt FROM prompts';
$params = [];

if ($q !== '') {
    $sql .= ' WHERE nr LIKE :query OR abbreviation LIKE :query OR prompt LIKE :query';
    $params['query'] = '%' . $q . '%';
}

$sql .= " ORDER BY {$orderBy} {$dir}";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
