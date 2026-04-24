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
        action_count INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS links (
        url VARCHAR(500) PRIMARY KEY,
        description TEXT NOT NULL,
        category VARCHAR(80) NOT NULL,
        action_count INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS app_meta (
        meta_key VARCHAR(120) PRIMARY KEY,
        meta_value TEXT NOT NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS page_visitors (
        visitor_hash VARCHAR(128) NOT NULL,
        visit_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (visitor_hash, visit_date)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS modules (
        id {$idColumn},
        name VARCHAR(80) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    ensureContentTypeColumn($pdo, $driver);
    ensureProjectColumn($pdo, $driver);
    ensureNrColumnSupportsText($pdo, $driver);
    ensurePromptTimestampColumns($pdo, $driver);
    ensureLinksTableColumns($pdo, $driver);
    ensurePageVisitorsTable($pdo, $driver);
    ensureModuleIdColumn($pdo, $driver);
    ensureModulesTable($pdo, $driver);
    backfillLegacyEntryTimestamps($pdo);
    initializePageViewCounter($pdo);

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

    $stmt = $pdo->prepare('INSERT INTO prompts (nr, abbreviation, prompt, content_type, action_count, created_at, updated_at) VALUES (:nr, :abbreviation, :prompt, :content_type, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
    foreach ($seedData as $row) {
        $stmt->execute($row + ['content_type' => 'prompt']);
    }
}

function ensureLinksTableColumns(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $columns = $pdo->query('SHOW COLUMNS FROM links')->fetchAll();
        $columnNames = array_map(static fn($column) => (string) ($column['Field'] ?? ''), $columns);
        $requiredColumns = ['url', 'description', 'category', 'action_count', 'created_at', 'updated_at'];
        $hasRequiredColumns = count(array_diff($requiredColumns, $columnNames)) === 0;

        if ($hasRequiredColumns) {
            return;
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec('DROP TABLE IF EXISTS links_new');
            $pdo->exec("CREATE TABLE links_new (
                url VARCHAR(500) PRIMARY KEY,
                description TEXT NOT NULL,
                category VARCHAR(80) NOT NULL,
                action_count INT NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            $pdo->exec("INSERT INTO links_new (url, description, category, action_count, created_at, updated_at)
                SELECT url, description, category,
                    COALESCE(action_count, 0),
                    COALESCE(created_at, CURRENT_TIMESTAMP),
                    COALESCE(updated_at, CURRENT_TIMESTAMP)
                FROM links");
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
        $requiredColumns = ['url', 'description', 'category', 'action_count', 'created_at', 'updated_at'];
        $hasRequiredColumns = count(array_diff($requiredColumns, $columnNames)) === 0;

        if ($hasRequiredColumns) {
            return;
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec('DROP TABLE IF EXISTS links_new');
            $pdo->exec("CREATE TABLE links_new (
                url VARCHAR(500) PRIMARY KEY,
                description TEXT NOT NULL,
                category VARCHAR(80) NOT NULL,
                action_count INT NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $createdAtExpr = in_array('created_at', $columnNames, true) ? 'COALESCE(created_at, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';
            $updatedAtExpr = in_array('updated_at', $columnNames, true) ? 'COALESCE(updated_at, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';
            $actionCountExpr = in_array('action_count', $columnNames, true) ? 'COALESCE(action_count, 0)' : '0';
            $pdo->exec(sprintf(
                'INSERT INTO links_new (url, description, category, action_count, created_at, updated_at) SELECT %s, %s, %s, %s, %s, %s FROM links',
                'url',
                'description',
                'category',
                $actionCountExpr,
                $createdAtExpr,
                $updatedAtExpr
            ));
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

function ensurePromptTimestampColumns(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $createdAtColumn = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'created_at'")->fetch();
        if (!$createdAtColumn) {
            $pdo->exec('ALTER TABLE prompts ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        }

        $updatedAtColumn = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'updated_at'")->fetch();
        if (!$updatedAtColumn) {
            $pdo->exec('ALTER TABLE prompts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        }

        $actionCountColumn = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'action_count'")->fetch();
        if (!$actionCountColumn) {
            $pdo->exec('ALTER TABLE prompts ADD COLUMN action_count INT NOT NULL DEFAULT 0');
        }
        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(prompts)')->fetchAll();
        $columnNames = array_map(static fn($column) => (string) ($column['name'] ?? ''), $columns);
        $requiredColumns = ['id', 'nr', 'abbreviation', 'prompt', 'project', 'content_type', 'action_count', 'created_at', 'updated_at'];
        $hasRequiredColumns = count(array_diff($requiredColumns, $columnNames)) === 0;

        if ($hasRequiredColumns) {
            return;
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec('DROP TABLE IF EXISTS prompts_new');
            $pdo->exec("CREATE TABLE prompts_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nr VARCHAR(15) NOT NULL,
                abbreviation VARCHAR(50) NOT NULL,
                prompt TEXT NOT NULL,
                project VARCHAR(80) NOT NULL DEFAULT '',
                content_type VARCHAR(20) NOT NULL DEFAULT 'prompt',
                action_count INT NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $projectExpr = in_array('project', $columnNames, true) ? 'COALESCE(project, "")' : '""';
            $contentTypeExpr = in_array('content_type', $columnNames, true) ? 'COALESCE(content_type, "prompt")' : '"prompt"';
            $actionCountExpr = in_array('action_count', $columnNames, true) ? 'COALESCE(action_count, 0)' : '0';
            $createdAtExpr = in_array('created_at', $columnNames, true) ? 'COALESCE(created_at, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';
            $updatedAtExpr = in_array('updated_at', $columnNames, true) ? 'COALESCE(updated_at, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';
            $pdo->exec("INSERT INTO prompts_new (id, nr, abbreviation, prompt, project, content_type, action_count, created_at, updated_at)
                SELECT id, nr, abbreviation, prompt, {$projectExpr}, {$contentTypeExpr}, {$actionCountExpr}, {$createdAtExpr}, {$updatedAtExpr}
                FROM prompts");
            $pdo->exec('DROP TABLE prompts');
            $pdo->exec('ALTER TABLE prompts_new RENAME TO prompts');
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}

function ensurePageVisitorsTable(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS page_visitors (
            visitor_hash VARCHAR(128) NOT NULL,
            visit_date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (visitor_hash, visit_date)
        )");
        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(page_visitors)')->fetchAll();
        $columnNames = array_map(static fn($column) => (string) ($column['name'] ?? ''), $columns);
        $requiredColumns = ['visitor_hash', 'visit_date', 'created_at'];
        $hasRequiredColumns = count(array_diff($requiredColumns, $columnNames)) === 0;

        if ($hasRequiredColumns) {
            return;
        }

        $pdo->exec('DROP TABLE IF EXISTS page_visitors');
        $pdo->exec("CREATE TABLE page_visitors (
            visitor_hash VARCHAR(128) NOT NULL,
            visit_date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (visitor_hash, visit_date)
        )");
    }
}

function initializePageViewCounter(PDO $pdo): void
{
    if (getMetaValue($pdo, 'page_view_count') !== null) {
        return;
    }

    $count = (int) $pdo->query('SELECT COUNT(*) FROM page_visitors')->fetchColumn();
    setMetaValue($pdo, 'page_view_count', (string) $count);
}

function backfillLegacyEntryTimestamps(PDO $pdo): void
{
    $migrationKey = 'legacy_entry_timestamps_2026_03_18';
    $stmt = $pdo->prepare('SELECT meta_value FROM app_meta WHERE meta_key = :key');
    $stmt->execute(['key' => $migrationKey]);
    if ($stmt->fetchColumn() !== false) {
        return;
    }

    $midnight = gmdate('Y-m-d 00:00:00');

    $pdo->beginTransaction();
    try {
        $promptCount = (int) $pdo->query('SELECT COUNT(*) FROM prompts')->fetchColumn();
        if ($promptCount > 0) {
            $pdo->prepare('UPDATE prompts SET created_at = :timestamp, updated_at = :timestamp')->execute([
                'timestamp' => $midnight,
            ]);
        }

        $linkCount = (int) $pdo->query('SELECT COUNT(*) FROM links')->fetchColumn();
        if ($linkCount > 0) {
            $pdo->prepare('UPDATE links SET created_at = :timestamp, updated_at = :timestamp')->execute([
                'timestamp' => $midnight,
            ]);
        }

        $pdo->prepare('INSERT INTO app_meta (meta_key, meta_value) VALUES (:key, :value)')->execute([
            'key' => $migrationKey,
            'value' => $midnight,
        ]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
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

function ensureModuleIdColumn(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $column = $pdo->query("SHOW COLUMNS FROM prompts LIKE 'module_id'")->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE prompts ADD COLUMN module_id INT DEFAULT NULL");
        }
        return;
    }

    if ($driver === 'sqlite') {
        $columns = $pdo->query('PRAGMA table_info(prompts)')->fetchAll();
        foreach ($columns as $column) {
            if (($column['name'] ?? '') === 'module_id') {
                return;
            }
        }
        $pdo->exec("ALTER TABLE prompts ADD COLUMN module_id INT DEFAULT NULL");
    }
}

function ensureModulesTable(PDO $pdo, string $driver): void
{
    if (in_array($driver, ['mysql', 'mariadb'], true)) {
        $result = $pdo->query("SELECT COUNT(*) FROM modules")->fetchColumn();
        if ((int) $result > 0) {
            return;
        }
    } else {
        $result = $pdo->query("SELECT COUNT(*) FROM modules")->fetchColumn();
        if ((int) $result > 0) {
            return;
        }
    }

    $modules = [
        ['name' => 'Anfänger', 'slug' => 'anfaenger', 'sort_order' => 1],
        ['name' => 'Fortgeschrittene', 'slug' => 'fortgeschrittene', 'sort_order' => 2],
        ['name' => 'Spezial', 'slug' => 'spezial', 'sort_order' => 3],
    ];

    $stmt = $pdo->prepare('INSERT INTO modules (name, slug, sort_order, created_at, updated_at) VALUES (:name, :slug, :sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
    foreach ($modules as $module) {
        $stmt->execute($module);
    }
}

function getMetaValue(PDO $pdo, string $key): ?string
{
    $stmt = $pdo->prepare('SELECT meta_value FROM app_meta WHERE meta_key = :key');
    $stmt->execute(['key' => $key]);
    $value = $stmt->fetchColumn();

    return $value === false ? null : (string) $value;
}

function setMetaValue(PDO $pdo, string $key, string $value): void
{
    $stmt = $pdo->prepare('REPLACE INTO app_meta (meta_key, meta_value) VALUES (:key, :value)');
    $stmt->execute([
        'key' => $key,
        'value' => $value,
    ]);
}

function getTotalUsageCount(PDO $pdo): int
{
    $promptTotal = (int) $pdo->query('SELECT COALESCE(SUM(action_count), 0) FROM prompts')->fetchColumn();
    $linkTotal = (int) $pdo->query('SELECT COALESCE(SUM(action_count), 0) FROM links')->fetchColumn();

    return max(0, $promptTotal + $linkTotal);
}

function getPageViewCount(PDO $pdo): int
{
    return max(0, (int) (getMetaValue($pdo, 'page_view_count') ?? '0'));
}

function setPageViewCount(PDO $pdo, int $count): void
{
    setMetaValue($pdo, 'page_view_count', (string) max(0, $count));
}

function recordUniquePageView(PDO $pdo, string $visitorHash): int
{
    $today = gmdate('Y-m-d');
    $stmt = $pdo->prepare('SELECT 1 FROM page_visitors WHERE visitor_hash = :visitor_hash AND visit_date = :visit_date LIMIT 1');
    $stmt->execute([
        'visitor_hash' => $visitorHash,
        'visit_date' => $today,
    ]);

    if ($stmt->fetchColumn() !== false) {
        return getPageViewCount($pdo);
    }

    $pdo->beginTransaction();
    try {
        $insertStmt = $pdo->prepare('INSERT INTO page_visitors (visitor_hash, visit_date, created_at) VALUES (:visitor_hash, :visit_date, CURRENT_TIMESTAMP)');
        $insertStmt->execute([
            'visitor_hash' => $visitorHash,
            'visit_date' => $today,
        ]);

        $count = getPageViewCount($pdo) + 1;
        setPageViewCount($pdo, $count);
        $pdo->commit();

        return $count;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        $stmt->execute([
            'visitor_hash' => $visitorHash,
            'visit_date' => $today,
        ]);
        if ($stmt->fetchColumn() !== false) {
            return getPageViewCount($pdo);
        }

        throw $e;
    }
}

function incrementPromptActionCount(PDO $pdo, int $id, string $type): ?int
{
    $updateStmt = $pdo->prepare('UPDATE prompts SET action_count = action_count + 1 WHERE id = :id AND content_type = :type');
    $updateStmt->execute([
        'id' => $id,
        'type' => $type,
    ]);

    if ($updateStmt->rowCount() < 1) {
        return null;
    }

    $selectStmt = $pdo->prepare('SELECT action_count FROM prompts WHERE id = :id AND content_type = :type');
    $selectStmt->execute([
        'id' => $id,
        'type' => $type,
    ]);

    return (int) $selectStmt->fetchColumn();
}

function incrementLinkActionCount(PDO $pdo, string $url): ?int
{
    $updateStmt = $pdo->prepare('UPDATE links SET action_count = action_count + 1 WHERE url = :url');
    $updateStmt->execute([
        'url' => $url,
    ]);

    if ($updateStmt->rowCount() < 1) {
        return null;
    }

    $selectStmt = $pdo->prepare('SELECT action_count FROM links WHERE url = :url');
    $selectStmt->execute([
        'url' => $url,
    ]);

    return (int) $selectStmt->fetchColumn();
}
