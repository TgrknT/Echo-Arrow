# Echo Arrow 🎯

Echo Arrow, HTML5 Canvas kullanılarak geliştirilmiş eğlenceli bir ok atma oyunudur. Oyuncular, düşen meyveleri vurmaya çalışarak puan toplar ve seviye atlarlar.

## 🎮 Oyun Özellikleri

- Yay ve ok sistemi
- Düşen meyveler
- Seviye sistemi
- Puan sistemi
- Can sistemi
- Yüksek skor tablosu
- Mobil uyumluluk

## 🎯 Nasıl Oynanır?

1. Oyuna başlamak için adınızı girin
2. Masaüstünde:
   - Mouse ile yayı hedefleyin
   - Mouse tuşunu basılı tutarak yayı gerin
   - Bırakarak ok atın
   - Space tuşu ile hızlı atış yapın
3. Mobilde:
   - Ekrana dokunarak hedef alın ve ok atın
   - Yüksek skor tablosunu görmek için 🏆 butonuna tıklayın

## 🏆 Puan Sistemi

Her meyvenin farklı puan değeri vardır:
- 🍎 = 10 puan
- 🍊 = 15 puan
- 🍌 = 20 puan
- 🍇 = 25 puan
- 🍓 = 30 puan
- 🍐 = 35 puan

## 📈 Seviye Sistemi

- Her seviyede 10 meyve vurmanız gerekir
- Seviye atladıkça meyveler daha hızlı düşer
- Her seviyede gereken meyve sayısı 5 artar

## ❤️ Can Sistemi

- Oyuna 5 can ile başlarsınız
- Düşen her meyve 1 can kaybettirir
- Canlarınız bittiğinde oyun biter

## 🔄 Yeniden Başlatma

- Masaüstünde: 'R' tuşuna basın
- Mobilde: 🔄 butonuna tıklayın

## 🛠️ Teknik Gereksinimler

- PHP 7.4 veya üzeri
- MySQL 5.7 veya üzeri
- Modern bir web tarayıcısı (Chrome, Firefox, Safari, Edge)

## 📝 Veritabanı Kurulumu

1. MySQL veritabanı oluşturun
2. `config.php` dosyasındaki veritabanı bilgilerini güncelleyin:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'veritabani_adi');
define('DB_USER', 'kullanici_adi');
define('DB_PASS', 'sifre');
```

## 🔒 Güvenlik Özellikleri

- SQL Injection koruması
- XSS koruması
- CSRF koruması
- Hile önleme sistemi
- Rate limiting
- Input validasyonu

## 📱 Mobil Uyumluluk

- Responsive tasarım
- Dokunmatik kontroller
- Mobil optimizasyonu
- Otomatik ekran boyutlandırma

## 🌟 Kredi

Geliştirici: Gürkan
Versiyon: 1.0.0
Lisans: MIT 