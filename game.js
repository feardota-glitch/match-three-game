class Game {
    constructor() {
        // Получаем canvas и контекст
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Настройка размеров canvas
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
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
        
        // Параметры
        this.GRID_SIZE = 8;
        this.CELL_SIZE = 60;
        this.colors = [
            {r: 255, g: 89, b: 94},    // Красный
            {r: 255, g: 202, b: 58},   // Желтый
            {r: 138, g: 201, b: 38},   // Зеленый
            {r: 25, g: 130, b: 196},   // Синий
            {r: 106, g: 76, b: 147},   // Фиолетовый
            {r: 255, g: 157, b: 129},  // Оранжевый
        ];
        
        // Инициализация
        this.initGrid();
        this.setupEventListeners();
        this.gameLoop();
        
        console.log("Игра инициализирована");
    }
    
    initGrid() {
        this.grid = [];
        const offsetX = (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2;
        const offsetY = 100;
        
        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const colorIdx = Math.floor(Math.random() * this.colors.length);
                this.grid[row][col] = {
                    row, col,
                    colorIdx,
                    x: offsetX + col * this.CELL_SIZE,
                    y: offsetY + row * this.CELL_SIZE,
                    selected: false
                };
            }
        }
    }
    
    setupEventListeners() {
        console.log("Настройка обработчиков событий...");
        
        // Клики по canvas
        this.canvas.addEventListener('click', (e) => {
            if (this.state !== this.STATE.PLAYING) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            console.log("Клик на canvas:", x, y);
            
            this.handleCanvasClick(x, y);
        });
        
        // Кнопка старта
        document.getElementById('startBtn').addEventListener('click', () => {
            console.log("Кнопка 'Начать игру' нажата");
            this.startGame();
        });
        
        // Кнопка паузы
        document.getElementById('pauseBtn').addEventListener('click', () => {
            console.log("Кнопка 'Пауза' нажата");
            this.showScreen('pauseScreen');
            this.state = this.STATE.PAUSED;
        });
        
        // Кнопка продолжения
        document.getElementById('resumeBtn').addEventListener('click', () => {
            console.log("Кнопка 'Продолжить' нажата");
            this.hideAllScreens();
            this.state = this.STATE.PLAYING;
        });
        
        // Кнопка рестарта
        document.getElementById('restartBtn').addEventListener('click', () => {
            console.log("Кнопка 'Начать заново' нажата");
            this.startGame();
        });
        
        // Кнопка возврата в меню из паузы
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            console.log("Кнопка 'В меню' из паузы нажата");
            this.showScreen('menuScreen');
            this.state = this.STATE.MENU;
        });
        
        // Таблица рекордов
        document.getElementById('scoresBtn').addEventListener('click', () => {
            console.log("Кнопка 'Таблица рекордов' нажата");
            this.showScreen('scoresScreen');
        });
        
        document.getElementById('backFromScoresBtn').addEventListener('click', () => {
            console.log("Кнопка 'Назад' из рекордов нажата");
            this.showScreen('menuScreen');
        });
        
        // Инструкция
        document.getElementById('instructionsBtn').addEventListener('click', () => {
            console.log("Кнопка 'Инструкция' нажата");
            this.showScreen('instructionsScreen');
        });
        
        document.getElementById('backFromInstructionsBtn').addEventListener('click', () => {
            console.log("Кнопка 'Назад' из инструкции нажата");
            this.showScreen('menuScreen');
        });
        
        // Окончание игры
        document.getElementById('saveScoreBtn').addEventListener('click', () => {
            console.log("Кнопка 'Сохранить результат' нажата");
            this.saveScore();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            console.log("Кнопка 'Играть снова' нажата");
            this.startGame();
        });
        
        document.getElementById('menuFromGameOverBtn').addEventListener('click', () => {
            console.log("Кнопка 'В меню' из окончания игры нажата");
            this.showScreen('menuScreen');
            this.state = this.STATE.MENU;
        });
    }
    
    showScreen(screenId) {
        // Скрыть все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Показать нужный экран
        document.getElementById(screenId).classList.remove('hidden');
        
        // Скрыть HUD если показываем не игровой экран
        if (screenId !== 'gameScreen') {
            document.getElementById('gameHUD').classList.add('hidden');
        }
    }
    
    hideAllScreens() {
        // Скрыть все UI экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Показать HUD
        document.getElementById('gameHUD').classList.remove('hidden');
    }
    
    startGame() {
        console.log("Запуск игры...");
        
        // Сброс состояния
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.selectedGem = null;
        this.state = this.STATE.PLAYING;
        
        // Инициализация сетки
        this.initGrid();
        
        // Обновить отображение
        this.updateDisplay();
        
        // Показать игровой экран
        this.hideAllScreens();
        
        console.log("Игра начата");
    }
    
    handleCanvasClick(x, y) {
        console.log("Обработка клика в игре:", x, y);
        
        const offsetX = (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2;
        const offsetY = 100;
        
        // Проверяем, кликнули ли внутри сетки
        if (x < offsetX || y < offsetY || 
            x > offsetX + this.GRID_SIZE * this.CELL_SIZE || 
            y > offsetY + this.GRID_SIZE * this.CELL_SIZE) {
            return;
        }
        
        // Определяем столбец и строку
        const col = Math.floor((x - offsetX) / this.CELL_SIZE);
        const row = Math.floor((y - offsetY) / this.CELL_SIZE);
        
        console.log("Клик по ячейке:", row, col);
        
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
        
        // Обновляем координаты
        gem1.row = gem2.row;
        gem1.col = gem2.col;
        gem2.row = tempRow;
        gem2.col = tempCol;
        
        // Снимаем выделение
        gem1.selected = false;
        gem2.selected = false;
        this.selectedGem = null;
        
        // Уменьшаем ходы
        this.moves--;
        
        // Проверяем совпадения
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // Начисляем очки
            this.score += matches.length * 100;
            this.removeMatches(matches);
        } else {
            // Возвращаем фигуры обратно
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
        
        // Проверяем конец игры
        if (this.moves <= 0) {
            setTimeout(() => {
                this.state = this.STATE.GAME_OVER;
                document.getElementById('finalScore').textContent = this.score;
                this.showScreen('gameOverScreen');
            }, 500);
        }
    }
    
    findMatches() {
        const matches = [];
        
        // Проверяем горизонтали
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE - 2; col++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row][col + 1];
                const gem3 = this.grid[row][col + 2];
                
                if (gem1 && gem2 && gem3 &&
                    gem1.colorIdx === gem2.colorIdx &&
                    gem2.colorIdx === gem3.colorIdx) {
                    matches.push({row, col});
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
                
                if (gem1 && gem2 && gem3 &&
                    gem1.colorIdx === gem2.colorIdx &&
                    gem2.colorIdx === gem3.colorIdx) {
                    matches.push({row, col});
                    matches.push({row: row + 1, col});
                    matches.push({row: row + 2, col});
                }
            }
        }
        
        // Убираем дубликаты
        const uniqueMatches = [];
        const seen = new Set();
        
        matches.forEach(match => {
            const key = `${match.row},${match.col}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMatches.push(match);
            }
        });
        
        return uniqueMatches;
    }
    
    removeMatches(matches) {
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
                    const colorIdx = Math.floor(Math.random() * this.colors.length);
                    this.grid[row][col] = {
                        row, col,
                        colorIdx,
                        x: (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2 + col * this.CELL_SIZE,
                        y: 100 + row * this.CELL_SIZE,
                        selected: false
                    };
                }
            }
            
            this.updateDisplay();
        }, 300);
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    saveScore() {
        const name = document.getElementById('playerName').value.trim() || 'Игрок';
        const score = this.score;
        
        // Сохраняем в localStorage
        const scores = JSON.parse(localStorage.getItem('match3Scores') || '[]');
        scores.push({name, score, date: new Date().toLocaleDateString()});
        scores.sort((a, b) => b.score - a.score);
        
        // Оставляем топ-10
        const topScores = scores.slice(0, 10);
        localStorage.setItem('match3Scores', JSON.stringify(topScores));
        
        // Обновляем отображение таблицы
        this.updateScoresDisplay();
        this.showScreen('scoresScreen');
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
        
        scoresList.innerHTML = html || '<p style="color: #888;">Рекордов пока нет</p>';
    }
    
    draw() {
        // Очищаем canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем только в игровом состоянии
        if (this.state === this.STATE.PLAYING || this.state === this.STATE.PAUSED) {
            const offsetX = (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2;
            const offsetY = 100;
            
            // Рисуем фон сетки
            this.ctx.fillStyle = '#2a2a3e';
            this.ctx.fillRect(
                offsetX - 10,
                offsetY - 10,
                this.GRID_SIZE * this.CELL_SIZE + 20,
                this.GRID_SIZE * this.CELL_SIZE + 20
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
        const color = this.colors[gem.colorIdx];
        const size = this.CELL_SIZE - 10;
        const padding = (this.CELL_SIZE - size) / 2;
        
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
    
    gameLoop() {
        // Обновление времени
        if (this.state === this.STATE.PLAYING) {
            this.timeLeft -= 1/60; // 60 FPS
            if (this.timeLeft < 0) this.timeLeft = 0;
            
            // Проверяем конец игры по времени
            if (this.timeLeft <= 0) {
                this.state = this.STATE.GAME_OVER;
                document.getElementById('finalScore').textContent = this.score;
                this.showScreen('gameOverScreen');
            }
            
            this.updateDisplay();
        }
        
        // Отрисовка
        this.draw();
        
        // Следующий кадр
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {
    console.log("Страница загружена");
    new Game();
});
