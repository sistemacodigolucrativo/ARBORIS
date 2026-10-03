<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\Session;
use PDO;
use RuntimeException;

/**
 * Authentication & Identity Service
 */
class AuthService
{
    public static function attempt(string $identifier, string $password, ?PDO $pdo = null): ?array
    {
        $db = $pdo ?: Database::getConnection();

        $stmt = $db->prepare("
            SELECT u.*, p.full_name, p.avatar_url
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.username = :ident OR u.email = :ident
            LIMIT 1
        ");
        $stmt->execute([':ident' => $identifier]);
        $user = $stmt->fetch();

        if (!$user) {
            return null;
        }

        if (!password_verify($password, $user['password_hash'])) {
            return null;
        }

        if ($user['status'] !== 'active') {
            throw new RuntimeException("Sua conta está desativada ou bloqueada pela administração.");
        }

        // Establish session with regeneration
        Session::start();
        Session::regenerate();
        Session::set('user_id', (int)$user['id']);
        Session::set('username', $user['username']);
        Session::set('user_role', $user['role']);
        Session::set('full_name', $user['full_name'] ?: $user['username']);

        AuditService::log('USER_LOGIN', 'user', (int)$user['id'], (int)$user['id'], [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ], null, null, $db);

        return [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'full_name' => $user['full_name'] ?: $user['username'],
            'avatar_url' => $user['avatar_url'] ?: '/avatars/default.png'
        ];
    }

    public static function getCurrentUser(?PDO $pdo = null): ?array
    {
        Session::start();
        $userId = Session::get('user_id');
        if (!$userId) {
            return null;
        }

        $db = $pdo ?: Database::getConnection();
        $stmt = $db->prepare("
            SELECT u.id, u.username, u.email, u.role, u.status, u.created_at,
                   p.full_name, p.avatar_url, p.phone_contact, p.bio,
                   COALESCE(w.balance, 0) as balance
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN wallets w ON u.id = w.user_id
            WHERE u.id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        if (!$user || $user['status'] !== 'active') {
            Session::destroy();
            return null;
        }

        return [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'full_name' => $user['full_name'] ?: $user['username'],
            'avatar_url' => $user['avatar_url'] ?: '/avatars/default.png',
            'phone_contact' => $user['phone_contact'],
            'bio' => $user['bio'],
            'balance' => (int)$user['balance']
        ];
    }

    public static function logout(): void
    {
        $userId = Session::get('user_id');
        if ($userId) {
            AuditService::log('USER_LOGOUT', 'user', (int)$userId, (int)$userId);
        }
        Session::destroy();
    }
}
