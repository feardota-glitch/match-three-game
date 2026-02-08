// Простая система звуков для игры
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.volume = 0.3;
        
        // Попытка инициализации аудио контекста
        this.init();
    }
    
    init() {
        try {
            // Создаем AudioContext (кроссбраузерная версия)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.isInitialized = true;
            
            // Разблокируем аудио на iOS
            if (this.audioContext.state === 'suspended') {
                const unlockAudio = () => {
                    this.audioContext.resume().then(() => {
                        document.body.removeEventListener('touchstart', unlockAudio);
                        document.body.removeEventListener('touchend', unlockAudio);
                        document.body.removeEventListener('click', unlockAudio);
                    });
                };
                
                document.body.addEventListener('touchstart', unlockAudio, false);
                document.body.addEventListener('touchend', unlockAudio, false);
                document.body.addEventListener('click', unlockAudio, false);
            }
        } catch (e) {
            console.warn('Web Audio API не поддерживается:', e);
        }
    }
    
    createBeep(frequency, duration, type = 'sine') {
        if (!this.isInitialized || this.audioContext.state !== 'running') {
            return;
        }
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            // Плавное нарастание и затухание
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
            
            // Очистка через 2 секунды
            setTimeout(() => {
                oscillator.disconnect();
                gainNode.disconnect();
            }, 2000);
            
        } catch (e) {
            console.warn('Ошибка воспроизведения звука:', e);
        }
    }
    
    playClick() {
        this.createBeep(800, 0.1);
    }
    
    playSwap() {
        this.createBeep(600, 0.15);
    }
    
    playMatch() {
        this.createBeep(1200, 0.2);
    }
    
    playExplosion() {
        this.createBeep(1500, 0.3, 'square');
    }
}

// Глобальные функции для воспроизведения звуков
const soundManager = new SoundManager();

function playClickSound() {
    soundManager.playClick();
}

function playSwapSound() {
    soundManager.playSwap();
}

function playMatchSound() {
    soundManager.playMatch();
}

function playExplosionSound() {
    soundManager.playExplosion();
}
