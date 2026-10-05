CREATE TABLE IF NOT EXISTS game_lock (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO game_lock (id) VALUES (1);
CREATE TABLE IF NOT EXISTS game_config (id INT PRIMARY KEY, config JSON NOT NULL) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 id INT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL,
 githubActor VARCHAR(100) NULL, role ENUM('participant','admin') NOT NULL,
 status ENUM('active','blocked') NOT NULL, createdAt VARCHAR(30) NOT NULL, updatedAt VARCHAR(30) NOT NULL,
 currentTreeId INT NULL, currentPositionIndex INT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS wallets (
 userId INT PRIMARY KEY, balance INT NOT NULL CHECK (balance >= 0), updatedAt VARCHAR(30) NOT NULL,
 FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS trees (
 id INT PRIMARY KEY, categoryId INT NOT NULL, treeCode VARCHAR(100) NOT NULL UNIQUE,
 troncoUserId INT NOT NULL, status ENUM('active','completed','archived') NOT NULL,
 cycleNumber INT NOT NULL, parentTreeId INT NULL, createdAt VARCHAR(30) NOT NULL, completedAt VARCHAR(30) NULL,
 FOREIGN KEY (troncoUserId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tree_positions (
 treeId INT NOT NULL, `index` INT NOT NULL CHECK (`index` BETWEEN 0 AND 14), level INT NOT NULL,
 side ENUM('root','left','right') NOT NULL, userId INT NULL, status ENUM('vacant','occupied') NOT NULL,
 occupiedAt VARCHAR(30) NULL, username VARCHAR(100) NULL, name VARCHAR(200) NULL,
 PRIMARY KEY (treeId, `index`), UNIQUE KEY position_user (treeId, userId),
 FOREIGN KEY (treeId) REFERENCES trees(id), FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS referrals (
 id INT PRIMARY KEY, referrerUserId INT NOT NULL, referredUserId INT NULL, treeId INT NOT NULL,
 token VARCHAR(200) NOT NULL UNIQUE, clicks INT NOT NULL, registrationsCount INT NOT NULL,
 isActive BOOLEAN NOT NULL, createdAt VARCHAR(30) NOT NULL,
 FOREIGN KEY (referrerUserId) REFERENCES users(id), FOREIGN KEY (referredUserId) REFERENCES users(id),
 FOREIGN KEY (treeId) REFERENCES trees(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ledger (
 id INT PRIMARY KEY, type VARCHAR(60) NOT NULL, fromUserId INT NULL, toUserId INT NOT NULL, treeId INT NULL,
 amount INT NOT NULL CHECK (amount >= 0), reason TEXT NOT NULL, idempotencyKey VARCHAR(200) NOT NULL UNIQUE,
 createdAt VARCHAR(30) NOT NULL, fromUsername VARCHAR(100) NULL, toUsername VARCHAR(100) NULL,
 FOREIGN KEY (fromUserId) REFERENCES users(id), FOREIGN KEY (toUserId) REFERENCES users(id),
 FOREIGN KEY (treeId) REFERENCES trees(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_log (
 id INT PRIMARY KEY, actorUserId INT NOT NULL, action VARCHAR(100) NOT NULL,
 entity VARCHAR(100) NOT NULL, entityId JSON NOT NULL, metadata JSON NOT NULL,
 createdAt VARCHAR(30) NOT NULL, actorUsername VARCHAR(100) NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS credentials (
 userId INT PRIMARY KEY, passwordHash VARCHAR(250) NOT NULL, FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
 tokenHash CHAR(64) PRIMARY KEY, userId INT NOT NULL, expiresAt DATETIME NOT NULL,
 INDEX (expiresAt), FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS action_requests (
 requestKey VARCHAR(128) PRIMARY KEY, actorId INT NOT NULL, requestHash CHAR(64) NOT NULL,
 result JSON NOT NULL, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;