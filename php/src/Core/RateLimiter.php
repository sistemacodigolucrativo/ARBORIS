<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Lightweight Zero-Dependency Rate Limiter for 512MB VPS
 * Uses local SQLite or transient files to prevent brute-force attacks
 */
class RateLimiter
{
    private static string $storageDir = '/tmp/arboris_ratelimit';

    public static function check(string $key, int $maxAttempts = 5, int $decaySeconds = 60): bool
    {
        if (!is_dir(self::$storageDir)) {
            @mkdir(self::$storageDir, 0755, true);
        }

        $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
        $file = self::$storageDir . '/' . $safeKey . '.json';
        $now = time();

        if (file_exists($file)) {
            $data = json_decode((string)file_get_contents($file), true);
            if (is_array($data)) {
                // Filter out timestamps outside window
                $attempts = array_filter($data['timestamps'] ?? [], fn($ts) => ($now - $ts) < $decaySeconds);
                if (count($attempts) >= $maxAttempts) {
                    return false; // Rate limit exceeded
                }
                $attempts[] = $now;
                file_put_contents($file, json_encode(['timestamps' => $attempts]), LOCK_EX);
                return true;
            }
        }

        file_put_contents($file, json_encode(['timestamps' => [$now]]), LOCK_EX);
        return true;
    }

    public static function reset(string $key): void
    {
        $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
        $file = self::$storageDir . '/' . $safeKey . '.json';
        if (file_exists($file)) {
            @unlink($file);
        }
    }
}
