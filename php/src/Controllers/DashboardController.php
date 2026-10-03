<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\View;
use App\Core\Database;
use App\Services\AuthService;
use App\Services\LedgerService;
use App\Services\TreeEngine;
use App\Services\ReferralService;

class DashboardController
{
    public function index(Request $request): void
    {
        $user = AuthService::getCurrentUser();
        if (!$user) {
            Response::redirect('/login');
        }

        $db = Database::getConnection();

        // 1. Get active tree membership
        $stmtMembership = $db->prepare("
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
        $stmtMembership->execute([':uid' => $user['id']]);
        $membership = $stmtMembership->fetch();

        // 2. Participante da vez for active tree
        $participanteDaVez = null;
        if ($membership) {
            $participanteDaVez = TreeEngine::getParticipanteDaVez((int)$membership['tree_id'], $db);
        }

        // 3. User's referral links
        $referralLinks = [];
        $stmtCats = $db->query("SELECT id, name, token_requirement FROM game_categories WHERE is_active = 1");
        foreach ($stmtCats->fetchAll() as $cat) {
            $treeId = $membership ? (int)$membership['tree_id'] : null;
            $link = ReferralService::getOrCreateReferralLink($user['id'], (int)$cat['id'], $treeId, $db);
            $link['category_name'] = $cat['name'];
            $link['token_requirement'] = $cat['token_requirement'];
            $referralLinks[] = $link;
        }

        // 4. Ledger history (page 1, 10 items)
        $history = LedgerService::getUserHistory($user['id'], 1, 10, $db);

        Response::html(View::render('dashboard.index', [
            'user' => $user,
            'membership' => $membership,
            'participanteDaVez' => $participanteDaVez,
            'referralLinks' => $referralLinks,
            'history' => $history['items'],
            'totalHistory' => $history['total']
        ]));
    }
}
