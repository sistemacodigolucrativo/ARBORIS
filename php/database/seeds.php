<?php
declare(strict_types=1);

/**
 * Arboris Database Seeder
 * Populates categories, configurable game settings, default admin, and initial tree
 */

require_once __DIR__ . '/../src/Core/Database.php';

use App\Core\Database;

$db = Database::getConnection();

echo "==> Seeding Categories...\n";
$categories = [
    [
        'code' => 'cat_25',
        'name' => 'Categoria 25 Fichas',
        'token_requirement' => 25,
        'description' => 'Árvore inicial com ciclo de 25 fichas virtuais'
    ],
    [
        'code' => 'cat_50',
        'name' => 'Categoria 50 Fichas',
        'token_requirement' => 50,
        'description' => 'Árvore intermediária com ciclo de 50 fichas virtuais'
    ],
    [
        'code' => 'cat_100',
        'name' => 'Categoria 100 Fichas',
        'token_requirement' => 100,
        'description' => 'Árvore avançada com ciclo de 100 fichas virtuais'
    ],
];

$stmtCat = $db->prepare("
    INSERT OR IGNORE INTO game_categories (code, name, token_requirement, is_active, description)
    VALUES (:code, :name, :tokens, 1, :description)
");

foreach ($categories as $cat) {
    $stmtCat->execute([
        ':code' => $cat['code'],
        ':name' => $cat['name'],
        ':tokens' => $cat['token_requirement'],
        ':description' => $cat['description']
    ]);
}

echo "==> Seeding Game Settings (Documenting PENDING DEFINITION parameters)...\n";
$settings = [
    [
        'setting_key' => 'system_mode',
        'setting_value' => 'active',
        'description' => 'Modo operacional do sistema (active/maintenance)'
    ],
    [
        'setting_key' => 'transfer_amount_default',
        'setting_value' => '25',
        'description' => 'Valor base para transferência ao participante da vez [PARAMETRIZÁVEL - PENDENTE DE DEFINIÇÃO]'
    ],
    [
        'setting_key' => 'tronco_reward_multiplier',
        'setting_value' => '0',
        'description' => 'Multiplicador de premiação do Tronco [PENDENTE DE DEFINIÇÃO]'
    ],
    [
        'setting_key' => 'tree_split_policy',
        'setting_value' => 'bifurcation_standard',
        'description' => 'Política de divisão da árvore ao completar 15 posições [PENDENTE DE DEFINIÇÃO]'
    ],
    [
        'setting_key' => 'max_trees_per_user',
        'setting_value' => '1',
        'description' => 'Limite de participação simultânea em árvores [PENDENTE DE DEFINIÇÃO]'
    ],
    [
        'setting_key' => 'token_reuse_policy',
        'setting_value' => 'cycle_reinvest',
        'description' => 'Política de reutilização de fichas [PENDENTE DE DEFINIÇÃO]'
    ],
    [
        'setting_key' => 'allow_direct_registration',
        'setting_value' => '1',
        'description' => 'Permitir cadastro mesmo sem link específico de indicação (atribui ao Tronco raiz)'
    ]
];

$stmtSet = $db->prepare("
    INSERT OR IGNORE INTO game_settings (setting_key, setting_value, description)
    VALUES (:k, :v, :d)
");
foreach ($settings as $s) {
    $stmtSet->execute([':k' => $s['setting_key'], ':v' => $s['setting_value'], ':d' => $s['description']]);
}

echo "==> Seeding Administrator User...\n";
$adminPassword = password_hash('Admin@Arboris2026', PASSWORD_BCRYPT, ['cost' => 10]);

$stmtAdmin = $db->prepare("
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, status)
    VALUES (1, 'admin', 'admin@arboris.local', :pwd, 'admin', 'active')
");
$stmtAdmin->execute([':pwd' => $adminPassword]);

$db->prepare("
    INSERT OR IGNORE INTO user_profiles (user_id, full_name, avatar_url, phone_contact, bio)
    VALUES (1, 'Administrador do Sistema', '/avatars/admin.png', '+55 11 99999-0000', 'Gestor mestre da plataforma Arboris')
")->execute();

$db->prepare("
    INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (1, 1000)
")->execute();

echo "==> Seeding Initial Tronco Users & Seed Trees...\n";
// Create Tronco user for Cat 25
$troncoPassword = password_hash('Tronco@2026', PASSWORD_BCRYPT, ['cost' => 10]);
$stmtTronco = $db->prepare("
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, status)
    VALUES (2, 'tronco_maria', 'maria.tronco@arboris.local', :pwd, 'user', 'active')
");
$stmtTronco->execute([':pwd' => $troncoPassword]);

$db->prepare("
    INSERT OR IGNORE INTO user_profiles (user_id, full_name, avatar_url, phone_contact, bio)
    VALUES (2, 'Maria Silva (Tronco)', '/avatars/maria.png', '+55 11 98888-1111', 'Líder da Árvore Raiz 25')
")->execute();

$db->prepare("
    INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (2, 25)
")->execute();

// Create Tree 1 (Category 25)
$stmtTree = $db->prepare("
    INSERT OR IGNORE INTO trees (id, category_id, tree_code, tronco_user_id, status, cycle_number)
    VALUES (1, 1, 'ARB-TREE-25-001', 2, 'active', 1)
");
$stmtTree->execute();

// Instantiate the 15 positions for Tree 1
// N0: pos 0 (Tronco)
// N1: pos 1, 2
// N2: pos 3, 4, 5, 6
// N3: pos 7..14
$positionsData = [
    // [pos_index, level, parent_index, side]
    [0, 0, null, 'root'],
    [1, 1, 0, 'left'],
    [2, 1, 0, 'right'],
    [3, 2, 1, 'left'],
    [4, 2, 1, 'right'],
    [5, 2, 2, 'left'],
    [6, 2, 2, 'right'],
    [7, 3, 3, 'left'],
    [8, 3, 3, 'right'],
    [9, 3, 4, 'left'],
    [10, 3, 4, 'right'],
    [11, 3, 5, 'left'],
    [12, 3, 5, 'right'],
    [13, 3, 6, 'left'],
    [14, 3, 6, 'right'],
];

$stmtPos = $db->prepare("
    INSERT OR IGNORE INTO tree_positions (tree_id, position_index, level, side, user_id, status, occupied_at)
    VALUES (1, :pos_idx, :lvl, :side, :user_id, :status, :occ_at)
");

// Position 0 is occupied by Maria (Tronco)
$stmtPos->execute([
    ':pos_idx' => 0,
    ':lvl' => 0,
    ':side' => 'root',
    ':user_id' => 2,
    ':status' => 'occupied',
    ':occ_at' => date('Y-m-d H:i:s')
]);

// Positions 1..14 are created initially vacant
for ($i = 1; $i <= 14; $i++) {
    $p = $positionsData[$i];
    $stmtPos->execute([
        ':pos_idx' => $p[0],
        ':lvl' => $p[1],
        ':side' => $p[3],
        ':user_id' => null,
        ':status' => 'vacant',
        ':occ_at' => null
    ]);
}

// Generate default referral link for Maria (Tronco)
$mariaToken = bin2hex(random_bytes(32)); // 64 chars crypto hex
$db->prepare("
    INSERT OR IGNORE INTO referral_links (user_id, category_id, tree_id, token, is_active)
    VALUES (2, 1, 1, :token, 1)
")->execute([':token' => $mariaToken]);

echo "==> Seeding completed successfully!\n";
echo "    Admin: admin / Admin@Arboris2026\n";
echo "    Tronco User: tronco_maria / Tronco@2026\n";
echo "    Maria Referral Token: " . $mariaToken . "\n";
