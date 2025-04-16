<?php
// Hata raporlamayı aç
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Veritabanı bağlantı bilgileri
require_once 'config.php';

try {
    // Veritabanının varlığını kontrol et
    $tempDb = new PDO("mysql:host=" . DB_HOST, DB_USER, DB_PASS);
    $tempDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Veritabanını oluştur
    $tempDb->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    // Asıl veritabanına bağlan
    $db = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Tablo yapısını oluştur
    $db->exec("CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        high_score INT DEFAULT 0,
        level INT DEFAULT 1,
        last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_high_score (high_score)
    ) ENGINE=InnoDB");
    
    echo "Veritabanı ve tablolar başarıyla oluşturuldu!";
    
} catch(PDOException $e) {
    die("Kurulum hatası: " . $e->getMessage());
}
?> 