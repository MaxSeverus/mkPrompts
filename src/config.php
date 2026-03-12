<?php

declare(strict_types=1);

function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
    }
}

function env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function appConfig(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    loadEnv(__DIR__ . '/../.env');

    $config = [
        'app_name' => env('APP_NAME', 'Prompt-Bibliothek'),
        'admin_password' => env('ADMIN_PASSWORD', 'admin123'),
        'db_driver' => env('DB_DRIVER', 'sqlite'),
        'db_host' => env('DB_HOST', '127.0.0.1'),
        'db_port' => env('DB_PORT', '3306'),
        'db_name' => env('DB_NAME', 'prompt_library'),
        'db_user' => env('DB_USER', ''),
        'db_pass' => env('DB_PASS', ''),
        'sqlite_path' => env('SQLITE_PATH', __DIR__ . '/../data/prompts.sqlite'),
    ];

    return $config;
}
