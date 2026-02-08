class MatchThreeGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Состояния игры
        this.STATE = {
            MENU: 'menu',
            PLAYING: 'playing',
            GAME_OVER: 'game_over',
            HIGH_SCORES: 'high_scores',
            HELP: 'help'
        };
        
        this.state = this.STATE.MENU;
        this.grid = [];
        this.selectedGem = null;
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120; // 2 минуты
        this.combo = 1;
        this.lastMatchTime = 0;
        
        // Константы
        this.GRID_SIZE = 8;
        this.CELL_SIZE = 60;
        this.GRID_OFFSET_X = 0;
        this.GRID_OFFSET_Y = 80;
        
        this.COLORS = [
            { r: 255, g: 89, b: 94 },   // Красный
            { r: 255, g: 202, b: 58 },  // Желтый
            { r: 138, g: 201, b: 38 },  // Зеленый
            { r: 25, g: 130, b: 196 },  // Синий
            { r: 106, g: 76, b: 147 },  // Фиолетовый
            { r: 255, g: 157, b: 129 }  // Оранжевый
        ];
        
        // Анимации
        this.explosions = [];
        this.fallingGems = [];
        this.animating = false;
        
        // Звуки
        this.sounds = {
            click: null,
            swap: null,
            match: null,
            explosion: null
        };
        
        // Рекорды
        this.highScores = [];
        
        // Инициализация
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.loadSounds();
        this.loadHighScores();
        this.setupEventListeners();
        this.showScreen('menu');
        
        // Запуск игрового цикла
        this.lastTime = Date.now();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    setupCanvas() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - 80; // Вычитаем высоту панели счета
        
        this.GRID_OFFSET_X = (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2;
        this.GRID_OFFSET_Y = 10;
    }
    
    loadSounds() {
        // Создаем простые звуки программно
        this.sounds.click = this.createBeepSound(800, 0.1);
        this.sounds.swap = this.createBeepSound(600, 0.15);
        this.sounds.match = this.createBeepSound(1200, 0.2);
        this.sounds.explosion = this.createBeepSound(1500, 0.3);
    }
    
    createBeepSound(frequency, duration) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
        
        return { oscillator, gainNode };
    }
    
    playSound(soundName) {
        try {
            if (this.sounds[soundName]) {
                this.createBeepSound(
                    soundName === 'click' ? 800 :
                    soundName === 'swap' ? 600 :
                    soundName === 'match' ? 1200 : 1500,
                    soundName === 'explosion' ? 0.3 : 0.1
                );
            }
        } catch (e) {
            console.log('Звук не воспроизведен:', e);
        }
    }
    
    loadHighScores() {
        try {
            const saved = localStorage.getItem('matchThreeHighScores');
            if (saved) {
                this.highScores = JSON.parse(saved);
            } else {
                // Примерные рекорды по умолчанию
                this.highScores = [
                    { name: 'Игрок 1', score: 1500 },
                    { name: 'Игрок 2', score: 1200 },
                    { name: 'Игрок 3', score: 1000 },
                    { name: 'Игрок 4', score: 800 },
                    { name: 'Игрок 5', score: 600 }
                ];
                this.saveHighScores();
            }
        } catch (e) {
            console.error('Ошибка загрузки рекордов:', e);
            this.highScores = [];
        }
    }
    
    saveHighScores() {
        try {
            localStorage.setItem('matchThreeHighScores', JSON.stringify(this.highScores));
        } catch (e) {
            console.error('Ошибка сохранения рекордов:', e);
        }
    }
    
    addHighScore(name, score) {
        this.highScores.push({ name, score });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10); // Только топ-10
        this.saveHighScores();
    }
    
    setupEventListeners() {
        // Обработка кликов на холсте
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
        
        // Кнопки меню
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('scores-btn').addEventListener('click', () => this.showHighScores());
        document.getElementById('help-btn').addEventListener('click', () => this.showHelp());
        document.getElementById('back-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('help-back-btn').addEventListener('click', () => this.showMenu());
        
        // Кнопки окончания игры
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('save-score-btn').addEventListener('click', () => this.saveScore());
        
        // Ввод имени игрока
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveScore();
            }
        });
        
        // Изменение размера окна
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    handleCanvasClick(e) {
        if (this.state !== this.STATE.PLAYING || this.animating) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Ищем фигуру, по которой кликнули
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const gem = this.grid[row][col];
                if (gem && this.isPointInGem(x, y, gem)) {
                    this.playSound('click');
                    this.handleGemClick(gem);
                    return;
                }
            }
        }
    }
    
    isPointInGem(x, y, gem) {
        const gemX = this.GRID_OFFSET_X + gem.col * this.CELL_SIZE;
        const gemY = this.GRID_OFFSET_Y + gem.row * this.CELL_SIZE;
        
        return x >= gemX && x <= gemX + this.CELL_SIZE &&
               y >= gemY && y <= gemY + this.CELL_SIZE;
    }
    
    handleGemClick(gem) {
        if (this.selectedGem === null) {
            // Выбираем первую фигуру
            this.selectedGem = gem;
            gem.selected = true;
        } else {
            if (gem === this.selectedGem) {
                // Отменяем выбор, если кликнули на ту же фигуру
                this.selectedGem.selected = false;
                this.selectedGem = null;
            } else {
                // Пытаемся поменять фигуры местами
                if (this.areGemsAdjacent(this.selectedGem, gem)) {
                    this.swapGems(this.selectedGem, gem);
                } else {
                    // Выбираем новую фигуру
                    this.selectedGem.selected = false;
                    gem.selected = true;
                    this.selectedGem = gem;
                }
            }
        }
    }
    
    areGemsAdjacent(gem1, gem2) {
        const rowDiff = Math.abs(gem1.row - gem2.row);
        const colDiff = Math.abs(gem1.col - gem2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
    
    swapGems(gem1, gem2) {
        this.animating = true;
        
        // Сохраняем старые позиции для возможной отмены
        const oldPos1 = { row: gem1.row, col: gem1.col };
        const oldPos2 = { row: gem2.row, col: gem2.col };
        
        // Меняем фигуры местами в сетке
        this.grid[gem1.row][gem1.col] = gem2;
        this.grid[gem2.row][gem2.col] = gem1;
        
        // Меняем позиции фигур
        [gem1.row, gem2.row] = [gem2.row, gem1.row];
        [gem1.col, gem2.col] = [gem2.col, gem1.col];
        
        this.playSound('swap');
        this.moves--;
        document.getElementById('moves').textContent = this.moves;
        
        // Проверяем совпадения после обмена
        setTimeout(() => {
            const matches = this.findMatches();
            if (matches.length > 0) {
                this.processMatches(matches);
            } else {
                // Если совпадений нет, возвращаем фигуры на место
                this.swapGems(gem2, gem1);
                this.moves++; // Возвращаем ход
                document.getElementById('moves').textContent = this.moves;
            }
            this.animating = false;
        }, 300);
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
                    
                    // Добавляем все три фигуры
                    matches.add(`${row},${col}`);
                    matches.add(`${row},${col + 1}`);
                    matches.add(`${row},${col + 2}`);
                    
                    // Проверяем дальше вправо
                    for (let k = col + 3; k < this.GRID_SIZE; k++) {
                        const nextGem = this.grid[row][k];
                        if (nextGem && nextGem.colorIdx === gem1.colorIdx) {
                            matches.add(`${row},${k}`);
                        } else {
                            break;
                        }
                    }
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
                    
                    // Проверяем дальше вниз
                    for (let k = row + 3; k < this.GRID_SIZE; k++) {
                        const nextGem = this.grid[k][col];
                        if (nextGem && nextGem.colorIdx === gem1.colorIdx) {
                            matches.add(`${k},${col}`);
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        
        // Преобразуем Set в массив координат
        return Array.from(matches).map(str => {
            const [row, col] = str.split(',').map(Number);
            return { row, col };
        });
    }
    
    processMatches(matches) {
        if (matches.length === 0) return;
        
        // Проверяем комбо
        const currentTime = Date.now();
        if (currentTime - this.lastMatchTime < 2000) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.lastMatchTime = currentTime;
        
        // Показываем комбо
        if (this.combo > 1) {
            const comboDisplay = document.getElementById('combo-display');
            comboDisplay.textContent = `Комбо x${this.combo}!`;
            comboDisplay.classList.add('show');
            setTimeout(() => comboDisplay.classList.remove('show'), 1500);
        }
        
        // Воспроизводим звук
        this.playSound('match');
        this.playSound('explosion');
        
        // Подсчитываем очки
        const basePoints = matches.length * 100;
        const comboBonus = basePoints * (this.combo - 1) * 0.5;
        const totalPoints = Math.floor(basePoints + comboBonus);
        
        this.score += totalPoints;
        document.getElementById('score').textContent = this.score;
        
        // Создаем взрывы
        matches.forEach(match => {
            const gem = this.grid[match.row][match.col];
            if (gem) {
                this.createExplosion(gem);
            }
        });
        
        // Удаляем совпавшие фигуры
        const toRemove = Array(this.GRID_SIZE).fill().map(() => Array(this.GRID_SIZE).fill(false));
        matches.forEach(({ row, col }) => {
            toRemove[row][col] = true;
        });
        
        // Сдвигаем фигуры вниз
        for (let col = 0; col < this.GRID_SIZE; col++) {
            let writeRow = this.GRID_SIZE - 1;
            
            for (let readRow = this.GRID_SIZE - 1; readRow >= 0; readRow--) {
                if (!toRemove[readRow][col]) {
                    if (writeRow !== readRow && this.grid[readRow][col]) {
                        const gem = this.grid[readRow][col];
                        this.grid[writeRow][col] = gem;
                        gem.row = writeRow;
                        this.grid[readRow][col] = null;
                    }
                    writeRow--;
                } else {
                    if (this.grid[readRow][col]) {
                        this.grid[readRow][col] = null;
                    }
                }
            }
            
            // Создаем новые фигуры сверху
            for (let row = writeRow; row >= 0; row--) {
                const colorIdx = Math.floor(Math.random() * this.COLORS.length);
                const gem = new Gem(row, col, colorIdx);
                gem.y = this.GRID_OFFSET_Y - this.CELL_SIZE * (writeRow - row + 1);
                gem.targetY = this.GRID_OFFSET_Y + row * this.CELL_SIZE;
                this.grid[row][col] = gem;
                this.fallingGems.push(gem);
            }
        }
        
        // Проверяем новые совпадения после задержки
        setTimeout(() => {
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                this.processMatches(newMatches);
            } else {
                this.checkGameOver();
            }
        }, 500);
    }
    
    createExplosion(gem) {
        const x = this.GRID_OFFSET_X + gem.col * this.CELL_SIZE + this.CELL_SIZE / 2;
        const y = this.GRID_OFFSET_Y + gem.row * this.CELL_SIZE + this.CELL_SIZE / 2;
        const color = this.COLORS[gem.colorIdx];
        
        this.explosions.push({
            x, y, color,
            particles: Array.from({ length: 20 }, () => ({
                x: 0, y: 0,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                size: Math.random() * 4 + 2
            })),
            life: 1
        });
    }
    
    checkGameOver() {
        if (this.moves <= 0 || this.timeLeft <= 0) {
            this.state = this.STATE.GAME_OVER;
            document.getElementById('final-score').textContent = this.score;
            
            // Проверяем, побили ли рекорд
            const topScore = this.highScores.length > 0 ? this.highScores[0].score : 0;
            const title = document.getElementById('game-over-title');
            if (this.score > topScore) {
                title.textContent = 'НОВЫЙ РЕКОРД!';
                title.style.background = 'linear-gradient(45deg, #ffd700, #ff6b6b)';
            } else {
                title.textContent = 'ИГРА ОКОНЧЕНА';
                title.style.background = 'linear-gradient(45deg, #4a6bff, #ff6b6b)';
            }
            
            this.showScreen('game_over');
        }
    }
    
    showScreen(screenName) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показываем нужный экран
        document.getElementById(screenName).classList.add('active');
        this.state = this.STATE[screenName.toUpperCase()];
        
        // Если показываем таблицу рекордов, обновляем её
        if (screenName === 'high_scores') {
            this.updateScoresTable();
        }
    }
    
    showMenu() {
        this.showScreen('menu');
    }
    
    showHighScores() {
        this.showScreen('high_scores');
    }
    
    showHelp() {
        this.showScreen('help');
    }
    
    updateScoresTable() {
        const scoresList = document.getElementById('scores-list');
        scoresList.innerHTML = '';
        
        this.highScores.forEach((record, index) => {
            const row = document.createElement('div');
            row.className = 'score-row';
            
            row.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="name">${record.name}</span>
                <span class="score">${record.score}</span>
            `;
            
            scoresList.appendChild(row);
        });
    }
    
    saveScore() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput.value.trim();
        
        if (name) {
            this.addHighScore(name, this.score);
            this.showHighScores();
            nameInput.value = '';
        }
    }
    
    startGame() {
        // Сброс игры
        this.grid = Array(this.GRID_SIZE).fill().map(() => Array(this.GRID_SIZE).fill(null));
        this.selectedGem = null;
        this.score = 0;
        this.moves = 30;
        this.timeLeft = 120;
        this.combo = 1;
        this.lastMatchTime = 0;
        this.explosions = [];
        this.fallingGems = [];
        this.animating = false;
        
        // Обновление UI
        document.getElementById('score').textContent = '0';
        document.getElementById('moves').textContent = '30';
        document.getElementById('time').textContent = '02:00';
        
        // Создание сетки
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                // Выбираем случайный цвет, избегая совпадений
                const availableColors = [...Array(this.COLORS.length).keys()];
                
                // Проверяем слева
                if (col >= 2) {
                    const gem1 = this.grid[row][col - 1];
                    const gem2 = this.grid[row][col - 2];
                    if (gem1 && gem2 && gem1.colorIdx === gem2.colorIdx) {
                        const index = availableColors.indexOf(gem1.colorIdx);
                        if (index !== -1) availableColors.splice(index, 1);
                    }
                }
                
                // Проверяем сверху
                if (row >= 2) {
                    const gem1 = this.grid[row - 1][col];
                    const gem2 = this.grid[row - 2][col];
                    if (gem1 && gem2 && gem1.colorIdx === gem2.colorIdx) {
                        const index = availableColors.indexOf(gem1.colorIdx);
                        if (index !== -1) availableColors.splice(index, 1);
                    }
                }
                
                const colorIdx = availableColors[Math.floor(Math.random() * availableColors.length)];
                this.grid[row][col] = new Gem(row, col, colorIdx);
            }
        }
        
        this.showScreen('playing');
    }
    
    gameLoop() {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Обновление времени
        if (this.state === this.STATE.PLAYING) {
            this.timeLeft -= deltaTime;
            if (this.timeLeft < 0) this.timeLeft = 0;
            
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = Math.floor(this.timeLeft % 60);
            document.getElementById('time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            this.checkGameOver();
        }
        
        // Обновление анимаций
        this.updateAnimations(deltaTime);
        
        // Отрисовка
        this.draw();
        
        // Следующий кадр
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateAnimations(deltaTime) {
        // Обновление взрывов
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life -= deltaTime * 2;
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Обновление падающих фигур
        for (let i = this.fallingGems.length - 1; i >= 0; i--) {
            const gem = this.fallingGems[i];
            gem.y += (gem.targetY - gem.y) * 0.3;
            
            if (Math.abs(gem.y - gem.targetY) < 1) {
                gem.y = gem.targetY;
                this.fallingGems.splice(i, 1);
            }
        }
    }
    
    draw() {
        // Очистка холста
        this.ctx.fillStyle = '#1e2129';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем фон сетки
        this.ctx.fillStyle = '#2d3249';
        this.ctx.fillRect(
            this.GRID_OFFSET_X - 10,
            this.GRID_OFFSET_Y - 10,
            this.GRID_SIZE * this.CELL_SIZE + 20,
            this.GRID_SIZE * this.CELL_SIZE + 20
        );
        
        // Рисуем сетку
        this.ctx.strokeStyle = '#4a4f6d';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.GRID_SIZE; i++) {
            // Вертикальные линии
            this.ctx.beginPath();
            this.ctx.moveTo(
                this.GRID_OFFSET_X + i * this.CELL_SIZE,
                this.GRID_OFFSET_Y
            );
            this.ctx.lineTo(
                this.GRID_OFFSET_X + i * this.CELL_SIZE,
                this.GRID_OFFSET_Y + this.GRID_SIZE * this.CELL_SIZE
            );
            this.ctx.stroke();
            
            // Горизонтальные линии
            this.ctx.beginPath();
            this.ctx.moveTo(
                this.GRID_OFFSET_X,
                this.GRID_OFFSET_Y + i * this.CELL_SIZE
            );
            this.ctx.lineTo(
                this.GRID_OFFSET_X + this.GRID_SIZE * this.CELL_SIZE,
                this.GRID_OFFSET_Y + i * this.CELL_SIZE
            );
            this.ctx.stroke();
        }
        
        // Рисуем фигуры
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const gem = this.grid[row][col];
                if (gem) {
                    this.drawGem(gem);
                }
            }
        }
        
        // Рисуем взрывы
        this.drawExplosions();
    }
    
    drawGem(gem) {
        const x = this.GRID_OFFSET_X + gem.col * this.CELL_SIZE + 5;
        const y = (gem.y || (this.GRID_OFFSET_Y + gem.row * this.CELL_SIZE)) + 5;
        const size = this.CELL_SIZE - 10;
        
        const color = this.COLORS[gem.colorIdx];
        
        // Свечение если выбрано
        if (gem.selected) {
            this.ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
            this.ctx.shadowBlur = 20;
        }
        
        // Основная фигура
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.roundRect(x, y, size, size, 10);
        
        // Внутреннее свечение
        this.ctx.fillStyle = `rgb(${Math.min(color.r + 40, 255)}, ${Math.min(color.g + 40, 255)}, ${Math.min(color.b + 40, 255)})`;
        this.roundRect(x + 5, y + 5, size - 10, size - 10, 5);
        
        // Блик
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + size * 0.4, y + size * 0.4,
            size * 0.2, size * 0.2,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Сброс тени
        this.ctx.shadowBlur = 0;
    }
    
    drawExplosions() {
        this.explosions.forEach(explosion => {
            const alpha = explosion.life;
            const radius = 15 * explosion.life;
            
            // Центральное свечение
            this.ctx.fillStyle = `rgba(${explosion.color.r}, ${explosion.color.g}, ${explosion.color.b}, ${alpha * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Частицы
            explosion.particles.forEach(particle => {
                const particleAlpha = alpha * particle.life;
                this.ctx.fillStyle = `rgba(${explosion.color.r}, ${explosion.color.g}, ${explosion.color.b}, ${particleAlpha})`;
                this.ctx.beginPath();
                this.ctx.arc(
                    explosion.x + particle.x,
                    explosion.y + particle.y,
                    particle.size * alpha,
                    0, Math.PI * 2
                );
                this.ctx.fill();
                
                // Обновление частиц
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 0.02;
                particle.vy += 0.2; // Гравитация
            });
        });
    }
    
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
}

class Gem {
    constructor(row, col, colorIdx) {
        this.row = row;
        this.col = col;
        this.colorIdx = colorIdx;
        this.selected = false;
        this.y = null;
        this.targetY = null;
    }
}

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {
    const game = new MatchThreeGame();
    window.game = game; // Для отладки
});

// Предотвращаем контекстное меню на холсте
document.addEventListener('contextmenu', (e) => {
    if (e.target.id === 'game-canvas') {
        e.preventDefault();
    }
});

// Добавление на домашний экран
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Показываем кнопку установки (опционально)
    setTimeout(() => {
        if (confirm('Хотите добавить игру на домашний экран?')) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Игра добавлена на домашний экран');
                }
                deferredPrompt = null;
            });
        }
    }, 3000);
});