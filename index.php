    <?php
    // Çıktı tamponlamasını başlat
    ob_start();

    // Hata raporlamayı aç
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    // Config dosyasını yükle
    require_once 'config.php';

    // Çıktı tamponlamasını bitir
    ob_end_flush();
    ?>
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Echo Arrow</title>
        <link rel="stylesheet" href="style.css">
        <style>
            body {
                margin: 0;
                padding: 0;
                min-height: 100vh;
                background-color: #2c3e50;
                font-family: Arial, sans-serif;
                color: white;
                overflow: hidden;
            }

            .game-container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                width: 100vw;
            }

            @media (min-width: 768px) {
                .game-container {
                    flex-direction: row;
                    padding: 20px;
                }
            }

            .leaderboard {
                background-color: rgba(0, 0, 0, 0.7);
                padding: 15px;
                border-radius: 10px;
                margin: 10px;
                flex-shrink: 0;
                max-height: 30vh;
                overflow-y: auto;
            }

            @media (max-width: 767px) {
                .leaderboard {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    max-height: none;
                    margin: 0;
                    padding: 20px;
                    z-index: 500;
                    transform: translateY(-100%);
                    transition: transform 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    background-color: rgba(0, 0, 0, 0.95);
                }
                
                .leaderboard.active {
                    transform: translateY(0);
                }
                
                .leaderboard .close-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    font-size: 28px;
                    font-weight: bold;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.3);
                    z-index: 501;
                }
                
                .leaderboard-content {
                    width: 100%;
                    max-width: 400px;
                }
            }

            @media (min-width: 768px) {
                .leaderboard {
                    width: 250px;
                    max-height: none;
                    margin: 0 20px 0 0;
                }
                
                .leaderboard .close-btn {
                    display: none;
                }
            }

            .leaderboard h2 {
                margin-top: 0;
                color: #e74c3c;
                text-align: center;
                font-size: 1.2em;
            }

            .leaderboard-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .leaderboard-item {
                padding: 8px;
                margin: 5px 0;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 5px;
                font-size: 0.9em;
            }

            .game-area {
                position: relative;
                flex-grow: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 10px;
            }

            #gameCanvas {
                background-color: #333;
                border-radius: 10px;
                max-width: 100%;
                max-height: 100%;
                touch-action: none;
            }

            .game-info {
                position: absolute;
                top: 20px;
                left: 20px;
                font-size: 24px;
                z-index: 10;
            }

            #lives {
                margin-top: 10px;
                font-size: 28px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
            }

            @media (max-width: 767px) {
                .game-info {
                    top: 15px;
                    left: 15px;
                }
                
                #score {
                    font-size: 28px;
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                }
                
                #lives {
                    margin-top: 8px;
                    font-size: 30px;
                    letter-spacing: 2px;
                }
            }

            .mobile-controls {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: none;
                justify-content: center;
                align-items: center;
                gap: 20px;
                z-index: 100;
            }

            @media (max-width: 767px) {
                .mobile-controls {
                    display: flex;
                }
            }

            .control-btn {
                width: 60px;
                height: 60px;
                background-color: rgba(46, 204, 113, 0.4);
                border: 2px solid rgba(46, 204, 113, 0.6);
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-size: 24px;
                touch-action: none;
                user-select: none;
            }
            
            .leaderboard-btn {
                background-color: rgba(52, 152, 219, 0.4);
                border-color: rgba(52, 152, 219, 0.6);
            }

            .restart-btn.hidden {
                display: none;
            }

            @media (max-width: 767px) {
                .game-over-text {
                    font-size: 48px !important;
                }
                .game-over-info {
                    font-size: 24px !important;
                }
                .restart-instruction {
                    display: none;
                }
            }

            .back-button {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background-color: #e74c3c;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                z-index: 1000;
                text-decoration: none;
            }

            .back-button:hover {
                background-color: #c0392b;
            }

            /* İsim Girme Modal Stili */
            #nameModal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .modal-content {
                background-color: #34495e;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                width: 90%;
                max-width: 400px;
            }

            .modal-content h2 {
                margin-top: 0;
                color: #e74c3c;
                font-size: 1.5em;
            }

            .modal-content input {
                padding: 10px;
                font-size: 16px;
                width: 80%;
                margin: 15px 0;
                border: none;
                border-radius: 5px;
                text-align: center;
            }

            .modal-content button {
                padding: 12px 24px;
                font-size: 16px;
                background-color: #e74c3c;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background-color 0.3s;
                width: 80%;
                margin-top: 10px;
            }

            .modal-content button:hover {
                background-color: #c0392b;
            }
        </style>
    </head>
    <body>
        <a href="../index.php" class="back-button">Ana Sayfaya Dön</a>
        
        <div class="game-container">
            <div class="leaderboard">
                <button class="close-btn">&times;</button>
                <div class="leaderboard-content">
                    <h2>En Yüksek Skorlar</h2>
                    <ul class="leaderboard-list" id="leaderboardList">
                        <!-- Skor listesi JavaScript ile doldurulacak -->
                    </ul>
                </div>
            </div>
            <div class="game-area">
                <canvas id="gameCanvas"></canvas>
                <div class="game-info">
                    <div id="score">0</div>
                    <div id="lives"></div>
                </div>
            </div>
        </div>

        <div class="mobile-controls">
            <div class="control-btn leaderboard-btn" id="leaderboardBtn">🏆</div>
            <div class="control-btn restart-btn hidden" id="restartBtn">🔄</div>
        </div>

        <!-- İsim Girme Modalı -->
        <div id="nameModal">
            <div class="modal-content">
                <h2>Echo Arrow</h2>
                <p>Oyuna başlamak için adınızı girin:</p>
                <input type="text" id="playerName" placeholder="Adınız" maxlength="15">
                <button onclick="startGame()">Başla</button>
            </div>
        </div>

        <script>
            // Oyun başlatma fonksiyonu
            function startGame() {
                const playerNameInput = document.getElementById('playerName');
                const playerName = playerNameInput.value.trim();
                
                if (playerName === '') {
                    alert('Lütfen bir isim girin!');
                    return;
                }
                
                // İsim modalını gizle
                document.getElementById('nameModal').style.display = 'none';
                
                // Oyunu başlat
                new Game(playerName);
            }
            
            // Liderlik tablosu kontrolleri
            document.addEventListener('DOMContentLoaded', function() {
                const leaderboardBtn = document.getElementById('leaderboardBtn');
                const leaderboard = document.querySelector('.leaderboard');
                const closeBtn = document.querySelector('.leaderboard .close-btn');
                
                leaderboardBtn.addEventListener('click', function() {
                    leaderboard.classList.add('active');
                });
                
                closeBtn.addEventListener('click', function() {
                    leaderboard.classList.remove('active');
                });
            });
        </script>
        <script src="script.js"></script>
    </body>
    </html> 