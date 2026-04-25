<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

function resolveContentType(mixed $value): string
{
    return strtolower((string) $value) === 'exercise' ? 'exercise' : 'prompt';
}

function normalizeCsvHeaderValue(string $value): string
{
    $normalized = trim($value);
    // Entfernt UTF-8 BOM am Beginn des ersten Header-Felds.
    $normalized = preg_replace('/^\xEF\xBB\xBF/u', '', $normalized) ?? $normalized;
    return strtolower($normalized);
}

function detectCsvDelimiter(string $line): string
{
    $candidates = [',', ';', "\t"];
    $bestDelimiter = ',';
    $bestCount = -1;

    foreach ($candidates as $candidate) {
        $count = substr_count($line, $candidate);
        if ($count > $bestCount) {
            $bestCount = $count;
            $bestDelimiter = $candidate;
        }
    }

    return $bestDelimiter;
}

requireAdminAuth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

if (!isset($_FILES['csv']) || !is_array($_FILES['csv'])) {
    jsonResponse(['ok' => false, 'message' => 'Keine CSV-Datei übermittelt.'], 400);
}

$type = resolveContentType($_POST['type'] ?? 'prompt');
$file = $_FILES['csv'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    jsonResponse(['ok' => false, 'message' => 'Datei-Upload fehlgeschlagen.'], 400);
}

$tmpName = (string) ($file['tmp_name'] ?? '');
if ($tmpName === '' || !is_uploaded_file($tmpName)) {
    jsonResponse(['ok' => false, 'message' => 'Ungültige Upload-Datei.'], 400);
}

$handle = fopen($tmpName, 'rb');
if ($handle === false) {
    jsonResponse(['ok' => false, 'message' => 'CSV-Datei konnte nicht gelesen werden.'], 400);
}

$headerLine = fgets($handle);
if ($headerLine === false) {
    fclose($handle);
    jsonResponse(['ok' => false, 'message' => 'CSV-Datei ist leer.'], 400);
}

$delimiter = detectCsvDelimiter($headerLine);
$trimmedHeaderLine = trim($headerLine);
if (str_starts_with(strtolower($trimmedHeaderLine), 'sep=')) {
    $declaredDelimiter = substr($trimmedHeaderLine, 4, 1);
    if ($declaredDelimiter !== '') {
        $delimiter = $declaredDelimiter;
    }

    $headerLine = fgets($handle);
    if ($headerLine === false) {
        fclose($handle);
        jsonResponse(['ok' => false, 'message' => 'CSV-Datei enthält keinen Header.'], 400);
    }
}

$header = str_getcsv($headerLine, $delimiter);
$header = array_map(static fn($value) => normalizeCsvHeaderValue((string) $value), $header);
$required = ['nr', 'abbreviation', 'prompt'];
foreach ($required as $column) {
    if (!in_array($column, $header, true)) {
        fclose($handle);
        jsonResponse(['ok' => false, 'message' => 'CSV benötigt die Spalten nr (Kürzel intern), abbreviation (Titel) und prompt.'], 400);
    }
}

$indices = array_flip($header);
$pdo = db();
$inserted = 0;
$updated = 0;

$selectStmt = $pdo->prepare('SELECT id FROM prompts WHERE content_type = :type AND project = :project AND nr = :nr AND abbreviation = :abbreviation LIMIT 1');
$insertStmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt, project, content_type, updated_at) VALUES (:nr, :abbreviation, :prompt, :project, :type, CURRENT_TIMESTAMP)');
$updateStmt = $pdo->prepare('UPDATE prompts SET nr = :nr, abbreviation = :abbreviation, prompt = :prompt, project = :project, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND content_type = :type');

$pdo->beginTransaction();

try {
    while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
        $nrValue = substr(trim((string) ($row[$indices['nr']] ?? '')), 0, 15);
        $abbrValue = trim((string) ($row[$indices['abbreviation']] ?? ''));
        $promptValue = trim((string) ($row[$indices['prompt']] ?? ''));
        $projectValue = '';
        if (array_key_exists('project', $indices)) {
            $projectValue = substr(trim((string) ($row[$indices['project']] ?? '')), 0, 80);
        }

        if ($nrValue === '' || $abbrValue === '' || $promptValue === '') {
            continue;
        }

        $selectStmt->execute([
            'type' => $type,
            'project' => $projectValue,
            'nr' => $nrValue,
            'abbreviation' => $abbrValue,
        ]);
        $existingId = $selectStmt->fetchColumn();

        if ($existingId === false) {
            $insertStmt->execute([
                'nr' => $nrValue,
                'abbreviation' => $abbrValue,
                'prompt' => $promptValue,
                'project' => $projectValue,
                'type' => $type,
            ]);
            $inserted++;
            continue;
        }

        $updateStmt->execute([
            'id' => (int) $existingId,
            'nr' => $nrValue,
            'abbreviation' => $abbrValue,
            'prompt' => $promptValue,
            'project' => $projectValue,
            'type' => $type,
        ]);
        $updated++;
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fclose($handle);
    jsonResponse(['ok' => false, 'message' => 'CSV-Import fehlgeschlagen.'], 500);
}

fclose($handle);

jsonResponse([
    'ok' => true,
    'inserted' => $inserted,
    'updated' => $updated,
]);
