<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

/**
 * Isolated TreeEngine Service
 * Manages 15-node binary tree topology, atomic position allocation,
 * participant-in-turn resolution, and progression lifecycle.
 */
class TreeEngine
{
    public const TOTAL_POSITIONS = 15; // Position 0 (Tronco) + 14 branch positions

    /**
     * Topology mapping: [position_index => [level, parent_index, side]]
     */
    public const TOPOLOGY = [
        0 => [0, null, 'root'],
        1 => [1, 0, 'left'],
        2 => [1, 0, 'right'],
        3 => [2, 1, 'left'],
        4 => [2, 1, 'right'],
        5 => [2, 2, 'left'],
        6 => [2, 2, 'right'],
        7 => [3, 3, 'left'],
        8 => [3, 3, 'right'],
        9 => [3, 4, 'left'],
        10 => [3, 4, 'right'],
        11 => [3, 5, 'left'],
        12 => [3, 5, 'right'],
        13 => [3, 6, 'left'],
        14 => [3, 6, 'right'],
    ];

    /**
     * Initializes all 15 positions for a new tree
     */
    public static function createTree(int $categoryId, int $troncoUserId, ?int $parentTreeId = null, ?PDO $pdo = null): int
    {
        $db = $pdo ?: Database::getConnection();
        $isExternalTx = Database::inTransaction();
        if (!$isExternalTx) {
            Database::beginImmediateTransaction($db);
        }

        try {
            $treeCode = 'ARB-' . $categoryId . '-' . strtoupper(bin2hex(random_bytes(4)));

            $stmt = $db->prepare("
                INSERT INTO trees (category_id, tree_code, tronco_user_id, status, cycle_number, parent_tree_id, created_at)
                VALUES (:cat_id, :code, :tronco_id, 'active', 1, :parent_id, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                ':cat_id' => $categoryId,
                ':code' => $treeCode,
                ':tronco_id' => $troncoUserId,
                ':parent_id' => $parentTreeId
            ]);
            $treeId = (int)$db->lastInsertId();

            // Insert 15 positions
            $stmtPos = $db->prepare("
                INSERT INTO tree_positions (tree_id, position_index, level, side, user_id, status, occupied_at)
                VALUES (:tree_id, :pos_idx, :lvl, :side, :user_id, :status, :occ_at)
            ");

            // Position 0 = Tronco
            $stmtPos->execute([
                ':tree_id' => $treeId,
                ':pos_idx' => 0,
                ':lvl' => 0,
                ':side' => 'root',
                ':user_id' => $troncoUserId,
                ':status' => 'occupied',
                ':occ_at' => date('Y-m-d H:i:s')
            ]);

            // Register Tronco membership
            $db->prepare("
                INSERT INTO tree_memberships (tree_id, user_id, position_index, role_in_tree, joined_at)
                VALUES (:tree_id, :uid, 0, 'tronco', CURRENT_TIMESTAMP)
            ")->execute([':tree_id' => $treeId, ':uid' => $troncoUserId]);

            // Positions 1..14 = Branch vacant slots
            for ($i = 1; $i <= 14; $i++) {
                $topo = self::TOPOLOGY[$i];
                $stmtPos->execute([
                    ':tree_id' => $treeId,
                    ':pos_idx' => $i,
                    ':lvl' => $topo[0],
                    ':side' => $topo[2],
                    ':user_id' => null,
                    ':status' => 'vacant',
                    ':occ_at' => null
                ]);
            }

            // Create initial cycle
            $db->prepare("
                INSERT INTO tree_cycles (tree_id, cycle_number, tronco_user_id, total_positions_filled, status, started_at)
                VALUES (:tree_id, 1, :tronco_id, 0, 'in_progress', CURRENT_TIMESTAMP)
            ")->execute([':tree_id' => $treeId, ':tronco_id' => $troncoUserId]);

            AuditService::log('TREE_CREATED', 'tree', $treeId, $troncoUserId, [
                'category_id' => $categoryId,
                'tree_code' => $treeCode
            ], null, null, $db);

            if (!$isExternalTx) {
                Database::commit($db);
            }

            return $treeId;
        } catch (\Throwable $e) {
            if (!$isExternalTx && Database::inTransaction()) {
                Database::rollBack($db);
            }
            throw $e;
        }
    }

    /**
     * Atomically allocates the next vacant position in the tree to a user.
     * Guarantees no two users can book the same slot concurrently.
     */
    public static function assignNextVacantPosition(int $treeId, int $userId, ?PDO $pdo = null): array
    {
        $db = $pdo ?: Database::getConnection();
        $isExternalTx = Database::inTransaction();
        if (!$isExternalTx) {
            Database::beginImmediateTransaction($db);
        }

        try {
            // Verify tree exists and is active
            $stmtTree = $db->prepare("SELECT * FROM trees WHERE id = :id");
            $stmtTree->execute([':id' => $treeId]);
            $tree = $stmtTree->fetch();
            if (!$tree || $tree['status'] !== 'active') {
                throw new RuntimeException("A árvore especificada não está ativa para novos participantes.");
            }

            // Check if user is already in this tree
            $stmtUserInTree = $db->prepare("
                SELECT position_index FROM tree_positions
                WHERE tree_id = :tree_id AND user_id = :uid LIMIT 1
            ");
            $stmtUserInTree->execute([':tree_id' => $treeId, ':uid' => $userId]);
            $existingPos = $stmtUserInTree->fetch();
            if ($existingPos) {
                // User is already placed in this tree
                if (!$isExternalTx) {
                    Database::commit($db);
                }
                return [
                    'tree_id' => $treeId,
                    'position_index' => (int)$existingPos['position_index'],
                    'already_assigned' => true
                ];
            }

            // Find lowest vacant position (positions 1..14)
            $stmtVacant = $db->prepare("
                SELECT id, position_index, level
                FROM tree_positions
                WHERE tree_id = :tree_id AND status = 'vacant' AND position_index > 0
                ORDER BY position_index ASC
                LIMIT 1
            ");
            $stmtVacant->execute([':tree_id' => $treeId]);
            $vacant = $stmtVacant->fetch();

            if (!$vacant) {
                // Tree is full (15 positions occupied)!
                // Progression / bifurcation hook triggered
                self::handleTreeFull($treeId, $db);
                throw new RuntimeException("A árvore atingiu a lotação máxima de 15 posições.");
            }

            $posIndex = (int)$vacant['position_index'];
            $posId = (int)$vacant['id'];

            // Atomically occupy the position
            $stmtOccupy = $db->prepare("
                UPDATE tree_positions
                SET user_id = :uid, status = 'occupied', occupied_at = CURRENT_TIMESTAMP
                WHERE id = :pos_id AND status = 'vacant'
            ");
            $stmtOccupy->execute([':uid' => $userId, ':pos_id' => $posId]);

            if ($stmtOccupy->rowCount() === 0) {
                // Race condition caught by atomic check
                throw new RuntimeException("Conflito de concorrência: a posição foi preenchida simultaneamente por outro participante. Tente novamente.");
            }

            // Record membership
            $db->prepare("
                INSERT INTO tree_memberships (tree_id, user_id, position_index, role_in_tree, joined_at)
                VALUES (:tree_id, :uid, :pos_idx, 'participant', CURRENT_TIMESTAMP)
            ")->execute([
                ':tree_id' => $treeId,
                ':uid' => $userId,
                ':pos_idx' => $posIndex
            ]);

            // Update cycle count
            $db->prepare("
                UPDATE tree_cycles
                SET total_positions_filled = total_positions_filled + 1
                WHERE tree_id = :tree_id AND status = 'in_progress'
            ")->execute([':tree_id' => $treeId]);

            // Check if tree just reached 15 full positions
            $stmtFilledCount = $db->prepare("
                SELECT COUNT(*) as occupied_count
                FROM tree_positions
                WHERE tree_id = :tree_id AND status = 'occupied'
            ");
            $stmtFilledCount->execute([':tree_id' => $treeId]);
            $occupiedCount = (int)$stmtFilledCount->fetch()['occupied_count'];

            if ($occupiedCount >= self::TOTAL_POSITIONS) {
                self::handleTreeFull($treeId, $db);
            }

            AuditService::log('POSITION_ASSIGNED', 'tree_position', $posId, $userId, [
                'tree_id' => $treeId,
                'position_index' => $posIndex,
                'level' => $vacant['level']
            ], null, null, $db);

            if (!$isExternalTx) {
                Database::commit($db);
            }

            return [
                'tree_id' => $treeId,
                'position_index' => $posIndex,
                'level' => (int)$vacant['level'],
                'already_assigned' => false
            ];
        } catch (\Throwable $e) {
            if (!$isExternalTx && Database::inTransaction()) {
                Database::rollBack($db);
            }
            throw $e;
        }
    }

    /**
     * Resolves the "Participante da Vez" for the given tree
     * By default, the Tronco (position 0) is the recipient of the cycle.
     */
    public static function getParticipanteDaVez(int $treeId, ?PDO $pdo = null): ?array
    {
        $db = $pdo ?: Database::getConnection();

        // Tronco user at position 0
        $stmt = $db->prepare("
            SELECT tp.position_index, u.id as user_id, u.username,
                   p.full_name, p.avatar_url, p.phone_contact, t.tree_code, t.category_id,
                   c.name as category_name, c.token_requirement
            FROM tree_positions tp
            JOIN trees t ON tp.tree_id = t.id
            JOIN game_categories c ON t.category_id = c.id
            JOIN users u ON tp.user_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE tp.tree_id = :tree_id AND tp.position_index = 0 AND tp.status = 'occupied'
            LIMIT 1
        ");
        $stmt->execute([':tree_id' => $treeId]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return [
            'user_id' => (int)$row['user_id'],
            'username' => $row['username'],
            'full_name' => $row['full_name'] ?: $row['username'],
            'avatar_url' => $row['avatar_url'] ?: '/avatars/default.png',
            'position_index' => 0,
            'role' => 'TRONCO',
            'tree_code' => $row['tree_code'],
            'category_id' => (int)$row['category_id'],
            'category_name' => $row['category_name'],
            'token_requirement' => (int)$row['token_requirement'],
        ];
    }

    /**
     * Builds full graphical tree data (15 nodes + vector connector coordinates)
     */
    public static function getTreeGraphData(int $treeId, ?int $currentUserId = null, ?PDO $pdo = null): array
    {
        $db = $pdo ?: Database::getConnection();

        // Fetch tree & category
        $stmtTree = $db->prepare("
            SELECT t.*, c.name as category_name, c.token_requirement
            FROM trees t
            JOIN game_categories c ON t.category_id = c.id
            WHERE t.id = :id
        ");
        $stmtTree->execute([':id' => $treeId]);
        $tree = $stmtTree->fetch();
        if (!$tree) {
            throw new RuntimeException("Árvore não encontrada.");
        }

        // Fetch all 15 positions
        $stmtPos = $db->prepare("
            SELECT tp.*, u.username, p.full_name, p.avatar_url
            FROM tree_positions tp
            LEFT JOIN users u ON tp.user_id = u.id
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE tp.tree_id = :tree_id
            ORDER BY tp.position_index ASC
        ");
        $stmtPos->execute([':tree_id' => $treeId]);
        $positions = $stmtPos->fetchAll();

        // Node spatial coordinates on standard SVG 1000x560 canvas
        // Level 0: Y = 60 (1 node)
        // Level 1: Y = 180 (2 nodes)
        // Level 2: Y = 320 (4 nodes)
        // Level 3: Y = 470 (8 nodes)
        $layoutCoordinates = [
            0  => ['x' => 500, 'y' => 60],
            1  => ['x' => 260, 'y' => 180],
            2  => ['x' => 740, 'y' => 180],
            3  => ['x' => 140, 'y' => 310],
            4  => ['x' => 380, 'y' => 310],
            5  => ['x' => 620, 'y' => 310],
            6  => ['x' => 860, 'y' => 310],
            7  => ['x' => 80,  'y' => 460],
            8  => ['x' => 200, 'y' => 460],
            9  => ['x' => 320, 'y' => 460],
            10 => ['x' => 440, 'y' => 460],
            11 => ['x' => 560, 'y' => 460],
            12 => ['x' => 680, 'y' => 460],
            13 => ['x' => 800, 'y' => 460],
            14 => ['x' => 920, 'y' => 460],
        ];

        $nodes = [];
        $links = [];
        $occupiedCount = 0;
        $currentUserPosition = null;
        $troncoUser = null;

        // Position lookup map
        $posMap = [];
        foreach ($positions as $p) {
            $posMap[(int)$p['position_index']] = $p;
        }

        for ($i = 0; $i < self::TOTAL_POSITIONS; $i++) {
            $p = $posMap[$i] ?? null;
            $topo = self::TOPOLOGY[$i];
            $coords = $layoutCoordinates[$i];

            $isOccupied = $p && $p['status'] === 'occupied' && !empty($p['user_id']);
            $isTronco = ($i === 0);
            $isCurrentUser = ($currentUserId && $p && (int)$p['user_id'] === $currentUserId);

            if ($isOccupied) {
                $occupiedCount++;
            }

            if ($isCurrentUser) {
                $currentUserPosition = $i;
            }

            if ($isTronco && $isOccupied) {
                $troncoUser = [
                    'user_id' => (int)$p['user_id'],
                    'username' => $p['username'],
                    'full_name' => $p['full_name'] ?: $p['username'],
                    'avatar_url' => $p['avatar_url'] ?: '/avatars/default.png',
                ];
            }

            $nodes[] = [
                'position_index' => $i,
                'level' => $topo[0],
                'parent_index' => $topo[1],
                'side' => $topo[2],
                'status' => $isOccupied ? 'occupied' : 'vacant',
                'label' => $isOccupied ? ($p['full_name'] ?: $p['username']) : 'Vaga disponível',
                'username' => $p['username'] ?? null,
                'avatar_url' => $p['avatar_url'] ?? null,
                'user_id' => $p['user_id'] ? (int)$p['user_id'] : null,
                'is_tronco' => $isTronco,
                'is_current_user' => (bool)$isCurrentUser,
                'occupied_at' => $p['occupied_at'] ?? null,
                'x' => $coords['x'],
                'y' => $coords['y'],
            ];

            // Branch connections
            if ($topo[1] !== null) {
                $parentCoords = $layoutCoordinates[$topo[1]];
                $links[] = [
                    'from_index' => $topo[1],
                    'to_index' => $i,
                    'x1' => $parentCoords['x'],
                    'y1' => $parentCoords['y'] + 28, // bottom of parent node
                    'x2' => $coords['x'],
                    'y2' => $coords['y'] - 28, // top of child node
                    'is_active' => $isOccupied
                ];
            }
        }

        $participanteDaVez = self::getParticipanteDaVez($treeId, $db);

        return [
            'tree' => [
                'id' => (int)$tree['id'],
                'tree_code' => $tree['tree_code'],
                'category_id' => (int)$tree['category_id'],
                'category_name' => $tree['category_name'],
                'token_requirement' => (int)$tree['token_requirement'],
                'status' => $tree['status'],
                'cycle_number' => (int)$tree['cycle_number'],
                'total_positions' => self::TOTAL_POSITIONS,
                'occupied_positions' => $occupiedCount,
                'vacant_positions' => self::TOTAL_POSITIONS - $occupiedCount,
                'completion_percent' => round(($occupiedCount / self::TOTAL_POSITIONS) * 100),
            ],
            'nodes' => $nodes,
            'links' => $links,
            'tronco' => $troncoUser,
            'participante_da_vez' => $participanteDaVez,
            'current_user_position' => $currentUserPosition
        ];
    }

    /**
     * Progression / Tree Split Hook (when tree fills 15 positions)
     * MARKED: PENDENTE DE DEFINIÇÃO (Final division/multiplier rules)
     */
    private static function handleTreeFull(int $treeId, PDO $db): void
    {
        // Mark cycle completed
        $db->prepare("
            UPDATE tree_cycles
            SET status = 'completed', finished_at = CURRENT_TIMESTAMP
            WHERE tree_id = :tree_id AND status = 'in_progress'
        ")->execute([':tree_id' => $treeId]);

        $db->prepare("
            UPDATE trees
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = :tree_id
        ")->execute([':tree_id' => $treeId]);

        AuditService::log('TREE_CYCLE_COMPLETED', 'tree', $treeId, null, [
            'note' => 'Árvore atingiu 15 posições preenchidas. Divisão e progressão aguardam ativação das regras definitivas.',
            'status' => 'PENDENTE DE DEFINIÇÃO'
        ], null, null, $db);
    }
}
