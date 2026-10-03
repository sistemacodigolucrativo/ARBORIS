<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\Database;
use App\Services\AuthService;
use App\Services\LedgerService;
use App\Services\TreeEngine;
use App\Services\TransferService;
use App\Services\ReferralService;
use App\Services\AuditService;

/**
 * High-performance JSON API Controller
 */
class ApiController
{
    /**
     * Check referral token
     * GET /api/referral/check?token=...
     */
    public function checkReferral(Request $request): void
    {
        $token = (string)$request->getQuery('token', '');
        $data = ReferralService::validateToken($token);

        if (!$data) {
            Response::json(['valid' => false, 'error' => 'Token de indicação inválido ou expirado.'], 404);
        }

        Response::json([
            'valid' => true,
            'referrer_username' => $data['referrer_username'],
            'referrer_name' => $data['referrer_name'] ?: $data['referrer_username'],
            'category_name' => $data['category_name'],
            'token_requirement' => (int)$data['token_requirement'],
            'tree_code' => $data['tree_code']
        ]);
    }

    /**
     * Get tree graph data (15 nodes + vector coordinates)
     * GET /api/tree/{id}
     */
    public function getTreeData(Request $request, array $params): void
    {
        $treeId = (int)($params['id'] ?? 0);
        $user = AuthService::getCurrentUser();
        $currentUserId = $user ? $user['id'] : null;

        try {
            $graphData = TreeEngine::getTreeGraphData($treeId, $currentUserId);
            Response::json(['success' => true, 'data' => $graphData]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 404);
        }
    }

    /**
     * Execute internal transfer to participante da vez
     * POST /api/transfer/participante-vez
     */
    public function transferParticipanteVez(Request $request): void
    {
        $user = AuthService::getCurrentUser();
        if (!$user) {
            Response::json(['success' => false, 'error' => 'Autenticação necessária.'], 401);
        }

        $treeId = (int)$request->input('tree_id');
        $idempotencyKey = (string)$request->input('idempotency_key', bin2hex(random_bytes(16)));
        $customAmount = $request->input('amount') ? (int)$request->input('amount') : null;

        try {
            $res = TransferService::transferToParticipanteDaVez(
                $user['id'],
                $treeId,
                $idempotencyKey,
                $customAmount
            );

            Response::json([
                'success' => true,
                'message' => 'Fichas transferidas com sucesso ao participante da vez!',
                'transfer' => $res
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'error' => $e->getMessage()], 400);
        }
    }

    /**
     * Get player dashboard summary
     * GET /api/player/summary
     */
    public function getPlayerSummary(Request $request): void
    {
        $user = AuthService::getCurrentUser();
        if (!$user) {
            Response::json(['success' => false, 'error' => 'Não autenticado.'], 401);
        }

        $db = Database::getConnection();

        // Find user's active tree position
        $stmtPos = $db->prepare("
            SELECT tp.position_index, tp.level, tp.status, tp.occupied_at,
                   t.id as tree_id, t.tree_code, t.category_id, t.cycle_number,
                   c.name as category_name, c.token_requirement
            FROM tree_positions tp
            JOIN trees t ON tp.tree_id = t.id
            JOIN game_categories c ON t.category_id = c.id
            WHERE tp.user_id = :uid AND t.status = 'active'
            ORDER BY tp.occupied_at DESC
            LIMIT 1
        ");
        $stmtPos->execute([':uid' => $user['id']]);
        $membership = $stmtPos->fetch();

        // Get user referral links
        $stmtLinks = $db->prepare("
            SELECT rl.*, c.name as category_name, c.token_requirement
            FROM referral_links rl
            JOIN game_categories c ON rl.category_id = c.id
            WHERE rl.user_id = :uid AND rl.is_active = 1
            ORDER BY rl.id DESC
        ");
        $stmtLinks->execute([':uid' => $user['id']]);
        $referralLinks = $stmtLinks->fetchAll();

        // Get recent ledger entries
        $ledger = LedgerService::getUserHistory($user['id'], 1, 10, $db);

        // Participante da vez for active tree
        $participanteDaVez = null;
        if ($membership) {
            $participanteDaVez = TreeEngine::getParticipanteDaVez((int)$membership['tree_id'], $db);
        }

        Response::json([
            'success' => true,
            'user' => $user,
            'membership' => $membership,
            'participante_da_vez' => $participanteDaVez,
            'referral_links' => $referralLinks,
            'recent_history' => $ledger['items']
        ]);
    }
}
