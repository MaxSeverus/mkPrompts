<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/http.php';

function resolveTrackType(mixed $value): string
{
    return strtolower((string) $value) === 'exercise' ? 'exercise' : 'prompt';
}

function resolveVisitorHash(): string
{
    $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $userAgent = trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));

    return hash('sha256', $ip . '|' . $userAgent);
}

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = requestData();
$event = (string) ($data['event'] ?? '');

if ($method !== 'POST') {
    jsonResponse(['ok' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

if ($event === 'page_view') {
    jsonResponse([
        'ok' => true,
        'data' => [
            'page_views' => recordUniquePageView($pdo, resolveVisitorHash()),
        ],
    ]);
}

if ($event === 'prompt_action') {
    $id = (int) ($data['id'] ?? 0);
    $type = resolveTrackType($data['type'] ?? 'prompt');
    $count = incrementPromptActionCount($pdo, $id, $type);

    if ($count === null) {
        jsonResponse(['ok' => false, 'message' => 'Eintrag nicht gefunden.'], 404);
    }

    jsonResponse([
        'ok' => true,
        'data' => [
            'action_count' => $count,
        ],
    ]);
}

if ($event === 'link_action') {
    $url = trim((string) ($data['url'] ?? ''));
    $count = incrementLinkActionCount($pdo, $url);

    if ($count === null) {
        jsonResponse(['ok' => false, 'message' => 'Link nicht gefunden.'], 404);
    }

    jsonResponse([
        'ok' => true,
        'data' => [
            'action_count' => $count,
        ],
    ]);
}

jsonResponse(['ok' => false, 'message' => 'Unbekanntes Ereignis.'], 400);
