<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use InvalidArgumentException;

/**
 * TransferService
 * Responsible for atomic, rule-validated internal transfers between tree participants.
 * Fully parametrizable and protected against replay, double-booking, and negative balances.
 */
class TransferService
{
    /**
     * Executes internal transfer to the "Participante da Vez"
     */
    public static function transferToParticipanteDaVez(
        int $senderUserId,
        int $treeId,
        string $idempotencyKey,
        ?int $customAmount = null,
        ?PDO $pdo = null
    ): array {
        $db = $pdo ?: Database::getConnection();
        Database::beginImmediateTransaction($db);

        try {
            // 1. Validate Tree
            $stmtTree = $db->prepare("
                SELECT t.*, c.token_requirement, c.id as cat_id
                FROM trees t
                JOIN game_categories c ON t.category_id = c.id
                WHERE t.id = :id
            ");
            $stmtTree->execute([':id' => $treeId]);
            $tree = $stmtTree->fetch();
            if (!$tree) {
                throw new RuntimeException("Árvore não encontrada.");
            }
            if ($tree['status'] !== 'active') {
                throw new RuntimeException("A árvore atual não está ativa para transferências.");
            }

            // 2. Validate Sender (must be in the tree and active)
            $stmtSender = $db->prepare("
                SELECT tp.position_index, u.status as user_status
                FROM tree_positions tp
                JOIN users u ON tp.user_id = u.id
                WHERE tp.tree_id = :tree_id AND tp.user_id = :uid
            ");
            $stmtSender->execute([':tree_id' => $treeId, ':uid' => $senderUserId]);
            $senderPos = $stmtSender->fetch();
            if (!$senderPos) {
                throw new RuntimeException("O remetente não ocupa uma posição válida nesta árvore.");
            }
            if ($senderPos['user_status'] !== 'active') {
                throw new RuntimeException("Usuário remetente está bloqueado ou inativo.");
            }

            // 3. Validate Recipient ("Participante da Vez")
            $recipient = TreeEngine::getParticipanteDaVez($treeId, $db);
            if (!$recipient) {
                throw new RuntimeException("Não foi possível determinar o participante da vez para esta árvore.");
            }
            $recipientUserId = $recipient['user_id'];

            if ($senderUserId === $recipientUserId) {
                throw new RuntimeException("O participante da vez não pode transferir fichas para si mesmo.");
            }

            // Check if sender has already transferred to the current Tronco in this cycle (idempotency/rule check)
            $stmtPrior = $db->prepare("
                SELECT id FROM internal_transfers
                WHERE sender_user_id = :sender AND recipient_user_id = :recipient
                  AND tree_id = :tree_id AND status = 'completed'
                LIMIT 1
            ");
            $stmtPrior->execute([
                ':sender' => $senderUserId,
                ':recipient' => $recipientUserId,
                ':tree_id' => $treeId
            ]);
            if ($stmtPrior->fetch()) {
                throw new RuntimeException("Você já realizou a sua transferência para o participante da vez deste ciclo.");
            }

            // 4. Resolve Amount based on parametrizable configuration
            // [REGRA PARAMETRIZÁVEL - PENDENTE DE DEFINIÇÃO]
            $amount = self::resolveTransferAmount($tree, $customAmount, $db);

            // 5. Validate Sender Balance
            $senderBalance = LedgerService::getBalance($senderUserId, $db);
            if ($senderBalance < $amount) {
                throw new RuntimeException("Saldo insuficiente de fichas ({$senderBalance}) para transferir a quantia requerida ({$amount}).");
            }

            // 6. Execute atomic transfer via Ledger
            $result = LedgerService::executeInternalTransfer(
                $senderUserId,
                $recipientUserId,
                (int)$tree['cat_id'],
                $amount,
                $idempotencyKey,
                $treeId,
                [
                    'reason' => 'transferencia_participante_vez',
                    'tree_code' => $tree['tree_code'],
                    'rule' => 'transfer_amount_configured'
                ],
                $db
            );

            // 7. Audit Log
            AuditService::log('TRANSFER_EXECUTED', 'internal_transfer', null, $senderUserId, [
                'recipient_user_id' => $recipientUserId,
                'tree_id' => $treeId,
                'amount' => $amount,
                'idempotency_key' => $idempotencyKey
            ], null, null, $db);

            Database::commit($db);

            return [
                'success' => true,
                'transfer_uuid' => $result['transfer_uuid'],
                'amount' => $amount,
                'recipient_name' => $recipient['full_name'],
                'new_balance' => $result['sender_balance_after'],
            ];
        } catch (\Throwable $e) {
            if (Database::inTransaction()) {
                Database::rollBack($db);
            }
            throw $e;
        }
    }

    /**
     * Resolves the transfer amount dynamically from game settings
     * Default fallback: category token requirement.
     * PARAMETRIZÁVEL - PENDENTE DE DEFINIÇÃO
     */
    private static function resolveTransferAmount(array $tree, ?int $customAmount, PDO $db): int
    {
        if ($customAmount !== null && $customAmount > 0) {
            return $customAmount;
        }

        $stmt = $db->prepare("SELECT setting_value FROM game_settings WHERE setting_key = 'transfer_amount_default' LIMIT 1");
        $stmt->execute();
        $setting = $stmt->fetch();

        if ($setting && is_numeric($setting['setting_value'])) {
            $val = (int)$setting['setting_value'];
            if ($val > 0) {
                return $val;
            }
        }

        // Fallback to the category requirement
        return (int)$tree['token_requirement'];
    }
}
