<?php
// En başa ekle
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/debug.log');

// Çıktı tamponlamasını başlat
ob_start();

// Config dosyasını yükle
require_once 'config.php';

// CORS ve header ayarları
$allowedOrigins = array(
    'http://localhost',
    'https://localhost',
    'http://oyun.grknn.com',
    'https://oyun.grknn.com'
);

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");
}

// JSON header
header('Content-Type: application/json');

// OPTIONS isteklerine hemen yanıt ver
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    header("HTTP/1.1 200 OK");
    exit();
}

// Debug log fonksiyonu
function debugLog($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $logMessage .= " - Data: " . print_r($data, true);
    }
    error_log($logMessage);
}

try {
    debugLog("Request started");
    
    // İstek bilgilerini logla
    debugLog("Request Method: " . $_SERVER['REQUEST_METHOD']);
    debugLog("Request Headers: ", getallheaders());
    debugLog("POST Data: ", $_POST);
    debugLog("GET Data: ", $_GET);
    
    // İşlem tipini al
    $action = isset($_POST['action']) ? filter_var($_POST['action'], FILTER_SANITIZE_FULL_SPECIAL_CHARS) : 
             (isset($_GET['action']) ? filter_var($_GET['action'], FILTER_SANITIZE_FULL_SPECIAL_CHARS) : '');
    
    debugLog("Action: " . $action);
    
    switch($action) {
        case 'init':
            $result = ['success' => true];
            debugLog("Init result", $result);
            echo json_encode($result);
            break;
            
        case 'get_player':
            $name = isset($_POST['name']) ? filter_var($_POST['name'], FILTER_SANITIZE_STRING) : '';
            debugLog("Getting player: " . $name);
            
            if(empty($name)) {
                throw new Exception('Oyuncu adı gerekli');
            }
            
            $stmt = $db->prepare("SELECT * FROM players WHERE name = :name");
            $stmt->execute([':name' => $name]);
            $player = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $player]);
            break;
            
        case 'save_player':
            $name = isset($_POST['name']) ? cleanInput($_POST['name']) : '';
            $score = isset($_POST['score']) ? filter_var($_POST['score'], FILTER_VALIDATE_INT) : 0;
            $level = isset($_POST['level']) ? filter_var($_POST['level'], FILTER_VALIDATE_INT) : 1;
            
            debugLog("Save player request - Name: $name, Score: $score, Level: $level");
            
            // Veri doğrulama
            $validation = validatePlayerData($name, $score, $level);
            if (!$validation['valid']) {
                debugLog("Veri doğrulama hatası: " . $validation['error']);
                echo json_encode(['success' => false, 'error' => $validation['error']]);
                exit;
            }
            
            try {
                // Daha önce kaydı var mı kontrol et
                $checkStmt = $db->prepare("SELECT high_score FROM players WHERE name = :name");
                $checkStmt->execute([':name' => $name]);
                $existingPlayer = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingPlayer) {
                    // Sadece daha yüksek skorlar için güncelle
                    if ($score > $existingPlayer['high_score']) {
                        $stmt = $db->prepare("UPDATE players SET 
                                            high_score = :score, 
                                            level = :level,
                                            last_played = CURRENT_TIMESTAMP
                                            WHERE name = :name");
                        $stmt->execute([
                            ':name' => $name,
                            ':score' => $score,
                            ':level' => $level
                        ]);
                        debugLog("Oyuncu skoru güncellendi");
                    }
                } else {
                    // Yeni oyuncu ekle
                    $stmt = $db->prepare("INSERT INTO players (name, high_score, level) 
                                        VALUES (:name, :score, :level)");
                    $stmt->execute([
                        ':name' => $name,
                        ':score' => $score,
                        ':level' => $level
                    ]);
                    debugLog("Yeni oyuncu eklendi");
                }
                
                echo json_encode(['success' => true]);
            } catch(PDOException $e) {
                debugLog("Veritabanı hatası: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Veritabanı hatası']);
            }
            break;
        
        case 'get_leaderboard':
            try {
                $stmt = $db->prepare("SELECT name, high_score, level, last_played 
                                  FROM players 
                                  ORDER BY high_score DESC 
                                  LIMIT 10");
                $stmt->execute();
                $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $leaderboard]);
            } catch(PDOException $e) {
                error_log("Veritabanı hatası: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Veritabanı hatası']);
            }
            break;
        
        default:
            throw new Exception('Geçersiz işlem');
    }
    
} catch (Exception $e) {
    debugLog("Error: " . $e->getMessage());
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} catch (Error $e) {
    debugLog("Fatal Error: " . $e->getMessage());
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'error' => 'Sistemde bir hata oluştu'
    ]);
}

