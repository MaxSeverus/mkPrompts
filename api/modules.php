<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

$pdo = db();

$sql = 'SELECT
    m.id,
    m.name,
    m.slug,
    m.sort_order,
    COUNT(p.id) as prompt_count,
    SUM(CASE WHEN p.content_type = :prompt_type THEN 1 ELSE 0 END) as prompts,
    SUM(CASE WHEN p.content_type = :exercise_type THEN 1 ELSE 0 END) as exercises
FROM modules m
LEFT JOIN prompts p ON p.module_id = m.id
GROUP BY m.id, m.name, m.slug, m.sort_order
ORDER BY m.sort_order ASC, m.name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute(['prompt_type' => 'prompt', 'exercise_type' => 'exercise']);

jsonResponse(['ok' => true, 'data' => $stmt->fetchAll()]);
