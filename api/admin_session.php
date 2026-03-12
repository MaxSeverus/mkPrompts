<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/http.php';

session_start();
jsonResponse(['ok' => true, 'isAdmin' => (bool)($_SESSION['is_admin'] ?? false)]);
