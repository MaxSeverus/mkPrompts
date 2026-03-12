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
        nr VARCHAR(15) NOT NULL,
        abbreviation VARCHAR(50) NOT NULL,
        prompt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    ensureNrColumnSupportsText($pdo, $driver);
    $count = (int) $pdo->query('SELECT COUNT(*) FROM prompts')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $seedData = [
        [
            'nr' => '1',
            'abbreviation' => 'HINWEIS',
            'prompt' => '[HIER DIE VOLLSTÄNDIGE LISTE DER BESTEHENDEN PROMPTS 1:1 EINFÜGEN]'
        ],
    ];

    $stmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt) VALUES (:nr, :abbreviation, :prompt)');
    foreach ($seedData as $row) {
        $stmt->execute($row);
    }
}


function ensureNrColumnSupportsText(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $column = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'nr'")->fetch();
        $columnType = strtolower((string) ($column['Type'] ?? ''));
        if (strpos($columnType, 'varchar') !== 0) {
            $pdo->exec('ALTER TABLE prompts MODIFY nr VARCHAR(15) NOT NULL');
        }
        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(prompts)')->fetchAll();
        foreach ($columns as $column) {
            if (($column['name'] ?? '') !== 'nr') {
                continue;
            }
            $type = strtoupper((string) ($column['type'] ?? ''));
            if ($type !== '' && strpos($type, 'VARCHAR(15)') === 0) {
                return;
            }
            break;
        }
    }
}
