-- ====================================================================
-- ARBORIS DATABASE SCHEMA (SQLite 3.x - Ultra-low Memory / Production)
-- Compatible with PDO SQLite and portable to PostgreSQL / MySQL
-- ====================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 33554432; -- 32MB max mmap for 512MB RAM target
PRAGMA page_size = 4096;
PRAGMA cache_size = -2000; -- 2000 pages (~8MB cache)

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COLLATE NOCASE,
    email VARCHAR(120) NOT NULL UNIQUE COLLATE NOCASE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user', 'admin'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'blocked'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    phone_contact VARCHAR(50) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Game Categories
CREATE TABLE IF NOT EXISTS game_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(30) NOT NULL UNIQUE, -- 'cat_25', 'cat_50', 'cat_100'
    name VARCHAR(50) NOT NULL,
    token_requirement INTEGER NOT NULL, -- 25, 50, 100 fichas virtuais
    is_active INTEGER NOT NULL DEFAULT 1,
    description TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Trees
CREATE TABLE IF NOT EXISTS trees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    tree_code VARCHAR(40) NOT NULL UNIQUE,
    tronco_user_id INTEGER DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'split'
    cycle_number INTEGER NOT NULL DEFAULT 1,
    parent_tree_id INTEGER DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES game_categories(id),
    FOREIGN KEY (tronco_user_id) REFERENCES users(id),
    FOREIGN KEY (parent_tree_id) REFERENCES trees(id)
);

CREATE INDEX IF NOT EXISTS idx_trees_category ON trees(category_id);
CREATE INDEX IF NOT EXISTS idx_trees_status ON trees(status);
CREATE INDEX IF NOT EXISTS idx_trees_tronco ON trees(tronco_user_id);

-- 5. Tree Positions (Exactly 15 positions per tree: 0 = Tronco, 1..14 = Branches)
CREATE TABLE IF NOT EXISTS tree_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id INTEGER NOT NULL,
    position_index INTEGER NOT NULL, -- 0 (Tronco), 1-2 (N1), 3-6 (N2), 7-14 (N3)
    level INTEGER NOT NULL, -- 0, 1, 2, 3
    parent_position_id INTEGER DEFAULT NULL,
    side VARCHAR(10) NOT NULL DEFAULT 'root', -- 'root', 'left', 'right'
    user_id INTEGER DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'vacant', -- 'vacant', 'occupied', 'reserved'
    occupied_at DATETIME DEFAULT NULL,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_position_id) REFERENCES tree_positions(id),
    CONSTRAINT uq_tree_position UNIQUE(tree_id, position_index)
);

CREATE INDEX IF NOT EXISTS idx_tree_pos_tree_id ON tree_positions(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_pos_user_id ON tree_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_pos_status ON tree_positions(status);
-- Prevent same user from occupying more than one slot in the same tree (when user_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tree_user_once ON tree_positions(tree_id, user_id) WHERE user_id IS NOT NULL;

-- 6. Tree Memberships (History of participation)
CREATE TABLE IF NOT EXISTS tree_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    position_index INTEGER NOT NULL,
    role_in_tree VARCHAR(20) NOT NULL, -- 'tronco', 'participant'
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (tree_id) REFERENCES trees(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON tree_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tree ON tree_memberships(tree_id);

-- 7. Referral Links (Opaque crypto-secure tokens, no sequential enumeration)
CREATE TABLE IF NOT EXISTS referral_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    tree_id INTEGER DEFAULT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    clicks INTEGER NOT NULL DEFAULT 0,
    registrations_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES game_categories(id),
    FOREIGN KEY (tree_id) REFERENCES trees(id)
);

CREATE INDEX IF NOT EXISTS idx_referral_token ON referral_links(token);
CREATE INDEX IF NOT EXISTS idx_referral_user ON referral_links(user_id);

-- 8. Referrals (Track registration source)
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_link_id INTEGER NOT NULL,
    referrer_user_id INTEGER NOT NULL,
    referred_user_id INTEGER NOT NULL UNIQUE,
    category_id INTEGER NOT NULL,
    tree_id INTEGER DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'registered', -- 'registered', 'placed', 'completed'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_link_id) REFERENCES referral_links(id),
    FOREIGN KEY (referrer_user_id) REFERENCES users(id),
    FOREIGN KEY (referred_user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES game_categories(id),
    FOREIGN KEY (tree_id) REFERENCES trees(id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);

-- 9. Wallets (Consolidated balance per user; always updated through Ledger)
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 0, -- Stored as integer tokens
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- 10. Ledger Entries (Double-entry / audit-proof virtual token transactions)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    source_user_id INTEGER DEFAULT NULL,
    destination_user_id INTEGER DEFAULT NULL,
    tree_id INTEGER DEFAULT NULL,
    category_id INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'INITIAL_GRANT', 'TRANSFER_OUT', 'TRANSFER_IN', 'SYSTEM_ADJUSTMENT', 'CYCLE_REWARD'
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- 'completed', 'cancelled', 'pending'
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    metadata TEXT DEFAULT NULL, -- JSON formatted metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (source_user_id) REFERENCES users(id),
    FOREIGN KEY (destination_user_id) REFERENCES users(id),
    FOREIGN KEY (tree_id) REFERENCES trees(id),
    FOREIGN KEY (category_id) REFERENCES game_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_uuid ON ledger_entries(transaction_uuid);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(type);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at);

-- 11. Internal Transfers (Atomic token transfers between players in a tree)
CREATE TABLE IF NOT EXISTS internal_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_uuid VARCHAR(36) NOT NULL UNIQUE,
    sender_user_id INTEGER NOT NULL,
    recipient_user_id INTEGER NOT NULL,
    tree_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    reason VARCHAR(100) DEFAULT 'transferencia_participante_vez',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_user_id) REFERENCES users(id),
    FOREIGN KEY (recipient_user_id) REFERENCES users(id),
    FOREIGN KEY (tree_id) REFERENCES trees(id),
    FOREIGN KEY (category_id) REFERENCES game_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_sender ON internal_transfers(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON internal_transfers(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_tree ON internal_transfers(tree_id);

-- 12. Tree Cycles (Cycle tracking and progression)
CREATE TABLE IF NOT EXISTS tree_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id INTEGER NOT NULL,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    tronco_user_id INTEGER NOT NULL,
    total_positions_filled INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'split_ready'
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME DEFAULT NULL,
    FOREIGN KEY (tree_id) REFERENCES trees(id),
    FOREIGN KEY (tronco_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cycles_tree ON tree_cycles(tree_id);

-- 13. Audit Logs (System events & administrative actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT NULL,
    action VARCHAR(60) NOT NULL, -- e.g., 'USER_REGISTERED', 'POSITION_ASSIGNED', 'TRANSFER_EXECUTED'
    entity_type VARCHAR(40) NOT NULL, -- 'user', 'tree', 'wallet', 'transfer', 'setting'
    entity_id INTEGER DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    details TEXT DEFAULT NULL, -- JSON
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 14. Game Settings (Parametrizable rules & flags marked PENDING DEFINITION)
CREATE TABLE IF NOT EXISTS game_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(60) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT NOT NULL,
    is_editable INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
