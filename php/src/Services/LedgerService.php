<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use InvalidArgumentException;

/**
 * Double-Entry Accounting and Virtual Token Ledger Service
 * Enforces transactional immutability, balance integrity, and idempotency
 */
class LedgerService
{
    /**
     * Get user balance directly from the wallet
     */
    public static function getBalance(int $userId, ?PDO $pdo = null): int
    {
        $db = $pdo ?: Database::getConnection();
        $stmt = $db->prepare("SELECT balance FROM wallets WHERE user_id = :uid LIMIT 1");
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch();
        return $row ? (int)$row['balance'] : 0;
    }

    /**
     * Ensure a wallet exists for the given user
     */
    public static function ensureWalletExists(int $userId, ?PDO $pdo = null): void
    {
        $db = $pdo ?: Database::getConnection();
        $stmt = $db->prepare("
            INSERT OR IGNORE INTO wallets (user_id, balance, updated_at)
            VALUES (:uid, 0, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([':uid' => $userId]);
    }

    /**
     * Records an initial token grant (e.g. at free registration)
     */
    public static function recordInitialGrant(
        int $userId,
        int $categoryId,
        int $amount,
        string $idempotencyKey,
        ?int $treeId = null,
        ?array $metadata = null,
        ?PDO $pdo = null
    ): array {
        if ($amount <= 0) {
            throw new InvalidArgumentException("Grant amount must be greater than zero.");
        }

        $db = $pdo ?: Database::getConnection();
        $isExternalTx = Database::inTransaction();

        if (!$isExternalTx) {
            Database::beginImmediateTransaction($db);
        }

        try {
            // Check idempotency first
            $stmtCheck = $db->prepare("SELECT * FROM ledger_entries WHERE idempotency_key = :key LIMIT 1");
            $stmtCheck->execute([':key' => $idempotencyKey]);
            $existing = $stmtCheck->fetch();
            if ($existing) {
                if (!$isExternalTx) {
                    Database::commit($db);
                }
                return $existing;
            }

            self::ensureWalletExists($userId, $db);

            // Fetch current balance
            $stmtWallet = $db->prepare("SELECT balance FROM wallets WHERE user_id = :uid");
            $stmtWallet->execute([':uid' => $userId]);
            $wallet = $stmtWallet->fetch();
            $balanceBefore = $wallet ? (int)$wallet['balance'] : 0;
            $balanceAfter = $balanceBefore + $amount;

            $txUuid = self::generateUuid();

            // Insert Ledger Entry
            $stmtEntry = $db->prepare("
                INSERT INTO ledger_entries (
                    transaction_uuid, user_id, source_user_id, destination_user_id,
                    tree_id, category_id, type, amount, balance_before, balance_after,
                    status, idempotency_key, metadata, created_at
                ) VALUES (
                    :uuid, :uid, NULL, :dest,
                    :tree_id, :cat_id, 'INITIAL_GRANT', :amount, :before, :after,
                    'completed', :idem_key, :meta, CURRENT_TIMESTAMP
                )
            ");

            $stmtEntry->execute([
                ':uuid' => $txUuid,
                ':uid' => $userId,
                ':dest' => $userId,
                ':tree_id' => $treeId,
                ':cat_id' => $categoryId,
                ':amount' => $amount,
                ':before' => $balanceBefore,
                ':after' => $balanceAfter,
                ':idem_key' => $idempotencyKey,
                ':meta' => $metadata ? json_encode($metadata) : null
            ]);

            // Update Wallet Balance
            $stmtUpdate = $db->prepare("
                UPDATE wallets
                SET balance = :balance, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :uid
            ");
            $stmtUpdate->execute([':balance' => $balanceAfter, ':uid' => $userId]);

            if (!$isExternalTx) {
                Database::commit($db);
            }

            return [
                'transaction_uuid' => $txUuid,
                'user_id' => $userId,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'status' => 'completed'
            ];
        } catch (\Throwable $e) {
            if (!$isExternalTx && Database::inTransaction()) {
                Database::rollBack($db);
            }
            throw $e;
        }
    }

    /**
     * Execute an internal transfer between players atomically in the ledger
     */
    public static function executeInternalTransfer(
        int $senderId,
        int $recipientId,
        int $categoryId,
        int $amount,
        string $idempotencyKey,
        ?int $treeId = null,
        ?array $metadata = null,
        ?PDO $pdo = null
    ): array {
        if ($senderId === $recipientId) {
            throw new InvalidArgumentException("Sender and recipient cannot be the same user.");
        }
        if ($amount <= 0) {
            throw new InvalidArgumentException("Transfer amount must be positive.");
        }

        $db = $pdo ?: Database::getConnection();
        $isExternalTx = Database::inTransaction();

        if (!$isExternalTx) {
            Database::beginImmediateTransaction($db);
        }

        try {
            // Check idempotency first
            $stmtCheck = $db->prepare("SELECT * FROM internal_transfers WHERE idempotency_key = :key LIMIT 1");
            $stmtCheck->execute([':key' => $idempotencyKey]);
            $existing = $stmtCheck->fetch();
            if ($existing) {
                if (!$isExternalTx) {
                    Database::commit($db);
                }
                return $existing;
            }

            self::ensureWalletExists($senderId, $db);
            self::ensureWalletExists($recipientId, $db);

            // Check sender balance with lock
            $stmtSender = $db->prepare("SELECT balance FROM wallets WHERE user_id = :uid");
            $stmtSender->execute([':uid' => $senderId]);
            $senderWallet = $stmtSender->fetch();
            $senderBalanceBefore = $senderWallet ? (int)$senderWallet['balance'] : 0;

            if ($senderBalanceBefore < $amount) {
                throw new RuntimeException("Saldo insuficiente de fichas para realizar a transferência.");
            }

            // Check recipient balance
            $stmtRecip = $db->prepare("SELECT balance FROM wallets WHERE user_id = :uid");
            $stmtRecip->execute([':uid' => $recipientId]);
            $recipWallet = $stmtRecip->fetch();
            $recipBalanceBefore = $recipWallet ? (int)$recipWallet['balance'] : 0;

            $senderBalanceAfter = $senderBalanceBefore - $amount;
            $recipBalanceAfter = $recipBalanceBefore + $amount;

            $transferUuid = self::generateUuid();
            $txSenderUuid = self::generateUuid();
            $txRecipUuid = self::generateUuid();

            // 1. Record Sender Ledger Entry (Debit)
            $stmtDebit = $db->prepare("
                INSERT INTO ledger_entries (
                    transaction_uuid, user_id, source_user_id, destination_user_id,
                    tree_id, category_id, type, amount, balance_before, balance_after,
                    status, idempotency_key, metadata, created_at
                ) VALUES (
                    :uuid, :uid, :source, :dest,
                    :tree_id, :cat_id, 'TRANSFER_OUT', :amount, :before, :after,
                    'completed', :idem_key, :meta, CURRENT_TIMESTAMP
                )
            ");
            $stmtDebit->execute([
                ':uuid' => $txSenderUuid,
                ':uid' => $senderId,
                ':source' => $senderId,
                ':dest' => $recipientId,
                ':tree_id' => $treeId,
                ':cat_id' => $categoryId,
                ':amount' => -$amount,
                ':before' => $senderBalanceBefore,
                ':after' => $senderBalanceAfter,
                ':idem_key' => $idempotencyKey . '_debit',
                ':meta' => $metadata ? json_encode($metadata) : null
            ]);

            // 2. Record Recipient Ledger Entry (Credit)
            $stmtCredit = $db->prepare("
                INSERT INTO ledger_entries (
                    transaction_uuid, user_id, source_user_id, destination_user_id,
                    tree_id, category_id, type, amount, balance_before, balance_after,
                    status, idempotency_key, metadata, created_at
                ) VALUES (
                    :uuid, :uid, :source, :dest,
                    :tree_id, :cat_id, 'TRANSFER_IN', :amount, :before, :after,
                    'completed', :idem_key, :meta, CURRENT_TIMESTAMP
                )
            ");
            $stmtCredit->execute([
                ':uuid' => $txRecipUuid,
                ':uid' => $recipientId,
                ':source' => $senderId,
                ':dest' => $recipientId,
                ':tree_id' => $treeId,
                ':cat_id' => $categoryId,
                ':amount' => $amount,
                ':before' => $recipBalanceBefore,
                ':after' => $recipBalanceAfter,
                ':idem_key' => $idempotencyKey . '_credit',
                ':meta' => $metadata ? json_encode($metadata) : null
            ]);

            // 3. Update Wallets
            $db->prepare("UPDATE wallets SET balance = :b, updated_at = CURRENT_TIMESTAMP WHERE user_id = :u")
               ->execute([':b' => $senderBalanceAfter, ':u' => $senderId]);

            $db->prepare("UPDATE wallets SET balance = :b, updated_at = CURRENT_TIMESTAMP WHERE user_id = :u")
               ->execute([':b' => $recipBalanceAfter, ':u' => $recipientId]);

            // 4. Record Internal Transfer
            $stmtTransfer = $db->prepare("
                INSERT INTO internal_transfers (
                    transfer_uuid, sender_user_id, recipient_user_id, tree_id,
                    category_id, amount, status, idempotency_key, reason, created_at
                ) VALUES (
                    :uuid, :sender, :recipient, :tree_id,
                    :cat_id, :amount, 'completed', :idem_key, :reason, CURRENT_TIMESTAMP
                )
            ");
            $stmtTransfer->execute([
                ':uuid' => $transferUuid,
                ':sender' => $senderId,
                ':recipient' => $recipientId,
                ':tree_id' => $treeId,
                ':cat_id' => $categoryId,
                ':amount' => $amount,
                ':idem_key' => $idempotencyKey,
                ':reason' => $metadata['reason'] ?? 'transferencia_participante_vez'
            ]);

            if (!$isExternalTx) {
                Database::commit($db);
            }

            return [
                'transfer_uuid' => $transferUuid,
                'sender_id' => $senderId,
                'recipient_id' => $recipientId,
                'amount' => $amount,
                'sender_balance_after' => $senderBalanceAfter,
                'status' => 'completed'
            ];
        } catch (\Throwable $e) {
            if (!$isExternalTx && Database::inTransaction()) {
                Database::rollBack($db);
            }
            throw $e;
        }
    }

    /**
     * Audit invariant: Recalculates user balance from the sum of all ledger entries
     */
    public static function verifyLedgerIntegrity(int $userId, ?PDO $pdo = null): bool
    {
        $db = $pdo ?: Database::getConnection();

        $stmt = $db->prepare("
            SELECT COALESCE(SUM(amount), 0) AS calculated_balance
            FROM ledger_entries
            WHERE user_id = :uid AND status = 'completed'
        ");
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch();
        $calculated = (int)$row['calculated_balance'];

        $currentBalance = self::getBalance($userId, $db);

        return $calculated === $currentBalance;
    }

    /**
     * Get paginated ledger history for user
     */
    public static function getUserHistory(int $userId, int $page = 1, int $perPage = 15, ?PDO $pdo = null): array
    {
        $db = $pdo ?: Database::getConnection();
        $offset = ($page - 1) * $perPage;

        $stmt = $db->prepare("
            SELECT l.*, c.name as category_name,
                   u_src.username as source_username,
                   u_dest.username as dest_username
            FROM ledger_entries l
            LEFT JOIN game_categories c ON l.category_id = c.id
            LEFT JOIN users u_src ON l.source_user_id = u_src.id
            LEFT JOIN users u_dest ON l.destination_user_id = u_dest.id
            WHERE l.user_id = :uid
            ORDER BY l.id DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();

        $stmtCount = $db->prepare("SELECT COUNT(*) as total FROM ledger_entries WHERE user_id = :uid");
        $stmtCount->execute([':uid' => $userId]);
        $total = (int)$stmtCount->fetch()['total'];

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage)
        ];
    }

    private static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant RFC 4122
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
