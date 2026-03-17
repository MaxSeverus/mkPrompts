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
        project VARCHAR(80) NOT NULL DEFAULT '',
        content_type VARCHAR(20) NOT NULL DEFAULT 'prompt',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS links (
        url VARCHAR(500) PRIMARY KEY,
        description TEXT NOT NULL,
        category VARCHAR(80) NOT NULL
    )");

    ensureContentTypeColumn($pdo, $driver);
    ensureProjectColumn($pdo, $driver);
    ensureNrColumnSupportsText($pdo, $driver);
    ensureLinksTableColumns($pdo, $driver);
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

    $stmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt, content_type) VALUES (:nr, :abbreviation, :prompt, :content_type)');
    foreach ($seedData as $row) {
        $stmt->execute($row + ['content_type' => 'prompt']);
    }
}

function ensureLinksTableColumns(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $columns = $pdo->query('SHOW COLUMNS FROM links')->fetchAll();
        $columnNames = array_map(static fn($column) => (string) ($column['Field'] ?? ''), $columns);
        $hasOnlyRequiredColumns = $columnNames === ['url', 'description', 'category'];

        if ($hasOnlyRequiredColumns) {
            return;
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec('DROP TABLE IF EXISTS links_new');
            $pdo->exec("CREATE TABLE links_new (
                url VARCHAR(500) PRIMARY KEY,
                description TEXT NOT NULL,
                category VARCHAR(80) NOT NULL
            )");
            $pdo->exec('INSERT INTO links_new (url, description, category) SELECT url, description, category FROM links');
            $pdo->exec('DROP TABLE links');
            $pdo->exec('RENAME TABLE links_new TO links');
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(links)')->fetchAll();
        $columnNames = array_map(static fn($column) => (string) ($column['name'] ?? ''), $columns);
        $hasOnlyRequiredColumns = $columnNames === ['url', 'description', 'category'];

        if ($hasOnlyRequiredColumns) {
            return;
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec("CREATE TABLE links_new (
                url VARCHAR(500) PRIMARY KEY,
                description TEXT NOT NULL,
                category VARCHAR(80) NOT NULL
            )");
            $pdo->exec('INSERT INTO links_new (url, description, category) SELECT url, description, category FROM links');
            $pdo->exec('DROP TABLE links');
            $pdo->exec('ALTER TABLE links_new RENAME TO links');
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}



function ensureContentTypeColumn(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $column = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'content_type'")->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE prompts ADD COLUMN content_type VARCHAR(20) NOT NULL DEFAULT 'prompt'");
        }
        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(prompts)')->fetchAll();
        foreach ($columns as $column) {
            if (($column['name'] ?? '') === 'content_type') {
                return;
            }
        }
        $pdo->exec("ALTER TABLE prompts ADD COLUMN content_type VARCHAR(20) NOT NULL DEFAULT 'prompt'");
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

function ensureProjectColumn(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $column = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'project'")->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE prompts ADD COLUMN project VARCHAR(80) NOT NULL DEFAULT ''");
        }
        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(prompts)')->fetchAll();
        foreach ($columns as $column) {
            if (($column['name'] ?? '') === 'project') {
                return;
            }
        }
        $pdo->exec("ALTER TABLE prompts ADD COLUMN project VARCHAR(80) NOT NULL DEFAULT ''");
    }
}
