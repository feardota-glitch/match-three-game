class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Состояния
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
        this.CELL_SIZE = 60;
        this.gridOffsetX = 0;
        this.gridOffsetY = 100;
        
        // Инициализация
        this.initGrid();
        this.setupEventListeners();
        this.startGameLoop();
        
        // Показать меню
        this.showScreen('menuScreen');
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gridOffsetX = (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2;
    }
    
    initGrid() {
        this.grid = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const colorIdx = Math.floor(Math.random() * this.COLORS.length);
                this.grid[row][col] = {
                    row, col,
                    colorIdx,
                    x: this.gridOffsetX + col * this.CELL_SIZE,
                    y: this.gridOffsetY + row * this.CELL_SIZE,
                    targetY: this.gridOffsetY + row * this.CELL_SIZE,
                    selected: false,
                    size: this.CELL_SIZE - 10
                };
            }
        }
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Клики по canvas
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick(e.touches[0]);
        });
        
        // Кнопки меню
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('scoresBtn').addEventListener('click', () => {
            this.updateScoresDisplay();
            this.showScreen('scoresScreen');
        });
        
        document.getElementById('instructionsBtn').addEventListener('click', () => {
            this.showScreen('instructionsScreen');
        });
        
        // Кнопки паузы
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.state = this.STATE.PAUSED;
            this.showScreen('pauseScreen');
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.state = this.STATE.PLAYING;
            this.hideAllScreens();
            document.getElementById('gameHUD').classList.add('active');
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            this.state = this.STATE.MENU;
            this.showScreen('menuScreen');
        });
        
        // Таблица рекордов
        document.getElementById('backFromScoresBtn').addEventListener('click', () => {
            this.showScreen('menuScreen');
        });
        
        // Конец игры
        document.getElementById('saveScoreBtn').addEventListener('click', () => {
            this.saveScore();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('menuFromGameOverBtn').addEventListener('click', () => {
            this.showScreen('menuScreen');
        });
        
        // Инструкция
        document.getElementById('backFromInstructionsBtn').addEventListener('click', () => {
            this.showScreen('menuScreen');
        });
    }
    
    showScreen(screenId) {
        // Скрыть все UI экраны
        document.querySelectorAll('.ui-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Скрыть HUD
        document.getElementById('gameHUD').classList.remove('active');
        
        // Показать нужный экран
        document.getElementById(screenId).classList.add('active');
    }
    
    hideAllScreens() {
        document.querySelectorAll('.ui-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById('gameHUD').classList.add('active');
    }
    
    startGame() {
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.comboCounter = 1;
        this.selectedGem = null;
        this.state = this.STATE.PLAYING;
        this.initGrid();
        this.updateDisplay();
        this.hideAllScreens();
    }
    
    handleClick(event) {
        if (this.state !== this.STATE.PLAYING || this.isAnimating) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Находим фигуру
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const gem = this.grid[row][col];
                if (x >= gem.x && x <= gem.x + this.CELL_SIZE &&
                    y >= gem.y && y <= gem.y + this.CELL_SIZE) {
                    
                    if (!this.selectedGem) {
                        // Выбираем первую фигуру
                        this.selectedGem = gem;
                        gem.selected = true;
                    } else {
                        // Пытаемся поменять местами
                        const rowDiff = Math.abs(gem.row - this.selectedGem.row);
                        const colDiff = Math.abs(gem.col - this.selectedGem.col);
                        
                        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
                            this.swapGems(this.selectedGem, gem);
                        } else {
                            // Выбираем новую фигуру
                            this.selectedGem.selected = false;
                            this.selectedGem = gem;
                            gem.selected = true;
                        }
                    }
                    return;
                }
            }
        }
        
        // Клик мимо фигур
        if (this.selectedGem) {
            this.selectedGem.selected = false;
            this.selectedGem = null;
        }
    }
    
    swapGems(gem1, gem2) {
        // Временно меняем местами
        const tempRow = gem1.row;
        const tempCol = gem1.col;
        
        // Обновляем сетку
        this.grid[gem1.row][gem1.col] = gem2;
        this.grid[gem2.row][gem2.col] = gem1;
        
        // Обновляем позиции
        gem1.row = gem2.row;
        gem1.col = gem2.col;
        gem2.row = tempRow;
        gem2.col = tempCol;
        
        // Снимаем выделение
        gem1.selected = false;
        gem2.selected = false;
        this.selectedGem = null;
        
        this.moves--;
        
        // Проверяем совпадения
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            this.removeMatches(matches);
        } else {
            // Возвращаем обратно
            setTimeout(() => {
                this.grid[gem1.row][gem1.col] = gem2;
                this.grid[gem2.row][gem2.col] = gem1;
                
                const tempR = gem1.row;
                const tempC = gem1.col;
                gem1.row = gem2.row;
                gem1.col = gem2.col;
                gem2.row = tempR;
                gem2.col = tempC;
                
                this.moves++; // Возвращаем ход
                this.updateDisplay();
            }, 300);
        }
        
        this.updateDisplay();
    }
    
    findMatches() {
        const matches = [];
        
        // Проверяем горизонтали
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE - 2; col++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row][col + 1];
                const gem3 = this.grid[row][col + 2];
                
                if (gem1.colorIdx === gem2.colorIdx && 
                    gem2.colorIdx === gem3.colorIdx) {
                    matches.push({row, col: col});
                    matches.push({row, col: col + 1});
                    matches.push({row, col: col + 2});
                }
            }
        }
        
        // Проверяем вертикали
        for (let col = 0; col < this.GRID_SIZE; col++) {
            for (let row = 0; row < this.GRID_SIZE - 2; row++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row + 1][col];
                const gem3 = this.grid[row + 2][col];
                
                if (gem1.colorIdx === gem2.colorIdx && 
                    gem2.colorIdx === gem3.colorIdx) {
                    matches.push({row: row, col});
                    matches.push({row: row + 1, col});
                    matches.push({row: row + 2, col});
                }
            }
        }
        
        // Убираем дубликаты
        return Array.from(new Set(matches.map(m => `${m.row},${m.col}`)))
            .map(str => {
                const [row, col] = str.split(',').map(Number);
                return {row, col};
            });
    }
    
    removeMatches(matches) {
        if (matches.length === 0) return;
        
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
            for (let col = 0; col < this.GRID_SIZE; col++) {
                let emptySpaces = 0;
                
                // Опускаем фигуры вниз
                for (let row = this.GRID_SIZE - 1; row >= 0; row--) {
                    if (!this.grid[row][col]) {
                        emptySpaces++;
                    } else if (emptySpaces > 0) {
                        const gem = this.grid[row][col];
                        gem.row += emptySpaces;
                        this.grid[row + emptySpaces][col] = gem;
                        this.grid[row][col] = null;
                    }
                }
                
                // Создаем новые фигуры сверху
                for (let i = 0; i < emptySpaces; i++) {
                    const row = emptySpaces - i - 1;
                    const colorIdx = Math.floor(Math.random() * this.COLORS.length);
                    this.grid[row][col] = {
                        row, col,
                        colorIdx,
                        x: this.gridOffsetX + col * this.CELL_SIZE,
                        y: this.gridOffsetY - (i + 1) * this.CELL_SIZE,
                        targetY: this.gridOffsetY + row * this.CELL_SIZE,
                        selected: false,
                        size: this.CELL_SIZE - 10
                    };
                }
            }
            
            // Проверяем еще совпадения
            setTimeout(() => {
                const newMatches = this.findMatches();
                if (newMatches.length > 0) {
                    this.removeMatches(newMatches);
                } else {
                    this.updateDisplay();
                    
                    // Проверяем конец игры
                    if (this.moves <= 0 || this.timeLeft <= 0) {
                        this.state = this.STATE.GAME_OVER;
                        document.getElementById('finalScore').textContent = this.score;
                        this.showScreen('gameOverScreen');
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
        scoresList.innerHTML = '';
        
        // Загружаем рекорды
        const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
        
        scores.forEach((score, index) => {
            const div = document.createElement('div');
            div.className = 'score-item';
            div.innerHTML = `
                <span>${index + 1}. ${score.name}</span>
                <span>${score.score}</span>
            `;
            scoresList.appendChild(div);
        });
    }
    
    saveScore() {
        const name = document.getElementById('playerName').value.trim() || 'Игрок';
        
        if (name) {
            const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
            scores.push({name, score: this.score});
            scores.sort((a, b) => b.score - a.score);
            localStorage.setItem('match3Scores', JSON.stringify(scores.slice(0, 10)));
            
            this.updateScoresDisplay();
            this.showScreen('scoresScreen');
        }
    }
    
    update() {
        if (this.state === this.STATE.PLAYING) {
            this.timeLeft -= 1/60; // 60 FPS
            if (this.timeLeft < 0) this.timeLeft = 0;
            
            if (this.timeLeft <= 0 || this.moves <= 0) {
                this.state = this.STATE.GAME_OVER;
                document.getElementById('finalScore').textContent = this.score;
                this.showScreen('gameOverScreen');
            }
        }
        
        // Обновляем анимацию фигур
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const gem = this.grid[row][col];
                if (gem && Math.abs(gem.y - gem.targetY) > 0.5) {
                    gem.y += (gem.targetY - gem.y) * 0.3;
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
            // Рисуем фон поля
            const gridWidth = this.GRID_SIZE * this.CELL_SIZE;
            const gridHeight = this.GRID_SIZE * this.CELL_SIZE;
            
            this.ctx.fillStyle = '#2a2a3e';
            this.ctx.fillRect(
                this.gridOffsetX - 10,
                this.gridOffsetY - 10,
                gridWidth + 20,
                gridHeight + 20
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
        
        // Свечение если выбрано
        if (gem.selected) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.ctx.beginPath();
            this.ctx.arc(
                gem.x + this.CELL_SIZE / 2,
                gem.y + this.CELL_SIZE / 2,
                gem.size / 2 + 5,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Тело фигуры
        const padding = (this.CELL_SIZE - gem.size) / 2;
        
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(
            gem.x + padding,
            gem.y + padding,
            gem.size,
            gem.size
        );
        
        // Внутреннее свечение
        const innerSize = gem.size - 10;
        const innerPadding = (this.CELL_SIZE - innerSize) / 2;
        
        this.ctx.fillStyle = `rgb(${Math.min(255, color.r + 40)}, 
                                 ${Math.min(255, color.g + 40)}, 
                                 ${Math.min(255, color.b + 40)})`;
        this.ctx.fillRect(
            gem.x + innerPadding,
            gem.y + innerPadding,
            innerSize,
            innerSize
        );
        
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
    new Game();
});
