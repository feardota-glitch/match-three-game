class Game {
    constructor() {
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
        
        // Параметры поля (будут вычисляться динамически)
        this.GRID_SIZE = 8;
        this.cellSize = 0;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        
        // Инициализация
        this.calculateSizes();
        this.initGrid();
        this.setupEventListeners();
        this.startGameLoop();
        
        console.log("Игра инициализирована");
    }
    
    calculateSizes() {
        // Вычисляем размер клетки в зависимости от размера экрана
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Оставляем место для HUD (80px сверху) и отступы (40px)
        const availableHeight = screenHeight - 80 - 40;
        const availableWidth = screenWidth - 40;
        
        // Вычисляем максимальный размер клетки
        const maxCellSizeByHeight = Math.floor(availableHeight / this.GRID_SIZE);
        const maxCellSizeByWidth = Math.floor(availableWidth / this.GRID_SIZE);
        
        // Берем минимальный из двух, чтобы все влезало
        this.cellSize = Math.min(maxCellSizeByHeight, maxCellSizeByWidth, 60);
        
        // Центрируем сетку
        this.gridOffsetX = (screenWidth - this.GRID_SIZE * this.cellSize) / 2;
        this.gridOffsetY = 80; // Отступ для HUD
        
        console.log("Размеры:", {
            screenWidth, screenHeight,
            cellSize: this.cellSize,
            offsetX: this.gridOffsetX,
            offsetY: this.gridOffsetY
        });
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.calculateSizes();
        
        // Обновляем позиции всех фигур
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
        this.grid = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                // Выбираем случайный цвет, избегая начальных совпадений
                let availableColors = [...Array(this.COLORS.length).keys()];
                
                // Проверяем слева
                if (col >= 2) {
                    if (this.grid[row][col - 1] && this.grid[row][col - 2]) {
                        if (this.grid[row][col - 1].colorIdx === this.grid[row][col - 2].colorIdx) {
                            const index = availableColors.indexOf(this.grid[row][col - 1].colorIdx);
                            if (index > -1) availableColors.splice(index, 1);
                        }
                    }
                }
                
                // Проверяем сверху
                if (row >= 2) {
                    if (this.grid[row - 1][col] && this.grid[row - 2][col]) {
                        if (this.grid[row - 1][col].colorIdx === this.grid[row - 2][col].colorIdx) {
                            const index = availableColors.indexOf(this.grid[row - 1][col].colorIdx);
                            if (index > -1) availableColors.splice(index, 1);
                        }
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
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Клики по canvas
        this.canvas.addEventListener('click', (e) => {
            if (this.state !== this.STATE.PLAYING || this.isAnimating) return;
            this.handleCanvasClick(e);
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state !== this.STATE.PLAYING || this.isAnimating) return;
            this.handleCanvasClick(e.touches[0]);
        });
        
        // Кнопки
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => this.showScreen('menuScreen'));
        document.getElementById('scoresBtn').addEventListener('click', () => {
            this.updateScoresDisplay();
            this.showScreen('scoresScreen');
        });
        document.getElementById('backFromScoresBtn').addEventListener('click', () => this.showScreen('menuScreen'));
        document.getElementById('instructionsBtn').addEventListener('click', () => this.showScreen('instructionsScreen'));
        document.getElementById('backFromInstructionsBtn').addEventListener('click', () => this.showScreen('menuScreen'));
        document.getElementById('saveScoreBtn').addEventListener('click', () => this.saveScore());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.startGame());
        document.getElementById('menuFromGameOverBtn').addEventListener('click', () => this.showScreen('menuScreen'));
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
        
        // Показываем/скрываем HUD
        if (screenId === 'menuScreen' || screenId === 'pauseScreen' || 
            screenId === 'scoresScreen' || screenId === 'gameOverScreen' || 
            screenId === 'instructionsScreen') {
            document.getElementById('gameHUD').classList.add('hidden');
        } else {
            document.getElementById('gameHUD').classList.remove('hidden');
        }
    }
    
    startGame() {
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.comboCounter = 1;
        this.selectedGem = null;
        this.state = this.STATE.PLAYING;
        this.isAnimating = false;
        
        this.calculateSizes();
        this.initGrid();
        this.updateDisplay();
        this.showScreen('menuScreen'); // Сначала скрываем меню
        document.getElementById('gameHUD').classList.remove('hidden');
        
        console.log("Игра начата");
    }
    
    pauseGame() {
        this.state = this.STATE.PAUSED;
        this.showScreen('pauseScreen');
    }
    
    resumeGame() {
        this.state = this.STATE.PLAYING;
        this.showScreen('menuScreen'); // Скрываем экран паузы
        document.getElementById('gameHUD').classList.remove('hidden');
    }
    
    handleCanvasClick(event) {
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
        
        const gem = this.grid[row][col];
        
        if (!this.selectedGem) {
            // Выбираем первую фигуру
            this.selectedGem = gem;
            gem.selected = true;
        } else {
            // Проверяем, соседние ли фигуры
            const rowDiff = Math.abs(gem.row - this.selectedGem.row);
            const colDiff = Math.abs(gem.col - this.selectedGem.col);
            
            if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
                // Меняем фигуры местами
                this.swapGems(this.selectedGem, gem);
            } else {
                // Выбираем новую фигуру
                this.selectedGem.selected = false;
                this.selectedGem = gem;
                gem.selected = true;
            }
        }
    }
    
    swapGems(gem1, gem2) {
        console.log("Обмен фигур:", gem1.row, gem1.col, "и", gem2.row, gem2.col);
        
        // Временно меняем местами в сетке
        const tempRow = gem1.row;
        const tempCol = gem1.col;
        
        this.grid[gem1.row][gem1.col] = gem2;
        this.grid[gem2.row][gem2.col] = gem1;
        
        // Обновляем координаты фигур
        gem1.row = gem2.row;
        gem1.col = gem2.col;
        gem2.row = tempRow;
        gem2.col = tempCol;
        
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
        
        // Проверяем совпадения
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            this.isAnimating = true;
            setTimeout(() => {
                this.removeMatches(matches);
                this.checkAdditionalMatches();
            }, 300);
        } else {
            // Возвращаем фигуры обратно
            this.isAnimating = true;
            setTimeout(() => {
                this.grid[gem1.row][gem1.col] = gem2;
                this.grid[gem2.row][gem2.col] = gem1;
                
                const tempR = gem1.row;
                const tempC = gem1.col;
                gem1.row = gem2.row;
                gem1.col = gem2.col;
                gem2.row = tempR;
                gem2.col = tempC;
                
                // Обновляем позиции
                gem1.x = this.gridOffsetX + gem1.col * this.cellSize;
                gem1.y = this.gridOffsetY + gem1.row * this.cellSize;
                gem2.x = this.gridOffsetX + gem2.col * this.cellSize;
                gem2.y = this.gridOffsetY + gem2.row * this.cellSize;
                
                this.moves++; // Возвращаем ход
                this.isAnimating = false;
                this.updateDisplay();
            }, 300);
        }
        
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
        
        // Преобразуем обратно в массив объектов
        return Array.from(matches).map(str => {
            const [row, col] = str.split(',').map(Number);
            return {row, col};
        });
    }
    
    removeMatches(matches) {
        if (matches.length === 0) return;
        
        console.log("Удаляем совпадения:", matches.length);
        
        // Увеличиваем комбо
        this.comboCounter++;
        
        // Начисляем очки
        const points = matches.length * 100 * this.comboCounter;
        this.score += points;
        
        // Удаляем совпадения
        matches.forEach(({row, col}) => {
            this.grid[row][col] = null;
        });
        
        // Заполняем пустые места
        setTimeout(() => {
            // Для каждого столбца
            for (let col = 0; col < this.GRID_SIZE; col++) {
                // Собираем все существующие фигуры в столбце снизу вверх
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
                
                // Заполняем столбец снизу существующими фигурами
                let rowIndex = this.GRID_SIZE - 1;
                for (const gem of existingGems) {
                    gem.row = rowIndex;
                    gem.col = col;
                    gem.x = this.gridOffsetX + col * this.cellSize;
                    gem.y = this.gridOffsetY + rowIndex * this.cellSize;
                    gem.targetY = gem.y;
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
                        y: this.gridOffsetY - (this.GRID_SIZE - row) * this.cellSize, // Начинаем сверху
                        targetY: this.gridOffsetY + row * this.cellSize,
                        selected: false,
                        size: this.cellSize - 10
                    };
                }
            }
            
            this.updateDisplay();
        }, 300);
    }
    
    checkAdditionalMatches() {
        setTimeout(() => {
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                this.removeMatches(newMatches);
                this.checkAdditionalMatches();
            } else {
                this.isAnimating = false;
                
                // Проверяем конец игры
                if (this.moves <= 0 || this.timeLeft <= 0) {
                    this.state = this.STATE.GAME_OVER;
                    document.getElementById('finalScore').textContent = this.score;
                    this.showScreen('gameOverScreen');
                }
            }
        }, 500);
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Комбо
        const comboDisplay = document.getElementById('comboDisplay');
        if (this.comboCounter > 1) {
            comboDisplay.textContent = `Комбо: x${this.comboCounter}`;
            comboDisplay.style.display = 'block';
        } else {
            comboDisplay.style.display = 'none';
        }
    }
    
    updateScoresDisplay() {
        const scoresList = document.getElementById('scoresList');
        const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
        
        let html = '';
        scores.forEach((score, index) => {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span>${index + 1}. ${score.name}</span>
                    <span>${score.score}</span>
                </div>
            `;
        });
        
        scoresList.innerHTML = html || '<p style="color: #888; text-align: center;">Рекордов пока нет</p>';
    }
    
    saveScore() {
        const name = document.getElementById('playerName').value.trim() || 'Игрок';
        
        if (name) {
            const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
            scores.push({name, score: this.score, date: new Date().toLocaleDateString()});
            scores.sort((a, b) => b.score - a.score);
            
            // Оставляем топ-10
            const topScores = scores.slice(0, 10);
            localStorage.setItem('match3Scores', JSON.stringify(topScores));
            
            this.updateScoresDisplay();
            this.showScreen('scoresScreen');
            document.getElementById('playerName').value = '';
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
            }
            
            // Анимация падения фигур
            for (let row = 0; row < this.GRID_SIZE; row++) {
                for (let col = 0; col < this.GRID_SIZE; col++) {
                    const gem = this.grid[row][col];
                    if (gem && Math.abs(gem.y - gem.targetY) > 0.5) {
                        gem.y += (gem.targetY - gem.y) * 0.3;
                    }
                }
            }
            
            this.updateDisplay();
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
            this.ctx.fillRect(
                gem.x + padding - 5,
                gem.y + padding - 5,
                size + 10,
                size + 10
            );
            this.ctx.restore();
        }
        
        // Тело фигуры
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(
            gem.x + padding,
            gem.y + padding,
            size,
            size
        );
        
        // Внутреннее свечение
        this.ctx.fillStyle = `rgb(${Math.min(255, color.r + 40)}, 
                                 ${Math.min(255, color.g + 40)}, 
                                 ${Math.min(255, color.b + 40)})`;
        this.ctx.fillRect(
            gem.x + padding + 5,
            gem.y + padding + 5,
            size - 10,
            size - 10
        );
        
        // Блик
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            gem.x + padding + size * 0.3,
            gem.y + padding + size * 0.3,
            size * 0.15,
            size * 0.15,
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
    const game = new Game();
    
    // Для iOS: предотвращаем скроллинг и масштабирование
    document.addEventListener('touchmove', (e) => {
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Предотвращаем контекстное меню на мобильных
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Для iOS: фикс 100vh
    const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    window.addEventListener('resize', setVH);
    setVH();
});
