// API endpoint'leri
const API_URL = 'db_operations.php';

// Anti-hile koruma sistemi
(function() {
    // F12 tuşunu devre dışı bırak
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            // CTRL+SHIFT+I veya CTRL+SHIFT+J veya CTRL+SHIFT+C
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            // CTRL+U (Kaynak kodu görüntüleme)
            (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            return false;
        }
    });

    // Sağ tık menüsünü devre dışı bırak
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Console.log ve diğer debug metodlarını yeniden tanımla
    const originalConsole = window.console;
    window.console = {
        log: function() {},
        warn: function() {},
        error: function() {},
        debug: function() {},
        info: function() {},
        clear: function() {},
        ...originalConsole
    };

    // Oyun nesnelerine müdahale etmeyi engelle
    setInterval(function() {
        // window.Game nesnesini koruma altına al
        if(window.Game && !Object.isFrozen(window.Game)) {
            Object.freeze(window.Game);
        }
    }, 1000);
})();

// AJAX istekleri için yardımcı fonksiyon
async function makeAPIRequest(action, data = {}) {
    try {
        console.log(`API isteği yapılıyor: ${action}`, data);
        
        const formData = new FormData();
        formData.append('action', action);
        
        // Diğer verileri ekle
        Object.keys(data).forEach(key => {
            formData.append(key, data[key]);
        });
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: formData,
            credentials: 'include',
            mode: 'cors'
        });
        
        console.log(`API yanıtı alındı: ${response.status}`);
        
        // Yanıt içeriğini text olarak al
        const responseText = await response.text();
        console.log('API yanıt içeriği:', responseText);
        
        // JSON parse işlemi
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('JSON parse hatası:', e);
            console.error('Yanıt içeriği:', responseText);
            throw new Error('Sunucudan geçersiz yanıt alındı');
        }
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('API isteği hatası:', error);
        alert(`Bir hata oluştu: ${error.message}`);
        throw error;
    }
}

// Oyun başlatma fonksiyonu (global)
async function startGame() {
    try {
        console.log('Oyun başlatılıyor...');
        
        const playerNameInput = document.getElementById('playerName');
        const playerName = playerNameInput.value.trim();
        
        if (playerName === '') {
            alert('Lütfen bir isim girin!');
            return;
        }
        
        console.log('Veritabanı tablosu oluşturuluyor...');
        await makeAPIRequest('init');
        
        console.log('Oyuncu kontrolü yapılıyor...');
        const result = await makeAPIRequest('get_player', { name: playerName });
        
        console.log('Oyuncu kontrolü tamamlandı:', result);
        
        // İsim modalını gizle
        document.getElementById('nameModal').style.display = 'none';
        
        // Oyunu başlat
        new Game(playerName);
    } catch (error) {
        console.error('Oyun başlatma hatası:', error);
        alert('Oyun başlatılırken bir hata oluştu: ' + error.message);
    }
}

class Game {
    constructor(playerName) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 5; // Başlangıç canı
        this.arrows = [];
        this.fruits = [];
        this.powerups = [];
        this.playerName = playerName;
        this.level = 1;
        this.fruitsHit = 0;
        this.fruitsNeededForNextLevel = 10; // Her seviye için gereken meyve sayısı
        this.fruitSpawnInterval = 800; // Başlangıç meyve oluşturma hızı (ms)
        
        // Canvas boyutlarını ayarla
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Oyun durumu
        this.gameState = 'playing';
        
