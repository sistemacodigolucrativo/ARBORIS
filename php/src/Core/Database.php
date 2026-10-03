<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;

/**
 * High-Efficiency Database Connection Manager
 * Designed for ultra-low memory footprints on 512MB VPS
 * Abstracted for seamless migration between SQLite, PostgreSQL, and MySQL
 */
class Database
{
    private static ?PDO $instance = null;
    private static ?string $customPath = null;

    public static function setDatabasePath(string $path): void
    {
        self::$customPath = $path;
        self::$instance = null;
    }

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            self::$instance = self::createConnection();
        }
        return self::$instance;
    }

    private static function createConnection(): PDO
    {
        $connectionType = getenv('DB_CONNECTION') ?: 'sqlite';

        try {
            if ($connectionType === 'sqlite') {
                $dbPath = self::$customPath ?: (getenv('DB_DATABASE') ?: __DIR__ . '/../../database/arboris.sqlite');
                $dbDir = dirname($dbPath);
                if (!is_dir($dbDir)) {
                    mkdir($dbDir, 0755, true);
                }

                $dsn = "sqlite:{$dbPath}";
                $pdo = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 5 // 5 second busy timeout
                ]);

                // Ultra-low RAM & Concurrency Tuning for 512MB VPS
                $pdo->exec("PRAGMA foreign_keys = ON;");
                $pdo->exec("PRAGMA journal_mode = WAL;");
                $pdo->exec("PRAGMA synchronous = NORMAL;");
                $pdo->exec("PRAGMA temp_store = MEMORY;");
                $pdo->exec("PRAGMA mmap_size = 33554432;"); // 32MB max mmap
                $pdo->exec("PRAGMA cache_size = -2000;"); // ~8MB cache
                $pdo->exec("PRAGMA busy_timeout = 5000;"); // 5000ms

                return $pdo;
            }

            if ($connectionType === 'pgsql') {
                $host = getenv('DB_HOST') ?: '127.0.0.1';
                $port = getenv('DB_PORT') ?: '5432';
                $dbname = getenv('DB_DATABASE') ?: 'arboris';
                $user = getenv('DB_USERNAME') ?: 'postgres';
                $pass = getenv('DB_PASSWORD') ?: '';

                $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};options='--client_encoding=UTF8'";
                return new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            }

            if ($connectionType === 'mysql') {
                $host = getenv('DB_HOST') ?: '127.0.0.1';
                $port = getenv('DB_PORT') ?: '3306';
                $dbname = getenv('DB_DATABASE') ?: 'arboris';
                $user = getenv('DB_USERNAME') ?: 'root';
                $pass = getenv('DB_PASSWORD') ?: '';

                $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
                return new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            }

            throw new RuntimeException("Unsupported DB_CONNECTION: {$connectionType}");
        } catch (PDOException $e) {
            error_log("[Database Error] Connection failed: " . $e->getMessage());
            throw new RuntimeException("Database connection failure. Please check logs.", 0, $e);
        }
    }

    private static int $transactionDepth = 0;

    /**
     * SQLite-specific immediate transaction or nested savepoint.
     * Prevents nested transaction errors and acquires write locks safely.
     */
    public static function beginImmediateTransaction(?PDO $pdo = null): void
    {
        $db = $pdo ?: self::getConnection();
        if (self::$transactionDepth === 0) {
            $connectionType = getenv('DB_CONNECTION') ?: 'sqlite';
            if ($connectionType === 'sqlite') {
                $db->exec("BEGIN IMMEDIATE;");
            } else {
                $db->beginTransaction();
            }
        } else {
            $db->exec("SAVEPOINT sp_" . self::$transactionDepth . ";");
        }
        self::$transactionDepth++;
    }

    public static function commit(?PDO $pdo = null): void
    {
        $db = $pdo ?: self::getConnection();
        if (self::$transactionDepth > 0) {
            self::$transactionDepth--;
            if (self::$transactionDepth === 0) {
                $db->exec("COMMIT;");
            } else {
                $db->exec("RELEASE SAVEPOINT sp_" . self::$transactionDepth . ";");
            }
        }
    }

    public static function rollBack(?PDO $pdo = null): void
    {
        $db = $pdo ?: self::getConnection();
        if (self::$transactionDepth > 0) {
            self::$transactionDepth--;
            if (self::$transactionDepth === 0) {
                $db->exec("ROLLBACK;");
            } else {
                $db->exec("ROLLBACK TO SAVEPOINT sp_" . self::$transactionDepth . ";");
            }
        }
    }

    public static function inTransaction(): bool
    {
        return self::$transactionDepth > 0;
    }

    /**
     * Initialize schema if SQLite database does not exist
     */
    public static function runMigrations(?PDO $pdo = null): void
    {
        $db = $pdo ?: self::getConnection();
        $schemaPath = __DIR__ . '/../../database/schema.sql';
        if (file_exists($schemaPath)) {
            $sql = file_get_contents($schemaPath);
            $db->exec($sql);
        }
    }
}