// Çıktı tamponlamasını temizle ve gönder
ob_end_flush();

// İstek token'ı doğrulama (CSRF koruması)
function verifyToken() {
    // Eğer token parametresi yoksa veya boşsa, işlemi reddet
    if(!isset($_POST['token']) || empty($_POST['token'])) {
        return false;
    }
    
    // İsteğin geldiği kaynağı kontrol et (Referer)
    if(!isset($_SERVER['HTTP_REFERER'])) {
        return false;
    }
    
    // Referer'ın doğru olup olmadığını kontrol et
    $referer = parse_url($_SERVER['HTTP_REFERER']);
    $expected_host = parse_url($_SERVER['HTTP_HOST']);
    
    if($referer['host'] !== $expected_host['host']) {
        return false;
    }
    
    // Gönderilen token ile session token'ı karşılaştır
    if($_POST['token'] !== $_SESSION['csrf_token']) {
        return false;
    }
    
    return true;
}

// Maksimum puan sınırı
$MAX_SCORE_LIMIT = 100000;

// Veritabanı tablo oluşturma
function createTables() {
    global $db;
    try {
        // players tablosu
        $db->exec("CREATE TABLE IF NOT EXISTS players (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            high_score INT DEFAULT 0,
            level INT DEFAULT 1,
            last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (name),
            INDEX (high_score)
        )");
        
        // Eski kayıtları temizle (1 ay)
        $db->exec("DELETE FROM players WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)");
        
        return true;
    } catch(PDOException $e) {
        error_log("Veritabanı hatası: " . $e->getMessage());
        return false;
    }
}

// Veri doğrulama fonksiyonunu güncelle
function validatePlayerData($name, $score, $level) {
    debugLog("Veri doğrulama - Name: $name, Score: $score, Level: $level");
    
    // Ad kontrolü
    if (empty($name)) {
        debugLog("Hata: İsim boş");
        return ['valid' => false, 'error' => 'İsim boş olamaz'];
    }
    
    if (strlen($name) > 50) {
        debugLog("Hata: İsim çok uzun");
        return ['valid' => false, 'error' => 'İsim 50 karakterden uzun olamaz'];
    }
    
    if (!preg_match('/^[a-zA-Z0-9üğışçöÜĞİŞÇÖ ]+$/', $name)) {
        debugLog("Hata: İsimde geçersiz karakterler var");
        return ['valid' => false, 'error' => 'İsimde sadece harf, rakam ve boşluk kullanılabilir'];
    }
    
    // Skor kontrolü
    if (!is_numeric($score)) {
        debugLog("Hata: Skor sayısal değil");
        return ['valid' => false, 'error' => 'Skor sayısal bir değer olmalı'];
    }
    
    $score = intval($score);
    if ($score < 0) {
        debugLog("Hata: Skor negatif");
        return ['valid' => false, 'error' => 'Skor negatif olamaz'];
    }
    
    if ($score > 1000000) { // Makul bir üst limit
        debugLog("Hata: Skor çok yüksek");
        return ['valid' => false, 'error' => 'Geçersiz skor değeri'];
    }
    
    // Seviye kontrolü
    if (!is_numeric($level)) {
        debugLog("Hata: Seviye sayısal değil");
        return ['valid' => false, 'error' => 'Seviye sayısal bir değer olmalı'];
    }
    
    $level = intval($level);
    if ($level < 1) {
        debugLog("Hata: Seviye 1'den küçük");
        return ['valid' => false, 'error' => 'Seviye 1\'den küçük olamaz'];
    }
    
    if ($level > 100) { // Makul bir üst limit
        debugLog("Hata: Seviye çok yüksek");
        return ['valid' => false, 'error' => 'Geçersiz seviye değeri'];
    }
    
    debugLog("Veri doğrulama başarılı");
    return ['valid' => true];
}

// Hata yakalama fonksiyonu
function handleError($message) {
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// Özel hata yakalayıcı
set_error_handler(function($errno, $errstr) {
    handleError($errstr);
});
?> 