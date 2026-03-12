<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

requireAdminAuth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

if (!isset($_FILES['csv']) || !is_array($_FILES['csv'])) {
    jsonResponse(['ok' => false, 'message' => 'Keine CSV-Datei übermittelt.'], 400);
}

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

$header = fgetcsv($handle, 0, ',');
if ($header === false) {
    fclose($handle);
    jsonResponse(['ok' => false, 'message' => 'CSV-Datei ist leer.'], 400);
}

$header = array_map(static fn($value) => strtolower(trim((string) $value)), $header);
$required = ['nr', 'abbreviation', 'prompt'];
foreach ($required as $column) {
    if (!in_array($column, $header, true)) {
        fclose($handle);
        jsonResponse(['ok' => false, 'message' => 'CSV benötigt die Spalten nr, abbreviation, prompt.'], 400);
    }
}

$indices = array_flip($header);
$pdo = db();
$inserted = 0;
$updated = 0;

$selectStmt = $pdo->prepare('SELECT id FROM prompts WHERE nr = :nr OR abbreviation = :abbreviation LIMIT 1');
$insertStmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt, updated_at) VALUES (:nr, :abbreviation, :prompt, CURRENT_TIMESTAMP)');
$updateStmt = $pdo->prepare('UPDATE prompts SET nr = :nr, abbreviation = :abbreviation, prompt = :prompt, updated_at = CURRENT_TIMESTAMP WHERE id = :id');

$pdo->beginTransaction();

try {
    while (($row = fgetcsv($handle, 0, ',')) !== false) {
        $nrValue = trim((string) ($row[$indices['nr']] ?? ''));
        $abbrValue = trim((string) ($row[$indices['abbreviation']] ?? ''));
        $promptValue = trim((string) ($row[$indices['prompt']] ?? ''));

        if ($nrValue === '' || $abbrValue === '' || $promptValue === '') {
            continue;
        }

        $nr = (int) $nrValue;
        if ($nr <= 0) {
            continue;
        }

        $selectStmt->execute([
            'nr' => $nr,
            'abbreviation' => $abbrValue,
        ]);
        $existingId = $selectStmt->fetchColumn();

        if ($existingId === false) {
            $insertStmt->execute([
                'nr' => $nr,
                'abbreviation' => $abbrValue,
                'prompt' => $promptValue,
            ]);
            $inserted++;
            continue;
        }

        $updateStmt->execute([
            'id' => (int) $existingId,
            'nr' => $nr,
            'abbreviation' => $abbrValue,
            'prompt' => $promptValue,
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
