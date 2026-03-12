<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = appConfig();
    $driver = strtolower($config['db_driver']);

    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['db_host'],
            $config['db_port'],
            $config['db_name']
        );
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass']);
    } else {
        $dir = dirname($config['sqlite_path']);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $pdo = new PDO('sqlite:' . $config['sqlite_path']);
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    initializeDatabase($pdo, $driver);

    return $pdo;
}

function initializeDatabase(PDO $pdo, string $driver): void
{
    $idColumn = in_array($driver, ['mysql', 'mariadb'], true)
        ? 'INT AUTO_INCREMENT PRIMARY KEY'
        : 'INTEGER PRIMARY KEY AUTOINCREMENT';

    $pdo->exec("CREATE TABLE IF NOT EXISTS prompts (
        id {$idColumn},
        nr INTEGER NOT NULL,
        abbreviation VARCHAR(50) NOT NULL,
        prompt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $count = (int) $pdo->query('SELECT COUNT(*) FROM prompts')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $seedData = [
        [
            'nr' => 1,
            'abbreviation' => 'HINWEIS',
            'prompt' => '[HIER DIE VOLLSTÄNDIGE LISTE DER BESTEHENDEN PROMPTS 1:1 EINFÜGEN]'
        ],
    ];

    $stmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt) VALUES (:nr, :abbreviation, :prompt)');
    foreach ($seedData as $row) {
        $stmt->execute($row);
    }
}
