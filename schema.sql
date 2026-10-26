-- =============================================================================
-- FinSight Database Schema & Seed Data
-- Database Engine: MySQL 8.0+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS finance_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finance_tracker;

-- -----------------------------------------------------------------------------
-- Table: users
-- Supports authentication and multi-tenancy.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Table: transactions
-- Stores income and expense records with strict validations and indexing.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_positive_amount CHECK (amount > 0),
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes for high performance analytical aggregations & date filtering
    INDEX idx_user_date (user_id, date),
    INDEX idx_user_type_date (user_id, type, date),
    INDEX idx_user_category (user_id, category)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Seed Data: Demo User & Initial Reference Transactions
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, currency)
VALUES (1, 'Alex Morgan', 'alex@finsight.app', '$2b$10$DemoHashPlaceholderForTestingOnly1234567890', 'USD')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Transactions aligned with the FinSight reference dashboard values
INSERT INTO transactions (user_id, type, amount, category, description, date) VALUES
-- Recent income & expenses (Current period)
(1, 'income',  6800.00, 'Income',        'Salary - Monthly Tech Corp',      CURDATE()),
(1, 'income',  8650.00, 'Investments',   'Dividend Payout & Capital Gains', DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
(1, 'expense', 1100.00, 'Housing',       'Monthly Apartment Rent',          DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
(1, 'expense',  650.00, 'Food',          'Weekly Groceries & Farmers Mkt',  DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(1, 'expense',  420.00, 'Transport',     'Metro Pass & Fuel',               DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
(1, 'expense',  310.00, 'Entertainment', 'Concert & Streaming subs',       DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(1, 'expense',  250.00, 'Utilities',     'Electric, Water, High-Speed Net', DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(1, 'expense',  120.00, 'Food',          'Dinner with friends',             DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(1, 'expense',  300.00, 'Housing',       'Home Maintenance & Supplies',     DATE_SUB(CURDATE(), INTERVAL 12 DAY)),

-- Historical trend data (Past 5 months to populate 6-month chart)
(1, 'income',  5800.00, 'Income',        'Monthly Salary',                  DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
(1, 'expense', 2900.00, 'Housing',       'Rent & Living Expenses',          DATE_SUB(CURDATE(), INTERVAL 1 MONTH)),
(1, 'income',  6200.00, 'Income',        'Monthly Salary & Bonus',          DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
(1, 'expense', 3400.00, 'General',       'Living Expenses & Travel',        DATE_SUB(CURDATE(), INTERVAL 2 MONTH)),
(1, 'income',  5500.00, 'Income',        'Monthly Salary',                  DATE_SUB(CURDATE(), INTERVAL 3 MONTH)),
(1, 'expense', 2700.00, 'General',       'Living Expenses',                 DATE_SUB(CURDATE(), INTERVAL 3 MONTH)),
(1, 'income',  5400.00, 'Income',        'Monthly Salary',                  DATE_SUB(CURDATE(), INTERVAL 4 MONTH)),
(1, 'expense', 2600.00, 'General',       'Living Expenses',                 DATE_SUB(CURDATE(), INTERVAL 4 MONTH)),
(1, 'income',  5100.00, 'Income',        'Monthly Salary',                  DATE_SUB(CURDATE(), INTERVAL 5 MONTH)),
(1, 'expense', 2400.00, 'General',       'Living Expenses',                 DATE_SUB(CURDATE(), INTERVAL 5 MONTH));

