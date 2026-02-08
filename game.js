class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        this.state = 'MENU';
        this.grid = [];
        this.selectedGem = null;
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.playerName = '';
        this.comboCounter = 1;
        this.comboTimer = 0;
        this.lastMatchTime = 0;
        this.isAnimating = false;
        this.swapBackPending = false;
        this.gemsToSwapBack = [];
        this.explosions = [];
        this.particles = [];
        this.isSoundOn = true;
        
        // Цвета фигур
        this.colors = [
            {r: 255, g: 89, b: 94},    // Красный
            {r: 255, g: 202, b: 58},   // Желтый
            {r: 138, g: 201, b: 38},   // Зеленый
            {r: 25, g: 130, b: 196},   // Синий
            {r: 106, g: 76, b: 147},   // Фиолетовый
            {r: 255, g: 157, b: 129},  // Оранжевый
        ];
        
        // Параметры поля
        this.gridSize = 8;
        this.cellSize = 60;
        this.gridOffsetX = 0;
        this.gridOffsetY = 120;
        
        // Загрузка и инициализация
        this.init();
        this.loadHighScores();
        this.setupEventListeners();
        this.startGameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gridOffsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
    }
    
    init() {
        // Инициализация сетки
        this.grid = [];
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                // Выбираем случайный цвет, избегая совпадений
                let availableColors = [...Array(this.colors.length).keys()];
                
                // Проверяем слева
                if (col >= 2) {
                    if (this.grid[row][col - 1] && this.grid[row][col - 2]) {
                        if (this.grid[row][col - 1].colorIdx === this.grid[row][col - 2].colorIdx) {
                            const colorToAvoid = this.grid[row][col - 1].colorIdx;
                            const index = availableColors.indexOf(colorToAvoid);
                            if (index > -1) {
                                availableColors.splice(index, 1);
                            }
                        }
                    }
                }
                
                // Проверяем сверху
                if (row >= 2) {
                    if (this.grid[row - 1][col] && this.grid[row - 2][col]) {
                        if (this.grid[row - 1][col].colorIdx === this.grid[row - 2][col].colorIdx) {
                            const colorToAvoid = this.grid[row - 1][col].colorIdx;
                            const index = availableColors.indexOf(colorToAvoid);
                            if (index > -1) {
                                availableColors.splice(index, 1);
                            }
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
                    size: this.cellSize - 10,
                    shakeIntensity: 0
                };
            }
        }
    }
    
    loadHighScores() {
        const scores = localStorage.getItem('match3HighScores');
        if (scores) {
            this.highScores = JSON.parse(scores);
        } else {
            this.highScores = [
                {name: "Игрок 1", score: 1500},
                {name: "Игрок 2", score: 1200},
                {name: "Игрок 3", score: 1000},
                {name: "Игрок 4", score: 800},
                {name: "Игрок 5", score: 600},
            ];
        }
    }
    
    saveHighScores() {
        localStorage.setItem('match3HighScores', JSON.stringify(this.highScores));
    }
    
    addHighScore(name, score) {
        this.highScores.push({name, score});
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10);
        this.saveHighScores();
        this.updateScoresDisplay();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Клики по канвасу
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleCanvasClick(touch);
        }, {passive: false});
        
        // Кнопки меню
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('scoresBtn').addEventListener('click', () => this.showScreen('SCORES'));
        document.getElementById('instructionsBtn').addEventListener('click', () => this.showScreen('INSTRUCTIONS'));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
        
        // Кнопки паузы
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => this.showScreen('MENU'));
        
        // Таблица рекордов
        document.getElementById('backFromScoresBtn').addEventListener('click', () => this.showScreen('MENU'));
        
        // Конец игры
        document.getElementById('saveScoreBtn').addEventListener('click', () => this.saveScore());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('menuFromGameOverBtn').addEventListener('click', () => this.showScreen('MENU'));
        
        // Инструкция
        document.getElementById('backFromInstructionsBtn').addEventListener('click', () => this.showScreen('MENU'));
        
        // Ввод имени
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveScore();
            }
        });
    }
    
    showScreen(screenName) {
        // Скрыть все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показать нужный экран
        switch(screenName) {
            case 'MENU':
                document.getElementById('menu').classList.add('active');
                break;
            case 'GAME':
                document.getElementById('gameScreen').classList.add('active');
                break;
            case 'PAUSE':
                document.getElementById('pauseScreen').classList.add('active');
                break;
            case 'SCORES':
                this.updateScoresDisplay();
                document.getElementById('scoresScreen').classList.add('active');
                break;
            case 'GAME_OVER':
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('gameOverScreen').classList.add('active');
                break;
            case 'INSTRUCTIONS':
                document.getElementById('instructionsScreen').classList.add('active');
                break;
        }
        
        this.state = screenName;
    }
    
    startGame() {
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.comboCounter = 1;
        this.selectedGem = null;
        this.init();
        this.showScreen('GAME');
        this.updateGameDisplay();
    }
    
    pauseGame() {
        this.showScreen('PAUSE');
    }
    
    resumeGame() {
        this.showScreen('GAME');
    }
    
    restartGame() {
        this.startGame();
    }
    
    toggleSound() {
        this.isSoundOn = !this.isSoundOn;
        const btn = document.getElementById('soundToggle');
        if (this.isSoundOn) {
            btn.innerHTML = '<i class="fas fa-volume-up"></i> Звук: Вкл';
        } else {
            btn.innerHTML = '<i class="fas fa-volume-mute"></i> Звук: Выкл';
        }
    }
    
    handleCanvasClick(event) {
        if (this.state !== 'GAME' || this.isAnimating) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX || event.pageX) - rect.left;
        const y = (event.clientY || event.pageY) - rect.top;
        
        // Ищем фигуру по которой кликнули
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const gem = this.grid[row][col];
                if (gem && 
                    x >= gem.x && x <= gem.x + this.cellSize &&
                    y >= gem.y && y <= gem.y + this.cellSize) {
                    
                    if (this.isSoundOn) playClickSound();
                    
                    if (!this.selectedGem) {
                        // Выбираем первую фигуру
                        this.selectedGem = gem;
                        gem.selected = true;
                    } else {
                        // Если кликнули на ту же фигуру - отмена выбора
                        if (gem === this.selectedGem) {
                            this.selectedGem.selected = false;
                            this.selectedGem = null;
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
                    }
                    return;
                }
            }
        }
    }
    
    swapGems(gem1, gem2) {
        // Сохраняем старые позиции
        const oldRow1 = gem1.row, oldCol1 = gem1.col;
        const oldRow2 = gem2.row, oldCol2 = gem2.col;
        
        // Меняем местами в сетке
        this.grid[gem1.row][gem1.col] = gem2;
        this.grid[gem2.row][gem2.col] = gem1;
        
        // Обновляем позиции
        gem1.row = oldRow2; gem1.col = oldCol2;
        gem2.row = oldRow1; gem2.col = oldCol1;
        
        // Обновляем координаты для анимации
        gem1.targetX = this.gridOffsetX + gem1.col * this.cellSize;
        gem2.targetX = this.gridOffsetX + gem2.col * this.cellSize;
        
        // Снимаем выделение
        gem1.selected = false;
        gem2.selected = false;
        
        this.selectedGem = null;
        this.moves--;
        
        if (this.isSoundOn) playSwapSound();
        
        // Проверяем совпадения
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // Есть совпадения
            this.isAnimating = true;
            setTimeout(() => {
                this.removeMatches(matches);
                this.checkMatchesAfterAnimation();
            }, 300);
        } else {
            // Нет совпадений - возвращаем фигуры
            this.isAnimating = true;
            this.swapBackPending = true;
            this.gemsToSwapBack = [gem1, gem2];
            setTimeout(() => {
                this.swapGems(gem1, gem2);
                this.moves++; // Возвращаем ход
                this.swapBackPending = false;
                this.isAnimating = false;
            }, 300);
        }
        
        this.updateGameDisplay();
    }
    
    findMatches() {
        const matches = [];
        
        // Проверяем горизонтали
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize - 2; col++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row][col + 1];
                const gem3 = this.grid[row][col + 2];
                
                if (gem1 && gem2 && gem3 &&
                    gem1.colorIdx === gem2.colorIdx &&
                    gem2.colorIdx === gem3.colorIdx) {
                    
                    // Нашли совпадение
                    for (let i = 0; col + i < this.gridSize; i++) {
                        if (this.grid[row][col + i] && 
                            this.grid[row][col + i].colorIdx === gem1.colorIdx) {
                            matches.push({row, col: col + i});
                        } else {
                            break;
                        }
                    }
                    col += 2; // Пропускаем проверенные
                }
            }
        }
        
        // Проверяем вертикали
        for (let col = 0; col < this.gridSize; col++) {
            for (let row = 0; row < this.gridSize - 2; row++) {
                const gem1 = this.grid[row][col];
                const gem2 = this.grid[row + 1][col];
                const gem3 = this.grid[row + 2][col];
                
                if (gem1 && gem2 && gem3 &&
                    gem1.colorIdx === gem2.colorIdx &&
                    gem2.colorIdx === gem3.colorIdx) {
                    
                    // Нашли совпадение
                    for (let i = 0; row + i < this.gridSize; i++) {
                        if (this.grid[row + i][col] && 
                            this.grid[row + i][col].colorIdx === gem1.colorIdx) {
                            matches.push({row: row + i, col});
                        } else {
                            break;
                        }
                    }
                    row += 2; // Пропускаем проверенные
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
        if (matches.length === 0) return;
        
        // Проверяем комбо
        const currentTime = Date.now();
        if (currentTime - this.lastMatchTime < 2000) {
            this.comboCounter++;
        } else {
            this.comboCounter = 1;
        }
        this.lastMatchTime = currentTime;
        
        // Воспроизводим звуки
        if (this.isSoundOn) {
            playMatchSound();
            playExplosionSound();
        }
        
        // Подсчитываем очки
        const basePoints = matches.length * 100;
        const comboBonus = basePoints * (this.comboCounter - 1) * 0.5;
        const points = Math.floor(basePoints + comboBonus);
        this.score += points;
        
        // Создаем взрывы
        matches.forEach(match => {
            const gem = this.grid[match.row][match.col];
            if (gem) {
                this.createExplosion(
                    gem.x + this.cellSize / 2,
                    gem.y + this.cellSize / 2,
                    gem.colorIdx
                );
            }
        });
        
        // Удаляем совпадения
        const columnsToUpdate = new Set();
        
        matches.forEach(match => {
            columnsToUpdate.add(match.col);
            this.grid[match.row][match.col] = null;
        });
        
        // Обновляем столбцы
        columnsToUpdate.forEach(col => {
            let emptySpaces = 0;
            
            // Двигаем фигуры вниз
            for (let row = this.gridSize - 1; row >= 0; row--) {
                if (!this.grid[row][col]) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    const gem = this.grid[row][col];
                    gem.row += emptySpaces;
                    gem.targetY = this.gridOffsetY + gem.row * this.cellSize;
                    this.grid[row + emptySpaces][col] = gem;
                    this.grid[row][col] = null;
                }
            }
            
            // Создаем новые фигуры сверху
            for (let i = 0; i < emptySpaces; i++) {
                const row = emptySpaces - i - 1;
                const colorIdx = Math.floor(Math.random() * this.colors.length);
                this.grid[row][col] = {
                    row,
                    col,
                    colorIdx,
                    x: this.gridOffsetX + col * this.cellSize,
                    y: this.gridOffsetY - (i + 1) * this.cellSize,
                    targetY: this.gridOffsetY + row * this.cellSize,
                    selected: false,
                    size: this.cellSize - 10,
                    shakeIntensity: 0
                };
            }
        });
        
        this.updateGameDisplay();
    }
    
    checkMatchesAfterAnimation() {
        setTimeout(() => {
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                this.removeMatches(newMatches);
                this.checkMatchesAfterAnimation();
            } else {
                this.isAnimating = false;
                
                // Проверяем конец игры
                if (this.moves <= 0 || this.timeLeft <= 0) {
                    setTimeout(() => {
                        this.showScreen('GAME_OVER');
                    }, 500);
                }
            }
        }, 500);
    }
    
    createExplosion(x, y, colorIdx) {
        const color = this.colors[colorIdx];
        
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x, y,
                color: color,
                size: Math.random() * 4 + 2,
                speedX: Math.random() * 6 - 3,
                speedY: Math.random() * 6 - 3,
                life: 1.0,
                decay: Math.random() * 0.03 + 0.02,
                gravity: 0.1
            });
        }
    }
    
    updateGameDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = Math.floor(this.timeLeft % 60);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Комбо
        if (this.comboCounter > 1) {
            document.getElementById('combo').textContent = `x${this.comboCounter}`;
            document.getElementById('comboDisplay').style.display = 'block';
        } else {
            document.getElementById('comboDisplay').style.display = 'none';
        }
    }
    
    updateScoresDisplay() {
        const scoresList = document.getElementById('scoresList');
        scoresList.innerHTML = '';
        
        this.highScores.forEach((score, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <div class="col-rank">${index + 1}</div>
                <div class="col-name">${score.name}</div>
                <div class="col-score">${score.score}</div>
            `;
            
            // Подсвечиваем текущий результат если он в таблице
            if (this.score > 0 && score.score === this.score) {
                scoreItem.classList.add('highlight');
            }
            
            scoresList.appendChild(scoreItem);
        });
    }
    
    saveScore() {
        const nameInput = document.getElementById('playerName');
        const name = nameInput.value.trim() || 'Игрок';
        
        if (name) {
            this.addHighScore(name, this.score);
            this.showScreen('SCORES');
            nameInput.value = '';
        }
    }
    
    update(deltaTime) {
        if (this.state === 'GAME') {
            this.timeLeft -= deltaTime / 1000;
            if (this.timeLeft < 0) this.timeLeft = 0;
            
            // Проверяем конец игры
            if (this.moves <= 0 || this.timeLeft <= 0) {
                this.showScreen('GAME_OVER');
            }
        }
        
        // Обновляем анимацию фигур
        let gemsMoving = false;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const gem = this.grid[row][col];
                if (gem) {
                    // Плавное движение
                    if (Math.abs(gem.y - gem.targetY) > 0.5) {
                        gem.y += (gem.targetY - gem.y) * 0.3;
                        gemsMoving = true;
                    } else {
                        gem.y = gem.targetY;
                    }
                    
                    // Анимация выбора
                    if (gem.selected) {
                        gem.shakeIntensity = Math.min(3, gem.shakeIntensity + 0.1);
                    } else {
                        gem.shakeIntensity = Math.max(0, gem.shakeIntensity - 0.2);
                    }
                }
            }
        }
        
        // Обновляем частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.speedY += particle.gravity;
            particle.life -= particle.decay;
            particle.size = Math.max(0, particle.size - 0.1);
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw() {
        // Очищаем канвас
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем фон поля
        const gridWidth = this.gridSize * this.cellSize;
        const gridHeight = this.gridSize * this.cellSize;
        
        this.ctx.fillStyle = '#1e222a';
        this.ctx.beginPath();
        this.ctx.roundRect(
            this.gridOffsetX - 10,
            this.gridOffsetY - 10,
            gridWidth + 20,
            gridHeight + 20,
            15
        );
        this.ctx.fill();
        
        // Рисуем сетку
        this.ctx.strokeStyle = '#3c4048';
        this.ctx.lineWidth = 1;
        
        for (let row = 0; row <= this.gridSize; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.gridOffsetX, this.gridOffsetY + row * this.cellSize);
            this.ctx.lineTo(this.gridOffsetX + gridWidth, this.gridOffsetY + row * this.cellSize);
            this.ctx.stroke();
        }
        
        for (let col = 0; col <= this.gridSize; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.gridOffsetX + col * this.cellSize, this.gridOffsetY);
            this.ctx.lineTo(this.gridOffsetX + col * this.cellSize, this.gridOffsetY + gridHeight);
            this.ctx.stroke();
        }
        
        // Рисуем фигуры
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const gem = this.grid[row][col];
                if (gem) {
                    this.drawGem(gem);
                }
            }
        }
        
        // Рисуем частицы
        this.drawParticles();
    }
    
    drawGem(gem) {
        const ctx = this.ctx;
        const color = this.colors[gem.colorIdx];
        
        // Вычисляем позицию с тряской
        let drawX = gem.x;
        let drawY = gem.y;
        
        if (gem.shakeIntensity > 0) {
            const shakeX = (Math.random() - 0.5) * gem.shakeIntensity * 2;
            const shakeY = (Math.random() - 0.5) * gem.shakeIntensity * 2;
            drawX += shakeX;
            drawY += shakeY;
        }
        
        // Свечение если выбрано
        if (gem.selected) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            ctx.beginPath();
            ctx.arc(
                drawX + this.cellSize / 2,
                drawY + this.cellSize / 2,
                gem.size / 2 + 5,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        }
        
        // Тело фигуры
        const padding = (this.cellSize - gem.size) / 2;
        
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.beginPath();
        ctx.roundRect(
            drawX + padding,
            drawY + padding,
            gem.size,
            gem.size,
            10
        );
        ctx.fill();
        
        // Внутреннее свечение
        const innerSize = gem.size - 10;
        const innerPadding = (this.cellSize - innerSize) / 2;
        
        ctx.fillStyle = `rgb(${Math.min(255, color.r + 40)}, 
                           ${Math.min(255, color.g + 40)}, 
                           ${Math.min(255, color.b + 40)})`;
        ctx.beginPath();
        ctx.roundRect(
            drawX + innerPadding,
            drawY + innerPadding,
            innerSize,
            innerSize,
            5
        );
        ctx.fill();
        
        // Блик
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            drawX + innerPadding + innerSize * 0.4,
            drawY + innerPadding + innerSize * 0.4,
            innerSize * 0.15,
            innerSize * 0.15,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }
    
    drawParticles() {
        const ctx = this.ctx;
        
        this.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = `rgb(${particle.color.r}, ${particle.color.g}, ${particle.color.b})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    
    startGameLoop() {
        let lastTime = 0;
        
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            this.update(deltaTime);
            this.draw();
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
}

// Запуск игры
let game;

window.addEventListener('load', () => {
    game = new Game();
    game.showScreen('MENU');
    
    // Для iOS Safari - предотвращаем скроллинг
    document.addEventListener('touchmove', (e) => {
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
        }
    }, { passive: false });
});
