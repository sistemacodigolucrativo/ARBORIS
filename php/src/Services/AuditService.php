<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;

/**
 * Audit Logging Service
 * Guarantees accountability for all transactional, placement, and administrative actions
 */
class AuditService
{
    public static function log(
        string $action,
        string $entityType,
        ?int $entityId,
        ?int $userId = null,
        ?array $details = null,
        ?string $ip = null,
        ?string $userAgent = null,
        ?PDO $pdo = null
    ): void {
        try {
            $db = $pdo ?: Database::getConnection();
            $stmt = $db->prepare("
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details)
                VALUES (:user_id, :action, :entity_type, :entity_id, :ip_address, :user_agent, :details)
            ");

            $stmt->execute([
                ':user_id' => $userId,
                ':action' => $action,
                ':entity_type' => $entityType,
                ':entity_id' => $entityId,
                ':ip_address' => $ip ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'),
                ':user_agent' => $userAgent ?? substr($_SERVER['HTTP_USER_AGENT'] ?? 'CLI', 0, 255),
                ':details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null
            ]);
        } catch (\Throwable $e) {
            // Never break main flow if audit log write encounters an issue, but log to error_log
            error_log("[AuditService Error] Failed to write audit log: " . $e->getMessage());
        }
    }
}
