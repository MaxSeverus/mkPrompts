<?php
declare(strict_types=1);

// Bestimme welche API aufgerufen wird
$type = $_GET['type'] ?? 'prompts';

// Map type zu Dateiname
$typeMap = [
    'prompt' => 'prompts.php',
    'exercise' => 'prompts.php',
    'link' => 'links.php',
    'prompts' => 'prompts.php',
    'links' => 'links.php',
];

$filename = $typeMap[$type] ?? 'prompts.php';
$apiFile = __DIR__ . '/api/' . $filename;

if (file_exists($apiFile)) {
    include $apiFile;
} else {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'API file not found: ' . $filename]);
}
