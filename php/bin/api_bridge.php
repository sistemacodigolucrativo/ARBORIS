<?php
declare(strict_types=1);

/**
 * Enhanced CLI API Bridge Helper for Local Full-Stack Server
 */

require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Services/AuditService.php';
require_once __DIR__ . '/../src/Services/LedgerService.php';
require_once __DIR__ . '/../src/Services/TreeEngine.php';
require_once __DIR__ . '/../src/Services/TransferService.php';
require_once __DIR__ . '/../src/Services/ReferralService.php';

use App\Core\Database;
use App\Services\ReferralService;
use App\Services\TransferService;
use App\Services\TreeEngine;
use App\Services\AuditService;

$action = $argv[1] ?? 'state';

if ($action === 'state') {
    $pdo = Database::getConnection();
    
    // Categories
    $categories = $pdo->query("SELECT * FROM game_categories ORDER BY token_requirement ASC")->fetchAll(PDO::FETCH_ASSOC);
    
    // System Settings
    $settings = $pdo->query("SELECT * FROM game_settings ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
    
    // Users with profile and wallet
    $users = $pdo->query("
        SELECT u.id, u.username, u.email, u.role, u.status, p.full_name, COALESCE(w.balance, 0) as balance,
               (SELECT tree_id FROM tree_positions WHERE user_id = u.id AND status = 'occupied' LIMIT 1) as current_tree_id,
               (SELECT position_index FROM tree_positions WHERE user_id = u.id AND status = 'occupied' LIMIT 1) as current_position_index
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN wallets w ON u.id = w.user_id
        ORDER BY u.id ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Trees Global with occupant count and Tronco info
    $trees = $pdo->query("
        SELECT t.*, 
               u.username as tronco_username, 
               p.full_name as tronco_full_name, 
               c.name as category_name, 
               c.token_requirement,
               (SELECT COUNT(*) FROM tree_positions tp WHERE tp.tree_id = t.id AND tp.status = 'occupied') as occupied_count
        FROM trees t
        JOIN game_categories c ON t.category_id = c.id
        LEFT JOIN users u ON t.tronco_user_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ORDER BY t.id ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // All Positions grouped by tree
    $positions = $pdo->query("
        SELECT tp.*, u.username, p.full_name
        FROM tree_positions tp
        LEFT JOIN users u ON tp.user_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ORDER BY tp.tree_id ASC, tp.position_index ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Ledger entries
    $ledger = $pdo->query("
        SELECT l.*, u.username 
        FROM ledger_entries l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.id DESC LIMIT 30
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Audit logs
    $audit = $pdo->query("
        SELECT a.*, u.username
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.id DESC LIMIT 30
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Referral Links with tree and user details
    $links = $pdo->query("
        SELECT r.*, u.username, p.full_name, t.tree_code
        FROM referral_links r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN trees t ON r.tree_id = t.id
        WHERE r.is_active = 1
        ORDER BY r.id ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'categories' => $categories,
        'settings' => $settings,
        'users' => $users,
        'trees' => $trees,
        'positions' => $positions,
        'ledger' => $ledger,
        'audit' => $audit,
        'referral_links' => $links
    ], JSON_UNESCAPED_UNICODE);
    exit(0);
}

if ($action === 'register') {
    $payload = json_decode($argv[2] ?? '{}', true) ?: [];
    try {
        $result = ReferralService::registerWithReferral(
            $payload['token'] ?? '',
            $payload['username'] ?? '',
            $payload['email'] ?? '',
            $payload['fullName'] ?? '',
            $payload['password'] ?? 'senha123456'
        );
        echo json_encode(['success' => true, 'result' => $result], JSON_UNESCAPED_UNICODE);
    } catch (\Throwable $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit(0);
}

if ($action === 'transfer') {
    $payload = json_decode($argv[2] ?? '{}', true) ?: [];
    try {
        $result = TransferService::transferToParticipanteDaVez(
            (int)($payload['senderId'] ?? 0),
            (int)($payload['treeId'] ?? 1),
            (string)($payload['idempotencyKey'] ?? ('tx_' . bin2hex(random_bytes(8)))),
            (int)($payload['amount'] ?? 25)
        );
        echo json_encode(['success' => true, 'result' => $result], JSON_UNESCAPED_UNICODE);
    } catch (\Throwable $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit(0);
}

if ($action === 'track_click') {
    $payload = json_decode($argv[2] ?? '{}', true) ?: [];
    $token = $payload['token'] ?? '';
    if ($token) {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE referral_links SET clicks = clicks + 1 WHERE token = :token");
        $stmt->execute([':token' => $token]);
        echo json_encode(['success' => true]);
        exit(0);
    }
    echo json_encode(['success' => false, 'error' => 'Token required']);
    exit(0);
}

if ($action === 'create_tree') {
    $payload = json_decode($argv[2] ?? '{}', true) ?: [];
    $categoryId = (int)($payload['categoryId'] ?? 1);
    $troncoUserId = (int)($payload['troncoUserId'] ?? 2);
    try {
        $treeId = TreeEngine::createTree($categoryId, $troncoUserId);
        // Create referral link for this Tronco on this new tree
        $token = bin2hex(random_bytes(32));
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO referral_links (user_id, category_id, tree_id, token, clicks, registrations_count, is_active, created_at)
            VALUES (:uid, :cid, :tid, :token, 0, 0, 1, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            ':uid' => $troncoUserId,
            ':cid' => $categoryId,
            ':tid' => $treeId,
            ':token' => $token
        ]);

        AuditService::log('TREE_CREATED', 'trees', $treeId, $troncoUserId, "Árvore criada pelo administrador");

        echo json_encode(['success' => true, 'treeId' => $treeId, 'token' => $token], JSON_UNESCAPED_UNICODE);
    } catch (\Throwable $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit(0);
}

if ($action === 'toggle_user_status') {
    $payload = json_decode($argv[2] ?? '{}', true) ?: [];
    $userId = (int)($payload['userId'] ?? 0);
    if ($userId > 1) { // Prevent toggling admin
        $pdo = Database::getConnection();
        $user = $pdo->query("SELECT status FROM users WHERE id = {$userId}")->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            $newStatus = $user['status'] === 'active' ? 'suspended' : 'active';
            $stmt = $pdo->prepare("UPDATE users SET status = :status WHERE id = :id");
            $stmt->execute([':status' => $newStatus, ':id' => $userId]);
            AuditService::log('USER_STATUS_CHANGE', 'users', $userId, 1, "Status alterado para {$newStatus}");
            echo json_encode(['success' => true, 'newStatus' => $newStatus]);
            exit(0);
        }
    }
    echo json_encode(['success' => false, 'error' => 'Invalid user']);
    exit(0);
}

echo json_encode(['error' => 'Unknown action']);
