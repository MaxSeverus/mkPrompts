<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/config.php';
require_once __DIR__ . '/../src/http.php';

session_start();

$data = requestData();
$password = (string)($data['password'] ?? '');
$config = appConfig();
$storedPassword = (string)($config['admin_password'] ?? '');

if ($storedPassword === '') {
    jsonResponse(['ok' => false, 'message' => 'Admin-Passwort fehlt in config.php'], 500);
}

if (!hash_equals($storedPassword, $password)) {
    jsonResponse([
        'ok' => false,
        'message' => 'Passwort ist falsch.',
        'debug' => [
            'received_length' => strlen($password),
            'stored_length' => strlen($storedPassword)
        ]
    ], 401);
}

session_regenerate_id(true);
$_SESSION['is_admin'] = true;

jsonResponse(['ok' => true, 'session' => session_id()]);
