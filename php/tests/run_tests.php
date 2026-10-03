<?php
declare(strict_types=1);

/**
 * Arboris Comprehensive Test Runner
 * Validates data integrity, transactional atomicity, concurrency protection,
 * ledger invariants, and referral pipelines on SQLite.
 */

// Autoloader setup
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require $file;
});

use App\Core\Database;
use App\Services\LedgerService;
use App\Services\TreeEngine;
use App\Services\TransferService;
use App\Services\ReferralService;
use App\Services\AuthService;

$testDbPath = sys_get_temp_dir() . '/arboris_test_' . bin2hex(random_bytes(6)) . '.sqlite';
Database::setDatabasePath($testDbPath);
$pdo = Database::getConnection();

// Run schema
$schema = file_get_contents(__DIR__ . '/../database/schema.sql');
$pdo->exec($schema);

$passed = 0;
$failed = 0;

function it(string $description, callable $fn): void {
    global $passed, $failed;
    echo "  • {$description} ... ";
    try {
        $fn();
        echo "\033[32m[PASS]\033[0m\n";
        $passed++;
    } catch (\Throwable $e) {
        echo "\033[31m[FAIL]\033[0m\n";
        echo "    \033[33mError: " . $e->getMessage() . "\033[0m\n";
        echo "    at " . $e->getFile() . ":" . $e->getLine() . "\n";
        $failed++;
    }
}

function assertEquals(mixed $expected, mixed $actual, string $msg = ''): void {
    if ($expected !== $actual) {
        throw new RuntimeException("Assertion failed: expected " . var_export($expected, true) . ", got " . var_export($actual, true) . ". " . $msg);
    }
}

function assertTrue(bool $condition, string $msg = ''): void {
    if (!$condition) {
        throw new RuntimeException("Assertion failed: condition is not true. " . $msg);
    }
}

echo "\n\033[1;36m==================================================\n";
echo "  ARBORIS AUTOMATED TEST SUITE (PHP 8.2 + SQLite)\n";
echo "==================================================\033[0m\n\n";

