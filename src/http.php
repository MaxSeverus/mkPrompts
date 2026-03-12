<?php

declare(strict_types=1);

function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestData(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function requireAdminAuth(): void
{
    session_start();
    if (!($_SESSION['is_admin'] ?? false)) {
        jsonResponse(['ok' => false, 'message' => 'Nicht autorisiert.'], 401);
    }
}
