<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\View;
use App\Core\Session;
use App\Core\Database;
use App\Services\AuditService;
use App\Services\TreeEngine;
use PDO;

class AdminController
{
    public function index(Request $request): void
    {
        $db = Database::getConnection();

        // High level counters (single-query counts)
        $totalUsers = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $totalTrees = (int)$db->query("SELECT COUNT(*) FROM trees")->fetchColumn();
        $totalTransfers = (int)$db->query("SELECT COUNT(*) FROM internal_transfers")->fetchColumn();
        $totalLedgerVolume = (int)$db->query("SELECT COALESCE(SUM(ABS(amount)), 0) FROM ledger_entries")->fetchColumn();

        // Paginated users
        $page = max(1, (int)$request->getQuery('page', 1));
        $search = trim((string)$request->getQuery('search', ''));
        $perPage = 10;
        $offset = ($page - 1) * $perPage;

        if ($search !== '') {
            $stmtUsers = $db->prepare("
                SELECT u.*, p.full_name, w.balance
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN wallets w ON u.id = w.user_id
                WHERE u.username LIKE :q OR u.email LIKE :q OR p.full_name LIKE :q
                ORDER BY u.id DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmtUsers->bindValue(':q', "%{$search}%");
            $stmtUsers->bindValue(':limit', $perPage, PDO::PARAM_INT);
            $stmtUsers->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmtUsers->execute();
            $users = $stmtUsers->fetchAll();

            $stmtCount = $db->prepare("
                SELECT COUNT(*) FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE u.username LIKE :q OR u.email LIKE :q OR p.full_name LIKE :q
            ");
            $stmtCount->execute([':q' => "%{$search}%"]);
            $totalUserMatches = (int)$stmtCount->fetchColumn();
        } else {
            $stmtUsers = $db->prepare("
                SELECT u.*, p.full_name, w.balance
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                LEFT JOIN wallets w ON u.id = w.user_id
                ORDER BY u.id DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmtUsers->bindValue(':limit', $perPage, PDO::PARAM_INT);
            $stmtUsers->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmtUsers->execute();
            $users = $stmtUsers->fetchAll();
            $totalUserMatches = $totalUsers;
        }

        // Active Trees
        $trees = $db->query("
            SELECT t.*, c.name as category_name, c.token_requirement,
                   u.username as tronco_username, p.full_name as tronco_name,
                   (SELECT COUNT(*) FROM tree_positions tp WHERE tp.tree_id = t.id AND tp.status = 'occupied') as occupied_count
            FROM trees t
            JOIN game_categories c ON t.category_id = c.id
            LEFT JOIN users u ON t.tronco_user_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            ORDER BY t.id DESC
            LIMIT 10
        ")->fetchAll();

        // Recent Audit Logs
        $auditLogs = $db->query("
            SELECT a.*, u.username
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.id DESC
            LIMIT 15
        ")->fetchAll();

        // Parametrizable Game Settings
        $settings = $db->query("SELECT * FROM game_settings ORDER BY id ASC")->fetchAll();

        // Categories
        $categories = $db->query("SELECT * FROM game_categories ORDER BY token_requirement ASC")->fetchAll();

        Response::html(View::render('admin.index', [
            'totalUsers' => $totalUsers,
            'totalTrees' => $totalTrees,
            'totalTransfers' => $totalTransfers,
            'totalLedgerVolume' => $totalLedgerVolume,
            'users' => $users,
            'userPage' => $page,
            'userTotalPages' => ceil($totalUserMatches / $perPage),
            'search' => $search,
            'trees' => $trees,
            'auditLogs' => $auditLogs,
            'settings' => $settings,
            'categories' => $categories
        ]));
    }

    public function toggleUserStatus(Request $request, array $params): void
    {
        $userId = (int)($params['id'] ?? 0);
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT id, status, username FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            Session::setFlash('error', 'Usuário não encontrado.');
            Response::redirect('/admin');
        }

        $newStatus = ($user['status'] === 'active') ? 'blocked' : 'active';
        $db->prepare("UPDATE users SET status = :s WHERE id = :id")->execute([':s' => $newStatus, ':id' => $userId]);

        AuditService::log('ADMIN_USER_STATUS_CHANGE', 'user', $userId, Session::get('user_id'), [
            'target_username' => $user['username'],
            'old_status' => $user['status'],
            'new_status' => $newStatus
        ]);

        Session::setFlash('success', "Status do usuário {$user['username']} alterado para {$newStatus}.");
        Response::redirect('/admin');
    }

    public function updateSetting(Request $request): void
    {
        $key = trim((string)$request->input('setting_key'));
        $value = trim((string)$request->input('setting_value'));

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE game_settings SET setting_value = :v, updated_at = CURRENT_TIMESTAMP WHERE setting_key = :k");
        $stmt->execute([':v' => $value, ':k' => $key]);

        AuditService::log('ADMIN_SETTING_UPDATED', 'game_setting', null, Session::get('user_id'), [
            'key' => $key,
            'new_value' => $value
        ]);

        Session::setFlash('success', "Parâmetro '{$key}' atualizado com sucesso.");
        Response::redirect('/admin');
    }
}
