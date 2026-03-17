<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

$pdo = db();
$q = trim((string) ($_GET['q'] ?? ''));
$sort = (string) ($_GET['sort'] ?? 'description');
$dir = strtolower((string) ($_GET['dir'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';

$sortMap = [
    'description' => 'description',
    'category' => 'category',
];
$orderBy = $sortMap[$sort] ?? 'description';

$sql = 'SELECT description, url, category FROM links';
$params = [];

if ($q !== '') {
    $sql .= ' WHERE (description LIKE :query OR url LIKE :query OR category LIKE :query)';
    $params['query'] = '%' . $q . '%';
}

$sql .= " ORDER BY {$orderBy} {$dir}, description ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
