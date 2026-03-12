<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/config.php';
require_once __DIR__ . '/../src/http.php';

session_start();
$data = requestData();
$password = (string)($data['password'] ?? '');

if (!hash_equals(appConfig()['admin_password'], $password)) {
    jsonResponse(['ok' => false, 'message' => 'Passwort ist falsch.'], 401);
}

$_SESSION['is_admin'] = true;
jsonResponse(['ok' => true]);
