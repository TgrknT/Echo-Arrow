-- Veritabanını oluştur
CREATE DATABASE IF NOT EXISTS echo_arrow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE echo_arrow_db;

-- Oyuncular tablosu
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    high_score INT DEFAULT 0,
    level INT DEFAULT 1,
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_high_score (high_score)
) ENGINE=InnoDB; 