        // Yay pozisyonu
        this.bowPosition = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50
        };
        
        // Yay açısı
        this.bowAngle = 0;
        
        // Yay gerilimi
        this.bowTension = 0;
        this.maxBowTension = 1;
        this.bowTensionSpeed = 0.05;
        
        // Yay çekme durumu
        this.isDrawingBow = false;
        
        // Maksimum ok sayısı
        this.maxArrows = 3;
        
        // Meyve tipleri ve puanları
        this.fruitTypes = [
            { type: '🍎', points: 10 },
            { type: '🍊', points: 15 },
            { type: '🍌', points: 20 },
            { type: '🍇', points: 25 },
            { type: '🍓', points: 30 },
            { type: '🍐', points: 35 }
        ];
        
        // Meyve düşme hızı
        this.fruitFallSpeed = 2;
        
        // Özel Fare İmleci Ayarla (SVG Data URL)
        this.setCustomCursor();

        // Event listener'ları ekle
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Mobil kontrol değişkenleri
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.lastTouchTime = 0;
        this.touchCooldown = 200; // 200ms atış bekleme süresi
        
        // Canvas boyutlarını ekrana göre ayarla
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Mobil kontrolleri ekle
        this.setupMobileControls();
        
        // Dokunmatik ekran olaylarını ekle
        if (this.isMobile) {
            this.setupTouchControls();
        }
        
        // Yeniden başlatma butonunu gizle
        document.getElementById('restartBtn').classList.add('hidden');
        
        // Skor tablosunu yükle
        this.loadLeaderboard();
        
        // Güvenlik sağlama
        this.securityCheck = Math.random().toString(36).substring(2, 15);
        this.lastValidatedTime = Date.now();
        this.validationInterval = 5000; // 5 saniye
        
        // Hileli hareket algılama
        this.lastPositions = [];
        this.lastScores = [];
        this.anomalyCount = 0;
        
        // Oyunu başlat
        this.init();
        this.gameLoop();
        
        // Güvenlik kontrollerini başlat
        this.startSecurityChecks();
    }
    
    setCustomCursor() {
        // Nişangah SVG Tanımı (16x16 piksel)
        const svgCursor = `
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="7" stroke="rgba(255,0,0,0.7)" stroke-width="1.5" fill="none" />
              <line x1="3" y1="8" x2="13" y2="8" stroke="rgba(255,255,255,0.8)" stroke-width="1" />
              <line x1="8" y1="3" x2="8" y2="13" stroke="rgba(255,255,255,0.8)" stroke-width="1" />
            </svg>
        `;
        // SVG'yi Data URL'ye çevir ve cursor stiline ata
        // Hotspot (8, 8) SVG'nin merkezini işaret eder
        this.canvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svgCursor)}") 8 8, auto`;
    }
    
    init() {
        // İlk meyveleri oluştur (Başlangıçta 2 tane olsun)
        for (let i = 0; i < 2; i++) { // 2 başlangıç meyvesi
             this.createFruits();
        }
    }
    
    createFruits() {
        // Sadece bir meyve oluştur
        const fruitType = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
        this.fruits.push({
            x: Math.random() * (this.canvas.width - 40) + 20,
            y: -40, // Ekranın üstünden başla
            width: 40,
            height: 40,
            type: fruitType.type,
            points: fruitType.points,
            isDestroyed: false,
            fallSpeed: this.fruitFallSpeed + (Math.random() * 1.5 - 0.75) // Rastgele hız
        });
    }
    
    handleKeyDown(event) {
        // Space tuşuna basıldığında ok at (sadece oynanıyorsa)
        if (event.code === 'Space' && this.gameState === 'playing') {
            this.shootArrow();
        }

        // Oyun bittiğinde R tuşu ile yeniden başlat
        if (event.code === 'KeyR' && this.gameState === 'gameOver') {
            this.resetGame();
        }
    }
    
    handleMouseDown(event) {
        this.isDrawingBow = true;
        this.bowTension = 0;
    }
    
    handleMouseUp(event) {
        if (this.isDrawingBow) {
            this.isDrawingBow = false;
            
            // Ok fırlat
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            this.shootArrow(x, y);
        }
    }
    
    shootArrow(targetX, targetY) {
        // Aktif ok sayısını kontrol et
        const activeArrows = this.arrows.filter(arrow => arrow.isActive).length;
        
        // Maksimum ok sayısına ulaşıldıysa, yeni ok atma
        if (activeArrows >= this.maxArrows) {
            return;
        }
        
        // Hedef koordinatları belirtilmemişse, yay açısına göre hesapla
        if (targetX === undefined || targetY === undefined) {
            targetX = this.bowPosition.x + Math.cos(this.bowAngle) * 100;
            targetY = this.bowPosition.y + Math.sin(this.bowAngle) * 100;
        }
        
        // Mobil için sabit ok hızı
        const arrowSpeed = this.isMobile ? 15 : (10 + (this.bowTension * 10));
        
        // Ok oluştur
        this.arrows.push({
            x: this.bowPosition.x,
            y: this.bowPosition.y,
            targetX: targetX,
            targetY: targetY,
            speed: arrowSpeed,
            angle: Math.atan2(targetY - this.bowPosition.y, targetX - this.bowPosition.x),
            isActive: true
        });
        
        // Yay gerilimini sıfırla
        this.bowTension = 0;
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Yay açısını hesapla
        this.bowAngle = Math.atan2(y - this.bowPosition.y, x - this.bowPosition.x);
        
        // Yay gerilimini güncelle
        if (this.isDrawingBow) {
            this.bowTension = Math.min(this.bowTension + this.bowTensionSpeed, this.maxBowTension);
        }
    }
    
    resizeCanvas() {
        const gameArea = document.querySelector('.game-area');
        const maxWidth = gameArea.clientWidth;
        const maxHeight = gameArea.clientHeight;
        
        // 4:3 oranını koru
        const aspectRatio = 4/3;
        let newWidth = maxWidth;
        let newHeight = maxWidth / aspectRatio;
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = maxHeight * aspectRatio;
        }
        
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // Yay pozisyonunu güncelle
        this.bowPosition = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50
        };
    }
    
    setupMobileControls() {
        const restartBtn = document.getElementById('restartBtn');
        
        restartBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'gameOver') {
                this.resetGame();
            }
        });
    }
    
    setupTouchControls() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState !== 'playing') return;
            
            // Hızlı atış için cooldown kontrolü
            const now = Date.now();
            if (now - this.lastTouchTime < this.touchCooldown) return;
            this.lastTouchTime = now;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            
            // Yay açısını hesapla
            this.bowAngle = Math.atan2(y - this.bowPosition.y, x - this.bowPosition.x);
            
            // Hemen ok at
            this.shootArrow(
                this.bowPosition.x + Math.cos(this.bowAngle) * 100,
                this.bowPosition.y + Math.sin(this.bowAngle) * 100
            );
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.gameState !== 'playing') return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            
            // Sadece yay açısını güncelle
            this.bowAngle = Math.atan2(y - this.bowPosition.y, x - this.bowPosition.x);
        });
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') {
            // Oyun bittiğinde yeniden başlatma butonunu göster
            if (this.gameState === 'gameOver' && this.isMobile) {
                document.getElementById('restartBtn').classList.remove('hidden');
            }
            return;
        }
        
        // Yeniden başlatma butonunu gizle
        document.getElementById('restartBtn').classList.add('hidden');
        
        // Mobil hareket kontrolü
        if (this.isMobile) {
            // Mobil hareket kontrolü
            if (this.isAiming) {
                // Yay açısını güncelle
                this.bowAngle = Math.atan2(this.bowPosition.y - this.bowPosition.y, this.bowPosition.x - this.bowPosition.x);
            }
        }
        
        // Aktif olmayan meyveleri temizle
        this.fruits = this.fruits.filter(fruit => !fruit.isDestroyed);
        
        // Meyveleri güncelle
        this.fruits.forEach((fruit, index) => {
            if (!fruit.isDestroyed) {
                // Meyveyi aşağı doğru hareket ettir
                fruit.y += fruit.fallSpeed;
                
                // Ekranın altına ulaşan meyveleri sil, can azalt ve YENİ MEYVE OLUŞTUR
                if (fruit.y > this.canvas.height + fruit.height) {
                    fruit.isDestroyed = true;
                    this.loseLife();
                    // Oyun bittiğinde yeni meyve oluşturma
                    if (this.gameState === 'playing') {
                        this.createFruits(); 
                    }
                }
            }
        });
        
        // Okları güncelle
        this.arrows.forEach(arrow => {
            if (!arrow.isActive) return;
            
            // Okun pozisyonunu güncelle
            arrow.x += Math.cos(arrow.angle) * arrow.speed;
            arrow.y += Math.sin(arrow.angle) * arrow.speed;
            
            // Duvarlardan sekme
            if (arrow.x <= 0 || arrow.x >= this.canvas.width) {
                arrow.angle = Math.PI - arrow.angle;
            }
            if (arrow.y <= 0) {
                arrow.angle = -arrow.angle;
            }
            
            // Ok aşağı değdiğinde kaybol
            if (arrow.y >= this.canvas.height) {
                arrow.isActive = false;
            }
            
            // Meyvelerle çarpışma kontrolünde fruitsHit'i güncelle ve seviye kontrolü yap
            this.fruits.forEach(fruit => {
                if (fruit.isDestroyed) return;
                
                if (this.checkCollision(arrow, fruit)) {
                    fruit.isDestroyed = true;
                    this.score += fruit.points;
                    this.fruitsHit++;
                    this.checkLevelUp();
                    document.getElementById('score').textContent = this.score;
                    arrow.isActive = false;
                    if (this.gameState === 'playing') {
                        this.createFruits();
                    }
                }
            });
        });
        
        // Aktif olmayan okları temizle
        this.arrows = this.arrows.filter(arrow => arrow.isActive);
    }
    
    loseLife() {
        if (this.gameState !== 'playing') return; // Oyun bittiyse can azaltma

        this.lives--;
        this.updateLivesDisplay();
        
        // Can bittiğinde oyun durumunu değiştir
        if (this.lives <= 0) {
            this.gameState = 'gameOver';
            this.checkAndUpdateLeaderboard();
        }
    }
    
    updateLivesDisplay() {
        const livesElement = document.getElementById('lives');
        if (livesElement) {
            livesElement.textContent = '❤️'.repeat(this.lives > 0 ? this.lives : 0); // Can 0'dan küçükse kalp gösterme
        }
    }
    
    resetGame() {
        this.score = 0;
        this.lives = 5;
        this.arrows = [];
        this.fruits = [];
        this.gameState = 'playing'; // Oyun durumunu sıfırla
        
        document.getElementById('score').textContent = this.score;
        this.updateLivesDisplay();
        
        // Canvas'ı temizle ve ilk meyveleri oluştur
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.init();
        
        // Yeniden başlatma butonunu gizle
        document.getElementById('restartBtn').classList.add('hidden');
    }
    
    checkCollision(arrow, fruit) {
        const dx = arrow.x - (fruit.x + fruit.width/2);
        const dy = arrow.y - (fruit.y + fruit.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Ok ucunu daha hassas kontrol etmek için arrow.x yerine okun ucunu kullanabiliriz
        // Şimdilik basit mesafe kontrolü yeterli
        return distance < fruit.width/2 + 5; // Biraz tolerans payı
    }
    
    draw() {
        // Canvas'ı temizle
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Yayı çiz
        this.drawBow();
        
        // Meyveleri çiz
        this.fruits.forEach(fruit => {
            if (!fruit.isDestroyed) {
                this.ctx.font = `${fruit.width}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(fruit.type, fruit.x + fruit.width/2, fruit.y + fruit.height/2);
            }
        });
        
        // Okları çiz
        this.arrows.forEach(arrow => {
            if (arrow.isActive) {
                this.ctx.save();
                this.ctx.translate(arrow.x, arrow.y);
                this.ctx.rotate(arrow.angle);
                
                // Ok Rengi
                const shaftColor = '#8B4513'; // Kahverengi tonu
                const fletchingColor = '#D2B48C'; // Açık kahve / Bej
                const tipColor = '#A9A9A9'; // Koyu Gri / Gümüşümsü
                
                // Ok Gövdesi (Daha ince)
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(-35, 0); // Biraz daha uzun
                this.ctx.strokeStyle = shaftColor;
                this.ctx.lineWidth = 2.5; // Biraz daha ince
                this.ctx.stroke();
                
                // Ok Tüyleri (Daha stilize)
                this.ctx.fillStyle = fletchingColor;
                // Tüy 1
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(-10, -4);
                this.ctx.lineTo(-12, -4);
                this.ctx.lineTo(-2, 0);
                this.ctx.closePath();
                this.ctx.fill();
                // Tüy 2
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(-10, 4);
                this.ctx.lineTo(-12, 4);
                this.ctx.lineTo(-2, 0);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Ok Ucu (Daha keskin)
                this.ctx.beginPath();
                this.ctx.moveTo(-35, 0); // Gövdenin ucundan başla
                this.ctx.lineTo(-45, -4); // Daha sivri
                this.ctx.lineTo(-45, 4); // Daha sivri
                this.ctx.closePath();
                this.ctx.fillStyle = tipColor;
                this.ctx.fill();
                
                this.ctx.restore();
            }
        });
        
        // Aktif ok sayısını göster
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Oklar: ${this.arrows.filter(arrow => arrow.isActive).length}/${this.maxArrows}`, 20, this.canvas.height - 20);

        // Oyun bittiyse Game Over ekranını çiz
        if (this.gameState === 'gameOver') {
            this.drawGameOverScreen();
        }
    }
    
    drawBow() {
        this.ctx.save();
        this.ctx.translate(this.bowPosition.x, this.bowPosition.y);
        this.ctx.rotate(this.bowAngle);

        const bowLimbLength = 45; // Yay kolu uzunluğu
        const bowGripHeight = 15; // Tutma yeri yüksekliği
        const bowWidth = 8;       // Yay kolu kalınlığı
        const bowCurveAmount = 20; // Yay kolu kavisi
        const bowColor = '#8B4513'; // Koyu Kahve
        const gripColor = '#654321'; // Daha Koyu Tutma Yeri
        const stringColor = '#D2B48C'; // Açık Kahve İp

        // --- Yay Kolları --- 
        this.ctx.strokeStyle = bowColor;
        this.ctx.lineWidth = bowWidth;
        this.ctx.lineCap = 'round'; // Uçları yuvarlak yap

        // Üst Kol
        this.ctx.beginPath();
        this.ctx.moveTo(0, -bowGripHeight / 2); // Tutma yerinin üstünden başla
        this.ctx.quadraticCurveTo(bowCurveAmount, -bowLimbLength / 2, 0, -bowLimbLength); 
        this.ctx.stroke();

        // Alt Kol
        this.ctx.beginPath();
        this.ctx.moveTo(0, bowGripHeight / 2); // Tutma yerinin altından başla
        this.ctx.quadraticCurveTo(bowCurveAmount, bowLimbLength / 2, 0, bowLimbLength); 
        this.ctx.stroke();

        // --- Tutma Yeri (Grip) --- 
        this.ctx.fillStyle = gripColor;
        this.ctx.strokeStyle = '#4d3319'; // Daha da koyu çerçeve
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.rect(-bowWidth / 2, -bowGripHeight / 2, bowWidth, bowGripHeight);
        this.ctx.fill();
        this.ctx.stroke();

        // --- Yay İpi --- 
        const stringStartX = 0;
        const stringStartY = -bowLimbLength;
        const stringEndX = 0;
        const stringEndY = bowLimbLength;

        // Gerilimde ipin ne kadar geri çekileceği (Kontrol noktasının pozitif olması pullback yönünü etkilemez)
        const maxTensionPullback = bowCurveAmount * 1.8; 
        const tensionPullback = this.isDrawingBow ? -this.bowTension * maxTensionPullback : 0;
        const stringMidX = tensionPullback; 
        const stringMidY = 0;

        this.ctx.beginPath();
        this.ctx.moveTo(stringStartX, stringStartY); // Üst kol ucu
        this.ctx.lineTo(stringMidX, stringMidY);     // Gerilmiş orta nokta
        this.ctx.lineTo(stringEndX, stringEndY);     // Alt kol ucu
        this.ctx.strokeStyle = stringColor;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        // --- Gerilim Sırasında Ok --- 
        if (this.isDrawingBow && this.bowTension > 0) {
            this.ctx.save();
            // Oku, gerilen ipin orta noktasına yerleştir
            this.ctx.translate(stringMidX, stringMidY);
            // Ok açısını sıfırla (yay zaten dönmüş)
            this.ctx.rotate(-this.bowAngle); 
             // Okun gezini ipin üzerine getirmek için hafifçe geri çek
            this.ctx.translate(5, 0); 

            // Fırlatılan okla aynı çizim kodunu kullanabiliriz
            const shaftColor = '#8B4513';
            const fletchingColor = '#D2B48C';
            const tipColor = '#A9A9A9';

            // Ok Gövdesi
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-35, 0); this.ctx.strokeStyle = shaftColor; this.ctx.lineWidth = 2.5; this.ctx.stroke();
            // Ok Tüyleri
            this.ctx.fillStyle = fletchingColor;
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-10, -4); this.ctx.lineTo(-12, -4); this.ctx.lineTo(-2, 0); this.ctx.closePath(); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-10, 4); this.ctx.lineTo(-12, 4); this.ctx.lineTo(-2, 0); this.ctx.closePath(); this.ctx.fill();
            // Ok Ucu
            this.ctx.beginPath(); this.ctx.moveTo(-35, 0); this.ctx.lineTo(-45, -4); this.ctx.lineTo(-45, 4); this.ctx.closePath(); this.ctx.fillStyle = tipColor; this.ctx.fill();

            this.ctx.restore();
        }

        this.ctx.restore();
    }
    
    drawGameOverScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = 'bold 72px Arial';
        this.ctx.fillStyle = 'red';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 80);

        this.ctx.font = '36px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`${this.playerName}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.fillText(`Skor: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText(`Seviye: ${this.level}`, this.canvas.width / 2, this.canvas.height / 2 + 60);

        // Masaüstü için R tuşu talimatı
        if (!this.isMobile) {
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = 'lightgray';
            this.ctx.fillText("Yeniden Başlamak İçin 'R' Tuşuna Basın", this.canvas.width / 2, this.canvas.height / 2 + 120);
        }
    }
    
    gameLoop(timestamp) {
        // ESKİ KONTROL KALDIRILDI
        // if (!this.isGameRunning) return;
        
        // Delta time hesapla
        const deltaTime = timestamp - (this.lastTimestamp || timestamp);
        this.lastTimestamp = timestamp;
        
        // Sadece oyun durumuna göre güncelleme ve çizim yap
        this.update(deltaTime);
        this.draw();
        
        // Sürekli döngü isteği (Oyun durumu ne olursa olsun, game over ekranı için de gerekli)
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    // Skor tablosu işlemleri
    async loadLeaderboard() {
        try {
            const result = await makeAPIRequest('get_leaderboard');
            
            if (result.success) {
                this.updateLeaderboardDisplay(result.data);
            }
        } catch (error) {
            console.error('Skor tablosu yüklenemedi:', error);
        }
    }

    updateLeaderboardDisplay(leaderboardData) {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';
        
        leaderboardData.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'leaderboard-item';
            
            const lastPlayed = new Date(entry.last_played);
            const formattedDate = lastPlayed.toLocaleDateString('tr-TR');
            
            li.innerHTML = `
                ${index + 1}. ${entry.name}<br>
                Skor: ${entry.high_score}<br>
                Seviye: ${entry.level}<br>
                <small>Son Oyun: ${formattedDate}</small>
            `;
            leaderboardList.appendChild(li);
        });
    }

    async savePlayerStats() {
        if (this._savingStats) return; // Zaten kayıt yapılıyorsa çık
        
        try {
            this._savingStats = true;
            console.log('Oyuncu istatistikleri kaydediliyor:', {
                name: this.playerName,
                score: this.score,
                level: this.level
            });
            
            const result = await makeAPIRequest('save_player', {
                name: this.playerName,
                score: Math.max(0, Math.floor(this.score)), // Skoru pozitif tam sayı yap
                level: Math.max(1, Math.floor(this.level))  // Seviyeyi pozitif tam sayı yap
            });
            
            if (result.success) {
                console.log('İstatistikler başarıyla kaydedildi');
                // Skor tablosunu güncelle
                this.loadLeaderboard();
            } else {
                console.error('İstatistik kaydetme hatası:', result.error);
                alert('Skor kaydedilirken bir hata oluştu: ' + result.error);
            }
        } catch (error) {
            console.error('API hatası:', error);
            alert('Skor kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            this._savingStats = false;
        }
    }
    
    checkAndUpdateLeaderboard() {
        this.savePlayerStats();
    }

    checkLevelUp() {
        if (this.fruitsHit >= this.fruitsNeededForNextLevel) {
            this.level++;
            this.fruitsHit = 0;
            this.fruitsNeededForNextLevel += 5; // Her seviyede 5 meyve daha fazla gereksin
            this.fruitSpawnInterval = Math.max(300, 800 - (this.level * 50)); // Minimum 300ms
            
            // Seviye atlama efekti
            this.showLevelUpMessage();
        }
    }

    showLevelUpMessage() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Seviye ${this.level}!`, this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillText(`Sonraki seviye için: ${this.fruitsNeededForNextLevel} meyve`, 
            this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.restore();
    }

    startSecurityChecks() {
        // Düzenli güvenlik kontrolleri
        setInterval(() => {
            // Oyun hızı kontrolü
            const now = Date.now();
            const elapsed = now - this.lastValidatedTime;
            
            if (elapsed < this.validationInterval * 0.5) {
                // Oyun hızı anormal derecede artırılmış
                this.handleSecurityViolation("Oyun hızı manipülasyonu tespit edildi.");
            }
            
            this.lastValidatedTime = now;
            
            // Ok/Meyve anomali kontrolü
            if (this.arrows.length > this.maxArrows * 2) {
                this.handleSecurityViolation("Ok sayısı manipülasyonu tespit edildi.");
            }
            
            if (this.fruits.length > 30) {
                this.handleSecurityViolation("Meyve sayısı manipülasyonu tespit edildi.");
            }
            
            // Skor anomali kontrolü
            this.lastScores.push(this.score);
            if (this.lastScores.length > 10) {
                this.lastScores.shift();
                
                // Son 10 skor içinde büyük artışlar var mı?
                for (let i = 1; i < this.lastScores.length; i++) {
                    if (this.lastScores[i] - this.lastScores[i-1] > 1000) {
                        this.anomalyCount++;
                        if (this.anomalyCount > 2) {
                            this.handleSecurityViolation("Skor manipülasyonu tespit edildi.");
                        }
                    }
                }
            }
        }, this.validationInterval);
    }
    
    handleSecurityViolation(reason) {
        console.warn("Güvenlik ihlali tespit edildi: " + reason);
        // Oyunu sıfırla
        this.score = 0;
        this.level = 1;
        this.lives = 1; // Tek can bırak
        this.updateLivesDisplay();
        document.getElementById('score').textContent = this.score;
        
        // Uyarı
        alert("Güvenlik ihlali tespit edildi. Oyun sıfırlanıyor.");
    }
} 