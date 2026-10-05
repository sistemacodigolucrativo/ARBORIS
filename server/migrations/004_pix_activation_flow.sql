ALTER TABLE tree_positions ADD COLUMN IF NOT EXISTS activationStatus ENUM('reserved','active') NULL AFTER status;
UPDATE tree_positions SET activationStatus = 'active' WHERE status = 'occupied' AND activationStatus IS NULL;

CREATE TABLE IF NOT EXISTS activation_requests (
 id INT PRIMARY KEY,
 requesterUserId INT NOT NULL,
 troncoUserId INT NOT NULL,
 treeId INT NOT NULL,
 positionIndex INT NOT NULL,
 amount INT NOT NULL CHECK (amount >= 0),
 status ENUM('pending','approved','rejected') NOT NULL,
 requesterUsername VARCHAR(100) NOT NULL,
 troncoUsername VARCHAR(100) NOT NULL,
 whatsappMessage TEXT NULL,
 createdAt VARCHAR(30) NOT NULL,
 decidedAt VARCHAR(30) NULL,
 decisionNote TEXT NULL,
 INDEX (troncoUserId, status),
 INDEX (requesterUserId, status),
 FOREIGN KEY (requesterUserId) REFERENCES users(id),
 FOREIGN KEY (troncoUserId) REFERENCES users(id),
 FOREIGN KEY (treeId) REFERENCES trees(id)
) ENGINE=InnoDB;
