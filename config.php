<?php
// Hata raporlamayı ayarla
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Veritabanı bağlantı bilgileri
define('DB_HOST', 'localhost');
define('DB_NAME', 'grknn_oyun');
define('DB_USER', 'grknn_oyun');
define('DB_PASS', 'Gurkan.123');

// Güvenli erişim kontrolü
define('SECURE_ACCESS', true);

try {
    // PDO bağlantısı
    $db = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        )
    );

    // Tablo yapısını kontrol et ve oluştur
    $db->exec("CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        high_score INT DEFAULT 0,
        level INT DEFAULT 1,
        last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_high_score (high_score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

} catch(PDOException $e) {
    error_log("Veritabanı bağlantı hatası: " . $e->getMessage());
    die(json_encode(['success' => false, 'error' => 'Veritabanına bağlanılamadı']));
}

// Global fonksiyonlar
function cleanInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}
?> 