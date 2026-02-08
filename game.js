class Game {
    constructor() {
        console.log("Инициализация игры...");
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Состояния игры
        this.STATE = {
            MENU: 'MENU',
            PLAYING: 'PLAYING',
            PAUSED: 'PAUSED',
            GAME_OVER: 'GAME_OVER'
        };
        this.state = this.STATE.MENU;
        
        // Игровые переменные
        this.grid = [];
        this.selectedGem = null;
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.comboCounter = 1;
        this.isAnimating = false;
        
        // Цвета фигур
        this.COLORS = [
            {r: 255, g: 89, b: 94},    // Красный
            {r: 255, g: 202, b: 58},   // Желтый
            {r: 138, g: 201, b: 38},   // Зеленый
            {r: 25, g: 130, b: 196},   // Синий
            {r: 106, g: 76, b: 147},   // Фиолетовый
            {r: 255, g: 157, b: 129},  // Оранжевый
        ];
        
        // Параметры поля
        this.GRID_SIZE = 8;
        this.cellSize = 0;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        
        // Инициализация
        this.calculateSizes();
        this.initGrid();
        this.setupEventListeners();
        this.startGameLoop();
        
        console.log("Игра инициализирована, состояние:", this.state);
    }
    
    calculateSizes() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Оставляем место для HUD (80px сверху) и отступы
        const availableHeight = screenHeight - 80 - 40;
        const availableWidth = screenWidth - 40;
        
        // Вычисляем размер клетки
        const maxCellSizeByHeight = Math.floor(availableHeight / this.GRID_SIZE);
        const maxCellSizeByWidth = Math.floor(availableWidth / this.GRID_SIZE);
        
        // Берем меньший размер для адаптивности
        this.cellSize = Math.min(maxCellSizeByHeight, maxCellSizeByWidth, 60);
        
        // Центрируем сетку
        this.gridOffsetX = (screenWidth - this.GRID_SIZE * this.cellSize) / 2;
        this.gridOffsetY = 80; // Отступ для HUD
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.calculateSizes();
        
        // Обновляем позиции фигур
        if (this.grid.length > 0) {
            this.updateGemPositions();
        }
    }
    
    updateGemPositions() {
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const gem = this.grid[row][col];
                if (gem) {
                    gem.x = this.gridOffsetX + col * this.cellSize;
                    gem.y = this.gridOffsetY + row * this.cellSize;
                    gem.targetY = gem.y;
                    gem.size = this.cellSize - 10;
                }
            }
        }
    }
    
    initGrid() {
        console.log("Инициализация сетки...");
        this.grid = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                // Выбираем случайный цвет
                let availableColors = [...Array(this.COLORS.length).keys()];
                
                // Проверяем слева
                if (col >= 2 && this.grid[row][col - 1] && this.grid[row][col - 2]) {
                    if (this.grid[row][col - 1].colorIdx === this.grid[row][col - 2].colorIdx) {
                        const index = availableColors.indexOf(this.grid[row][col - 1].colorIdx);
                        if (index > -1) availableColors.splice(index, 1);
                    }
                }
                
                // Проверяем сверху
                if (row >= 2 && this.grid[row - 1][col] && this.grid[row - 2][col]) {
                    if (this.grid[row - 1][col].colorIdx === this.grid[row - 2][col].colorIdx) {
                        const index = availableColors.indexOf(this.grid[row - 1][col].colorIdx);
                        if (index > -1) availableColors.splice(index, 1);
                    }
                }
                
                const colorIdx = availableColors[Math.floor(Math.random() * availableColors.length)];
                this.grid[row][col] = {
                    row, col,
                    colorIdx,
                    x: this.gridOffsetX + col * this.cellSize,
                    y: this.gridOffsetY + row * this.cellSize,
                    targetY: this.gridOffsetY + row * this.cellSize,
                    selected: false,
                    size: this.cellSize - 10
                };
            }
        }
        console.log("Сетка создана:", this.GRID_SIZE + "x" + this.GRID_SIZE);
    }
    
    setupEventListeners() {
        console.log("Настройка обработчиков событий...");
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Клики по canvas - ТОЛЬКО когда игра активна
        this.canvas.addEventListener('click', (e) => {
            if (this.state !== this.STATE.PLAYING || this.isAnimating) return;
            this.handleCanvasClick(e);
        });
        
        // Touch события
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state !== this.STATE.PLAYING || this.isAnimating) return;
            this.handleCanvasClick(e.touches[0]);
        }, { passive: false });
        
        // Кнопки меню
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log("Нажата кнопка 'Начать игру'");
                this.startGame();
            });
        }
        
        // Пауза
        document.getElementById('pauseBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Пауза'");
            this.pauseGame();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Продолжить'");
            this.resumeGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Начать заново'");
            this.startGame();
        });
        
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'В меню' из паузы");
            this.showMenu();
        });
        
        // Таблица рекордов
        document.getElementById('scoresBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Таблица рекордов'");
            this.showScores();
        });
        
        document.getElementById('backFromScoresBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Назад' из таблицы рекордов");
            this.showMenu();
        });
        
        // Инструкция
        document.getElementById('instructionsBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Инструкция'");
            this.showInstructions();
        });
        
        document.getElementById('backFromInstructionsBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Назад' из инструкции");
            this.showMenu();
        });
        
        // Конец игры
        document.getElementById('saveScoreBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Сохранить результат'");
            this.saveScore();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'Играть снова'");
            this.startGame();
        });
        
        document.getElementById('menuFromGameOverBtn').addEventListener('click', () => {
            console.log("Нажата кнопка 'В меню' из конца игры");
            this.showMenu();
        });
        
        // Ввод имени
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveScore();
            }
        });
        
        console.log("Все обработчики событий настроены");
    }
    
    showScreen(screenId) {
        console.log("Показ экрана:", screenId);
        
        // Скрыть все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Показать нужный экран
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        }
        
        // Управление HUD
        const hud = document.getElementById('gameHUD');
        if (screenId === 'menuScreen' || screenId === 'pauseScreen' || 
            screenId === 'scoresScreen' || screenId === 'gameOverScreen' || 
            screenId === 'instructionsScreen') {
            hud.classList.add('hidden');
        } else {
            hud.classList.remove('hidden');
        }
    }
    
    showMenu() {
        this.state = this.STATE.MENU;
        this.showScreen('menuScreen');
        this.canvas.style.pointerEvents = 'none'; // Отключаем клики по canvas
    }
    
    showScores() {
        this.updateScoresDisplay();
        this.showScreen('scoresScreen');
    }
    
    showInstructions() {
        this.showScreen('instructionsScreen');
    }
    
    startGame() {
        console.log("Запуск новой игры...");
        
        // Сброс состояния
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.comboCounter = 1;
        this.selectedGem = null;
        this.state = this.STATE.PLAYING;
        this.isAnimating = false;
        
        // Инициализация сетки
        this.calculateSizes();
        this.initGrid();
        
        // Обновить отображение
        this.updateDisplay();
        
        // Показать игровой экран
        this.showScreen('menuScreen'); // Скрываем меню
        document.getElementById('gameHUD').classList.remove('hidden');
        this.canvas.style.pointerEvents = 'auto'; // Включаем клики по canvas
        
        console.log("Игра начата, состояние:", this.state);
    }
    
    pauseGame() {
        this.state = this.STATE.PAUSED;
        this.showScreen('pauseScreen');
        this.canvas.style.pointerEvents = 'none'; // Отключаем клики по canvas
    }
    
    resumeGame() {
        this.state = this.STATE.PLAYING;
        this.showScreen('menuScreen'); // Скрываем экран паузы
        document.getElementById('gameHUD').classList.remove('hidden');
        this.canvas.style.pointerEvents = 'auto'; // Включаем клики по canvas
    }
    
    handleCanvasClick(event) {
        if (this.state !== this.STATE.PLAYING || this.isAnimating) {
            console.log("Клик игнорирован, состояние:", this.state, "анимация:", this.isAnimating);
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Проверяем, кликнули ли внутри сетки
        if (x < this.gridOffsetX || y < this.gridOffsetY || 
            x > this.gridOffsetX + this.GRID_SIZE * this.cellSize || 
            y > this.gridOffsetY + this.GRID_SIZE * this.cellSize) {
            return;
        }
        
        // Определяем столбец и строку
        const col = Math.floor((x - this.gridOffsetX) / this.cellSize);
        const row = Math.floor((y - this.gridOffsetY) / this.cellSize);
        
        console.log("Клик по фигуре:", row, col);
        
        const gem = this.grid[row][col];
        if (!gem) return;
        
        if (!this.selectedGem) {
            // Выбираем первую фигуру
            gem.selected = true;
            this.selectedGem = gem;
            console.log("Фигура выбрана:", gem.row, gem.col);
        } else {
            // Проверяем, соседние ли фигуры
            const rowDiff = Math.abs(gem.row - this.selectedGem.row);
            const colDiff = Math.abs(gem.col - this.selectedGem.col);
            
            if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
                // Меняем фигуры местами
                console.log("Обмен фигур:", this.selectedGem.row, this.selectedGem.col, "и", gem.row, gem.col);
                this.swapGems(this.selectedGem, gem);
            } else {
                // Выбираем новую фигуру
                this.selectedGem.selected = false;
                gem.selected = true;
                this.selectedGem = gem;
                console.log("Выбрана новая фигура:", gem.row, gem.col);
            }
        }
    }
    
    swapGems(gem1, gem2) {
        // Сохраняем старые позиции
        const oldRow1 = gem1.row, oldCol1 = gem1.col;
        const oldRow2 = gem2.row, oldCol2 = gem2.col;
        
        // Временно меняем местами в сетке
        this.grid[gem1.row][gem1.col] = gem2;
        this.grid[gem2.row][gem2.col] = gem1;
        
        // Обновляем координаты фигур
        gem1.row = oldRow2;
        gem1.col = oldCol2;
        gem2.row = oldRow1;
        gem2.col = oldCol1;
        
        // Обновляем позиции для отрисовки
        gem1.x = this.gridOffsetX + gem1.col * this.cellSize;
        gem1.y = this.gridOffsetY + gem1.row * this.cellSize;
        gem2.x = this.gridOffsetX + gem2.col * this.cellSize;
        gem2.y = this.gridOffsetY + gem2.row * this.cellSize;
        
        // Снимаем выделение
        gem1.selected = false;
        gem2.selected = false;
        this.selectedGem = null;
        
        this.moves--;
        this.isAnimating = true;
        
        // Проверяем совпадения
        setTimeout(() => {
            const matches = this.findMatches();
            
            if (matches.length > 0) {
                console.log("Найдены совпадения:", matches.length);
                this.removeMatches(matches);
            } else {
                // Возвращаем фигуры обратно
                console.log("Совпадений нет, возвращаем фигуры");
                this.grid[gem1.row][gem1.col] = gem2;
                this.grid[gem2.row][gem2.col] = gem1;
                
                // Восстанавливаем позиции
                gem1.row = oldRow1;
                gem1.col = oldCol1;
                gem2.row = oldRow2;
                gem2.col = oldCol2;
                
                gem1.x = this.gridOffsetX + gem1.col * this.cellSize;
                gem1.y = this.gridOffsetY + gem1.row * this.cellSize;
                gem2.x = this.gridOffsetX + gem2.col * this.cellSize;
                gem2.y = this.gridOffsetY + gem2.row * this.cellSize;
                
                this.moves++; // Возвращаем ход
                this.isAnimating = false;
                this.updateDisplay();
            }
        }, 300);
        
        this.updateDisplay();
    }
    
    findMatches() {
        const matches = new Set();
        
        // Проверяем горизонтальные совпадения
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE - 2; col++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row][col + 1];
                const gem3 = this.grid[row][col + 2];
                
                if (gem1 && gem2 && gem3 &&
                    gem1.colorIdx === gem2.colorIdx &&
                    gem2.colorIdx === gem3.colorIdx) {
                    matches.add(`${row},${col}`);
                    matches.add(`${row},${col + 1}`);
                    matches.add(`${row},${col + 2}`);
                }
            }
        }
        
        // Проверяем вертикальные совпадения
        for (let col = 0; col < this.GRID_SIZE; col++) {
            for (let row = 0; row < this.GRID_SIZE - 2; row++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row + 1][col];
                const gem3 = this.grid[row + 2][col];
                
                if (gem1 && gem2 && gem3 &&
                    gem1.colorIdx === gem2.colorIdx &&
                    gem2.colorIdx === gem3.colorIdx) {
                    matches.add(`${row},${col}`);
                    matches.add(`${row + 1},${col}`);
                    matches.add(`${row + 2},${col}`);
                }
            }
        }
        
        // Преобразуем в массив объектов
        return Array.from(matches).map(str => {
            const [row, col] = str.split(',').map(Number);
            return {row, col};
        });
    }
    
    removeMatches(matches) {
        if (matches.length === 0) return;
        
        // Увеличиваем очки
        const points = matches.length * 100 * this.comboCounter;
        this.score += points;
        this.comboCounter++;
        
        console.log("Удаляем совпадения, очки:", points, "комбо:", this.comboCounter);
        
        // Удаляем совпадения
        matches.forEach(({row, col}) => {
            this.grid[row][col] = null;
        });
        
        // Заполняем пустые места
        setTimeout(() => {
            // Для каждого столбца
            for (let col = 0; col < this.GRID_SIZE; col++) {
                // Собираем существующие фигуры снизу вверх
                const existingGems = [];
                for (let row = this.GRID_SIZE - 1; row >= 0; row--) {
                    if (this.grid[row][col]) {
                        existingGems.push(this.grid[row][col]);
                    }
                }
                
                // Очищаем столбец
                for (let row = 0; row < this.GRID_SIZE; row++) {
                    this.grid[row][col] = null;
                }
                
                // Заполняем снизу существующими фигурами
                let rowIndex = this.GRID_SIZE - 1;
                for (const gem of existingGems) {
                    gem.row = rowIndex;
                    gem.col = col;
                    gem.x = this.gridOffsetX + col * this.cellSize;
                    gem.targetY = this.gridOffsetY + rowIndex * this.cellSize;
                    this.grid[rowIndex][col] = gem;
                    rowIndex--;
                }
                
                // Добавляем новые фигуры сверху
                for (let row = rowIndex; row >= 0; row--) {
                    const colorIdx = Math.floor(Math.random() * this.COLORS.length);
                    this.grid[row][col] = {
                        row, col,
                        colorIdx,
                        x: this.gridOffsetX + col * this.cellSize,
                        y: this.gridOffsetY - (this.GRID_SIZE - row) * this.cellSize,
                        targetY: this.gridOffsetY + row * this.cellSize,
                        selected: false,
                        size: this.cellSize - 10
                    };
                }
            }
            
            // Проверяем еще совпадения
            setTimeout(() => {
                const newMatches = this.findMatches();
                if (newMatches.length > 0) {
                    this.removeMatches(newMatches);
                } else {
                    this.isAnimating = false;
                    this.updateDisplay();
                    
                    // Проверяем конец игры
                    if (this.moves <= 0 || this.timeLeft <= 0) {
                        console.log("Конец игры! Ходы:", this.moves, "Время:", this.timeLeft);
                        this.state = this.STATE.GAME_OVER;
                        document.getElementById('finalScore').textContent = this.score;
                        this.showScreen('gameOverScreen');
                        this.canvas.style.pointerEvents = 'none'; // Отключаем клики по canvas
                    }
                }
            }, 500);
        }, 300);
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateScoresDisplay() {
        const scoresList = document.getElementById('scoresList');
        const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
        
        let html = '';
        if (scores.length === 0) {
            html = '<div style="text-align: center; color: #888; padding: 20px;">Рекордов пока нет</div>';
        } else {
            scores.forEach((score, index) => {
                html += `
                    <div class="score-item">
                        <span>${index + 1}. ${score.name}</span>
                        <span>${score.score}</span>
                    </div>
                `;
            });
        }
        
        scoresList.innerHTML = html;
    }
    
    saveScore() {
        const nameInput = document.getElementById('playerName');
        const name = nameInput.value.trim() || 'Игрок';
        
        if (name) {
            const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
            scores.push({name, score: this.score, date: new Date().toLocaleDateString()});
            scores.sort((a, b) => b.score - a.score);
            
            // Оставляем топ-10
            const topScores = scores.slice(0, 10);
            localStorage.setItem('match3Scores', JSON.stringify(topScores));
            
            nameInput.value = '';
            this.showScores();
        }
    }
    
    update() {
        if (this.state === this.STATE.PLAYING) {
            this.timeLeft -= 1/60; // 60 FPS
            if (this.timeLeft < 0) this.timeLeft = 0;
            
            // Проверяем конец игры по времени
            if (this.timeLeft <= 0 && !this.isAnimating) {
                this.state = this.STATE.GAME_OVER;
                document.getElementById('finalScore').textContent = this.score;
                this.showScreen('gameOverScreen');
                this.canvas.style.pointerEvents = 'none'; // Отключаем клики по canvas
            }
            
            // Анимация падения фигур
            for (let row = 0; row < this.GRID_SIZE; row++) {
                for (let col = 0; col < this.GRID_SIZE; col++) {
                    const gem = this.grid[row][col];
                    if (gem && Math.abs(gem.y - gem.targetY) > 0.5) {
                        gem.y += (gem.targetY - gem.y) * 0.3;
                    } else if (gem) {
                        gem.y = gem.targetY;
                    }
                }
            }
        }
    }
    
    draw() {
        // Очищаем canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем только в игровом состоянии
        if (this.state === this.STATE.PLAYING || this.state === this.STATE.PAUSED) {
            // Рисуем фон сетки
            this.ctx.fillStyle = '#2a2a3e';
            this.ctx.fillRect(
                this.gridOffsetX - 10,
                this.gridOffsetY - 10,
                this.GRID_SIZE * this.cellSize + 20,
                this.GRID_SIZE * this.cellSize + 20
            );
            
            // Рисуем фигуры
            for (let row = 0; row < this.GRID_SIZE; row++) {
                for (let col = 0; col < this.GRID_SIZE; col++) {
                    const gem = this.grid[row][col];
                    if (gem) {
                        this.drawGem(gem);
                    }
                }
            }
        }
    }
    
    drawGem(gem) {
        const color = this.COLORS[gem.colorIdx];
        const size = gem.size || (this.cellSize - 10);
        const padding = (this.cellSize - size) / 2;
        
        // Свечение если выбрано
        if (gem.selected) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.ctx.beginPath();
            this.ctx.arc(
                gem.x + this.cellSize / 2,
                gem.y + this.cellSize / 2,
                size / 2 + 5,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Тело фигуры
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.beginPath();
        this.ctx.roundRect(
            gem.x + padding,
            gem.y + padding,
            size,
            size,
            10
        );
        this.ctx.fill();
        
        // Внутреннее свечение
        const innerSize = size - 10;
        const innerPadding = (this.cellSize - innerSize) / 2;
        
        this.ctx.fillStyle = `rgb(${Math.min(255, color.r + 40)}, 
                                 ${Math.min(255, color.g + 40)}, 
                                 ${Math.min(255, color.b + 40)})`;
        this.ctx.beginPath();
        this.ctx.roundRect(
            gem.x + innerPadding,
            gem.y + innerPadding,
            innerSize,
            innerSize,
            5
        );
        this.ctx.fill();
        
        // Блик
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            gem.x + innerPadding + innerSize * 0.4,
            gem.y + innerPadding + innerSize * 0.4,
            innerSize * 0.15,
            innerSize * 0.15,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();
    }
    
    startGameLoop() {
        const gameLoop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}

// Запуск игры
window.addEventListener('load', () => {
    console.log("Страница загружена, запуск игры...");
    
    // Инициализация игры
    const game = new Game();
    
    // Для iOS: предотвращаем скроллинг
    document.addEventListener('touchmove', (e) => {
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Предотвращаем контекстное меню
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    console.log("Игра готова!");
});
