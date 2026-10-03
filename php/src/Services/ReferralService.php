<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

/**
 * Referral Link & Attribution Service
 * Generates unpredictable crypto-secure tokens and manages the 11-step registration pipeline
 */
class ReferralService
{
    /**
     * Generate or fetch an existing active referral link for a user and category
     */
    public static function getOrCreateReferralLink(int $userId, int $categoryId, ?int $treeId = null, ?PDO $pdo = null): array
    {
        $db = $pdo ?: Database::getConnection();

        // Check if active link exists
        $stmt = $db->prepare("
            SELECT * FROM referral_links
            WHERE user_id = :uid AND category_id = :cat_id AND is_active = 1
            LIMIT 1
        ");
        $stmt->execute([':uid' => $userId, ':cat_id' => $categoryId]);
        $existing = $stmt->fetch();

        if ($existing) {
            return $existing;
        }

        // Generate 64-char crypto secure hex token
        $token = bin2hex(random_bytes(32));

        $stmtInsert = $db->prepare("
            INSERT INTO referral_links (user_id, category_id, tree_id, token, clicks, registrations_count, is_active, created_at)
            VALUES (:uid, :cat_id, :tree_id, :token, 0, 0, 1, CURRENT_TIMESTAMP)
        ");
        $stmtInsert->execute([
            ':uid' => $userId,
            ':cat_id' => $categoryId,
            ':tree_id' => $treeId,
            ':token' => $token
        ]);

        $id = (int)$db->lastInsertId();

        AuditService::log('REFERRAL_LINK_CREATED', 'referral_link', $id, $userId, [
            'category_id' => $categoryId,
            'token' => $token
        ], null, null, $db);

        return [
            'id' => $id,
            'user_id' => $userId,
            'category_id' => $categoryId,
            'tree_id' => $treeId,
            'token' => $token,
            'clicks' => 0,
            'registrations_count' => 0,
            'is_active' => 1
        ];
    }

    /**
     * Validates a referral token securely from the database
     */
    public static function validateToken(string $token, ?PDO $pdo = null): ?array
    {
        if (empty($token) || strlen($token) < 16) {
            return null;
        }

        $db = $pdo ?: Database::getConnection();

        $stmt = $db->prepare("
            SELECT rl.*, u.username as referrer_username, p.full_name as referrer_name,
                   p.avatar_url as referrer_avatar,
                   c.name as category_name, c.token_requirement, c.code as category_code,
                   t.tree_code, t.status as tree_status
            FROM referral_links rl
            JOIN users u ON rl.user_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            JOIN game_categories c ON rl.category_id = c.id
            LEFT JOIN trees t ON rl.tree_id = t.id
            WHERE rl.token = :token AND rl.is_active = 1
            LIMIT 1
        ");
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        // Increment click counter asynchronously / safely
        $db->prepare("UPDATE referral_links SET clicks = clicks + 1 WHERE id = :id")->execute([':id' => $row['id']]);

        return $row;
    }

    /**
     * Executes the full 11-step backend registration & placement flow
     */
    public static function registerWithReferral(
        string $token,
        string $username,
        string $email,
        string $fullName,
        string $password,
        ?PDO $pdo = null
    ): array {
        $db = $pdo ?: Database::getConnection();

        // 1 & 2. Validate Link on backend
        $linkData = self::validateToken($token, $db);
        if (!$linkData) {
            throw new RuntimeException("Link de indicação inválido, expirado ou inativo.");
        }

        $referrerUserId = (int)$linkData['user_id'];
        $categoryId = (int)$linkData['category_id'];
        $treeId = !empty($linkData['tree_id']) ? (int)$linkData['tree_id'] : null;
        $initialTokens = (int)$linkData['token_requirement'];

        // Begin Immediate Transaction to guarantee atomic user creation, grant, and tree slot booking
        Database::beginImmediateTransaction($db);

        try {
            // Check username & email availability
            $stmtUserCheck = $db->prepare("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1");
            $stmtUserCheck->execute([':u' => $username, ':e' => $email]);
            if ($stmtUserCheck->fetch()) {
                throw new RuntimeException("Nome de usuário ou e-mail já cadastrado no sistema.");
            }

            // 4 & 5. Create Account with Password Hash (BCRYPT / Argon2id)
            $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
            $stmtInsertUser = $db->prepare("
                INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
                VALUES (:u, :e, :p, 'user', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ");
            $stmtInsertUser->execute([':u' => $username, ':e' => $email, ':p' => $passwordHash]);
            $newUserId = (int)$db->lastInsertId();

            // Create Profile
            $db->prepare("
                INSERT INTO user_profiles (user_id, full_name, avatar_url, updated_at)
                VALUES (:uid, :name, :avatar, CURRENT_TIMESTAMP)
            ")->execute([
                ':uid' => $newUserId,
                ':name' => $fullName,
                ':avatar' => '/avatars/default.png'
            ]);

            // 6. Register Referral Origin
            $stmtReferral = $db->prepare("
                INSERT INTO referrals (referral_link_id, referrer_user_id, referred_user_id, category_id, tree_id, status, created_at)
                VALUES (:link_id, :referrer_id, :referred_id, :cat_id, :tree_id, 'registered', CURRENT_TIMESTAMP)
            ");
            $stmtReferral->execute([
                ':link_id' => $linkData['id'],
                ':referrer_id' => $referrerUserId,
                ':referred_id' => $newUserId,
                ':cat_id' => $categoryId,
                ':tree_id' => $treeId
            ]);

            // Increment link registrations count
            $db->prepare("UPDATE referral_links SET registrations_count = registrations_count + 1 WHERE id = :id")
               ->execute([':id' => $linkData['id']]);

            // 7 & 8. Grant Initial Free Virtual Tokens in Ledger
            $idemKey = 'initial_grant_user_' . $newUserId . '_' . bin2hex(random_bytes(8));
            LedgerService::recordInitialGrant(
                $newUserId,
                $categoryId,
                $initialTokens,
                $idemKey,
                $treeId,
                ['source' => 'referral_registration', 'token' => $token],
                $db
            );

            // 9. Assign Position in Tree
            // If treeId is null or inactive, resolve an active tree in this category
            if (!$treeId) {
                $stmtActiveTree = $db->prepare("
                    SELECT id FROM trees
                    WHERE category_id = :cat_id AND status = 'active'
                    ORDER BY id ASC LIMIT 1
                ");
                $stmtActiveTree->execute([':cat_id' => $categoryId]);
                $foundTree = $stmtActiveTree->fetch();
                $treeId = $foundTree ? (int)$foundTree['id'] : null;
            }

            if (!$treeId) {
                // Create a new master tree with this user or system
                $treeId = TreeEngine::createTree($categoryId, $referrerUserId, null, $db);
            }

            $placement = TreeEngine::assignNextVacantPosition($treeId, $newUserId, $db);

            // Update referral status to placed
            $db->prepare("
                UPDATE referrals
                SET status = 'placed', tree_id = :tree_id
                WHERE referred_user_id = :uid
            ")->execute([':tree_id' => $treeId, ':uid' => $newUserId]);

            // Generate user's own referral link for this category
            $userOwnToken = bin2hex(random_bytes(32));
            $db->prepare("
                INSERT INTO referral_links (user_id, category_id, tree_id, token, clicks, registrations_count, is_active, created_at)
                VALUES (:uid, :cat_id, :tree_id, :token, 0, 0, 1, CURRENT_TIMESTAMP)
            ")->execute([
                ':uid' => $newUserId,
                ':cat_id' => $categoryId,
                ':tree_id' => $treeId,
                ':token' => $userOwnToken
            ]);

            AuditService::log('USER_REGISTERED_VIA_REFERRAL', 'user', $newUserId, $newUserId, [
                'referrer_id' => $referrerUserId,
                'category_id' => $categoryId,
                'tree_id' => $treeId,
                'position_index' => $placement['position_index']
            ], null, null, $db);

            Database::commit($db);

            return [
                'user_id' => $newUserId,
                'username' => $username,
                'full_name' => $fullName,
                'role' => 'user',
                'tree_id' => $treeId,
                'position_index' => $placement['position_index'],
                'tokens_granted' => $initialTokens,
                'own_referral_token' => $userOwnToken
            ];
        } catch (\Throwable $e) {
            if (Database::inTransaction()) {
                Database::rollBack($db);
            }
            throw $e;
        }
    }
}