// --- Seed required categories and admin for tests ---
$pdo->exec("
    INSERT INTO game_categories (id, code, name, token_requirement, is_active)
    VALUES (1, 'cat_25', 'Categoria 25 Fichas', 25, 1);

    INSERT INTO game_settings (setting_key, setting_value, description)
    VALUES ('transfer_amount_default', '25', 'Valor base para transferencia');
");

// 1. Initial Tree Setup
it("Deve criar uma árvore completa com exatamente 15 posições estruturais", function() use ($pdo) {
    // Create Tronco user
    $pdo->exec("
        INSERT INTO users (id, username, email, password_hash, role, status)
        VALUES (10, 'tronco_test', 'tronco@test.com', 'hash', 'user', 'active');
        INSERT INTO user_profiles (user_id, full_name) VALUES (10, 'Tronco Teste');
        INSERT INTO wallets (user_id, balance) VALUES (10, 0);
    ");

    $treeId = TreeEngine::createTree(1, 10, null, $pdo);
    assertEquals(1, $treeId, "Tree ID deve ser 1");

    // Check count of positions
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tree_positions WHERE tree_id = :id");
    $stmt->execute([':id' => $treeId]);
    assertEquals(15, (int)$stmt->fetchColumn(), "A árvore deve conter rigorosamente 15 posições");

    // Position 0 must be occupied by Tronco
    $stmt0 = $pdo->prepare("SELECT user_id, status FROM tree_positions WHERE tree_id = :id AND position_index = 0");
    $stmt0->execute([':id' => $treeId]);
    $p0 = $stmt0->fetch();
    assertEquals(10, (int)$p0['user_id'], "Posição 0 deve pertencer ao Tronco");
    assertEquals('occupied', $p0['status']);

    // Positions 1..14 must be vacant
    $stmtVacant = $pdo->prepare("SELECT COUNT(*) FROM tree_positions WHERE tree_id = :id AND status = 'vacant'");
    $stmtVacant->execute([':id' => $treeId]);
    assertEquals(14, (int)$stmtVacant->fetchColumn(), "Exatamente 14 posições devem estar vagas inicialmente");
});

// 2. Referral Link Generation & Validation
it("Deve gerar link de indicação com token criptográfico seguro de 64 caracteres", function() use ($pdo) {
    $link = ReferralService::getOrCreateReferralLink(10, 1, 1, $pdo);
    assertTrue(strlen($link['token']) === 64, "Token deve ter 64 caracteres hexadecimais");
    assertTrue(ctype_xdigit($link['token']), "Token deve ser hexadecimal seguro");

    $validated = ReferralService::validateToken($link['token'], $pdo);
    assertTrue($validated !== null, "Token deve ser validado com sucesso");
    assertEquals('tronco_test', $validated['referrer_username']);
    assertEquals(25, (int)$validated['token_requirement']);
});

// 3. User Registration via Referral with Initial Grant & Placement
it("Deve cadastrar novo participante, conceder fichas no ledger e atribuir posição sequencial", function() use ($pdo) {
    $link = ReferralService::getOrCreateReferralLink(10, 1, 1, $pdo);

    $reg = ReferralService::registerWithReferral(
        $link['token'],
        'jogador_01',
        'jogador01@test.com',
        'Jogador Um',
        'senhaSegura123',
        $pdo
    );

    assertEquals(1, $reg['position_index'], "Primeiro participante deve ocupar a posição #1");
    assertEquals(25, $reg['tokens_granted'], "Deve receber 25 fichas gratuitas");

    // Check Wallet balance
    $balance = LedgerService::getBalance($reg['user_id'], $pdo);
    assertEquals(25, $balance, "Saldo na carteira deve ser exatamente 25 fichas");

    // Check Ledger entry
    $stmtL = $pdo->prepare("SELECT * FROM ledger_entries WHERE user_id = :uid AND type = 'INITIAL_GRANT'");
    $stmtL->execute([':uid' => $reg['user_id']]);
    $entry = $stmtL->fetch();
    assertTrue($entry !== false, "Entrada no Ledger deve existir");
    assertEquals(0, (int)$entry['balance_before']);
    assertEquals(25, (int)$entry['balance_after']);
    assertEquals(25, (int)$entry['amount']);

    // Check ledger invariant
    assertTrue(LedgerService::verifyLedgerIntegrity($reg['user_id'], $pdo), "Invariante contábil do Ledger deve ser 100% íntegra");
});

// 4. Duplicate Position Occupation Concurrency Protection
it("Não deve permitir que um mesmo usuário ocupe duas posições na mesma árvore", function() use ($pdo) {
    // Try assigning user 10 (already Tronco at pos 0) to another position
    $res = TreeEngine::assignNextVacantPosition(1, 10, $pdo);
    assertTrue($res['already_assigned'], "Deve identificar que o usuário já ocupa posição na árvore");
    assertEquals(0, $res['position_index'], "Deve manter a posição original");
});

// 5. Atomic Internal Transfer to Participante da Vez
it("Deve executar transferência atômica para o participante da vez (Tronco)", function() use ($pdo) {
    // Find player 1 ID
    $stmt = $pdo->query("SELECT id FROM users WHERE username = 'jogador_01'");
    $player1Id = (int)$stmt->fetchColumn();

    $senderBalanceBefore = LedgerService::getBalance($player1Id, $pdo);
    $troncoBalanceBefore = LedgerService::getBalance(10, $pdo);

    assertEquals(25, $senderBalanceBefore);
    assertEquals(0, $troncoBalanceBefore);

    $txKey = 'test_tx_key_' . bin2hex(random_bytes(8));
    $transferResult = TransferService::transferToParticipanteDaVez(
        $player1Id,
        1,
        $txKey,
        25,
        $pdo
    );

    assertTrue($transferResult['success'], "Transferência deve ser concluída com sucesso");

    $senderBalanceAfter = LedgerService::getBalance($player1Id, $pdo);
    $troncoBalanceAfter = LedgerService::getBalance(10, $pdo);

    assertEquals(0, $senderBalanceAfter, "Saldo do remetente deve ter reduzido para 0");
    assertEquals(25, $troncoBalanceAfter, "Saldo do Tronco deve ter subido para 25");

    // Verify Ledger integrity for both accounts
    assertTrue(LedgerService::verifyLedgerIntegrity($player1Id, $pdo), "Ledger do remetente íntegro");
    assertTrue(LedgerService::verifyLedgerIntegrity(10, $pdo), "Ledger do destinatário íntegro");
});

// 6. Idempotency & Double Transfer Prevention
it("Deve impedir transferência duplicada ou saldo negativo (Idempotência / Double-click)", function() use ($pdo) {
    $stmt = $pdo->query("SELECT id FROM users WHERE username = 'jogador_01'");
    $player1Id = (int)$stmt->fetchColumn();

    $threwException = false;
    try {
        // Attempting another transfer with 0 balance
        TransferService::transferToParticipanteDaVez(
            $player1Id,
            1,
            'duplicate_test_key',
            25,
            $pdo
        );
    } catch (\Throwable $e) {
        $threwException = true;
    }

    assertTrue($threwException, "Sistema deve barrar transferência por saldo insuficiente e regra de repetição de ciclo");
});

// 7. Tree Completion Cycle Trigger (Filling 15 positions)
it("Deve preencher posições até 15 e disparar conclusão de ciclo da árvore", function() use ($pdo) {
    $link = ReferralService::getOrCreateReferralLink(10, 1, 1, $pdo);

    // Positions 0 and 1 are occupied. We need 13 more participants (pos 2 to 14)
    for ($i = 2; $i <= 14; $i++) {
        $uname = "user_auto_{$i}";
        ReferralService::registerWithReferral(
            $link['token'],
            $uname,
            "{$uname}@test.com",
            "Auto User {$i}",
            "pass123456",
            $pdo
        );
    }

    // Now tree should have 15 occupied positions
    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM tree_positions WHERE tree_id = 1 AND status = 'occupied'");
    $stmtCount->execute();
    assertEquals(15, (int)$stmtCount->fetchColumn(), "Todas as 15 posições devem estar ocupadas");

    // Tree cycle should be marked completed
    $stmtCycle = $pdo->query("SELECT status FROM tree_cycles WHERE tree_id = 1");
    assertEquals('completed', $stmtCycle->fetchColumn(), "Ciclo deve estar concluído");

    // A 16th registration must not be placed on this full tree
    $threwOverflow = false;
    try {
        $u16 = "user_overflow";
        ReferralService::registerWithReferral(
            $link['token'],
            $u16,
            "overflow@test.com",
            "Overflow User",
            "pass123456",
            $pdo
        );
    } catch (\Throwable $e) {
        $threwOverflow = true;
    }

    assertTrue($threwOverflow, "Tentativa de ultrapassar 15 vagas deve ser estritamente bloqueada");
});

// Cleanup temp test database
@unlink($testDbPath);
@unlink($testDbPath . '-wal');
@unlink($testDbPath . '-shm');

echo "\n\033[1;36m==================================================\n";
echo "  TEST SUMMARY: {$passed} PASSADOS / {$failed} FALHAS\n";
echo "==================================================\033[0m\n\n";

if ($failed > 0) {
    exit(1);
}
