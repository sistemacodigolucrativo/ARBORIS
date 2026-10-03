<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\View;
use App\Core\Session;
use App\Core\Database;
use App\Services\AuthService;
use App\Services\TreeEngine;
use App\Services\TransferService;

class TreeController
{
    /**
     * Display the "ÁRVORE-MÃE" screen
     */
    public function motherTree(Request $request, array $params = []): void
    {
        $user = AuthService::getCurrentUser();
        if (!$user) {
            Response::redirect('/login');
        }

        $db = Database::getConnection();

        // Specific tree ID if requested, or user's active tree
        $treeId = isset($params['id']) ? (int)$params['id'] : null;

        if (!$treeId) {
            $stmtUserTree = $db->prepare("
                SELECT tree_id FROM tree_positions
                WHERE user_id = :uid
                ORDER BY occupied_at DESC
                LIMIT 1
            ");
            $stmtUserTree->execute([':uid' => $user['id']]);
            $found = $stmtUserTree->fetch();
            $treeId = $found ? (int)$found['tree_id'] : 1;
        }

        try {
            $graphData = TreeEngine::getTreeGraphData($treeId, $user['id'], $db);
        } catch (\Throwable $e) {
            Session::setFlash('error', 'Árvore solicitada não foi localizada.');
            Response::redirect('/dashboard');
        }

        Response::html(View::render('tree.mother', [
            'user' => $user,
            'tree' => $graphData['tree'],
            'nodes' => $graphData['nodes'],
            'links' => $graphData['links'],
            'tronco' => $graphData['tronco'],
            'participanteDaVez' => $graphData['participante_da_vez'],
            'currentUserPosition' => $graphData['current_user_position'],
            'idempotencyKey' => 'tx_' . bin2hex(random_bytes(16))
        ]));
    }

    /**
     * Handle internal transfer submission from Árvore-Mãe screen
     */
    public function transfer(Request $request): void
    {
        $user = AuthService::getCurrentUser();
        if (!$user) {
            Response::redirect('/login');
        }

        $treeId = (int)$request->input('tree_id');
        $idempotencyKey = (string)$request->input('idempotency_key', bin2hex(random_bytes(16)));
        $amount = $request->input('amount') ? (int)$request->input('amount') : null;

        try {
            $result = TransferService::transferToParticipanteDaVez(
                $user['id'],
                $treeId,
                $idempotencyKey,
                $amount
            );

            Session::setFlash('success', "Transferência de {$result['amount']} fichas para {$result['recipient_name']} realizada com sucesso!");
        } catch (\Throwable $e) {
            Session::setFlash('error', $e->getMessage());
        }

        Response::redirect('/arvore-mae?id=' . $treeId);
    }
}
