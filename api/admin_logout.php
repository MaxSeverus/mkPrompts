<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/http.php';

session_start();
session_destroy();
jsonResponse(['ok' => true]);
