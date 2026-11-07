/**
 * SURVIVOR PLAYABLES - MODULE ÂM THANH (SOUND SYSTEM - KHÓA CỐ ĐỊNH)
 * Trình tổng hợp âm thanh Retro sử dụng Web Audio API thuần
 * Hoạt động 100% không cần tải file âm thanh ngoài, tương thích chuẩn Web & Mobile
 *
 * Kiến trúc tín hiệu:
 *   [Oscillator / Noise] -> [Envelope Gain] -> masterGain -> DynamicsCompressor -> destination
 *
 * - Master Compressor chống vỡ tiếng (clipping) khi 6 vũ khí khai hỏa cùng lúc.
 * - SFX Limiter (cooldown theo từng loại âm thanh) giữ âm thanh tách bạch, trong trẻo.
 * - Random Pitch ±6% (hệ số 0.94 - 1.06) giúp mỗi phát bắn có âm sắc tự nhiên.
 * - Tuân thủ YouTube Playables: mọi hàm phát đều kiểm tra isGlobalMuted trước tiên.
 */

window.SurvivorGame = window.SurvivorGame || {};

// Khoảng cách phát tối thiểu (ms) cho từng loại âm thanh
const SFX_COOLDOWNS = {
    pistol: 75,
    smg: 60,
    shotgun: 110,
    laser: 85,
    katana: 90,
    rocket_launch: 100,
    explosion: 50,
    enemy_hit: 45,
    enemy_death: 50,
    gem_pickup: 35
};

// Chuẩn hóa ID vũ khí (hỗ trợ cả tên gọi khác)
const WEAPON_SFX_ALIASES = {
    pistol: 'pistol',
    smg: 'smg',
    shotgun: 'shotgun',
    laser: 'laser',
    sniper: 'laser',
    rifle: 'laser',
    katana: 'katana',
    blade: 'katana',
    sword: 'katana',
    rocket: 'rocket_launch',
    rocket_launch: 'rocket_launch'
};

class RetroAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.isMuted = false;
        this.isGlobalMuted = false;
        this.masterVolume = 0.35;
        this.bgmPlaying = false;
        this.bgmInterval = null;
        this.gemPitchIndex = 0;
        this.gemPitchResetTimer = null;
        this.gemPitches = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6
        this._lastPlayedTime = {};
        this._noiseBuffer = null;
        this._unlockBound = false;
    }

    // ==========================================
    // KHỞI TẠO & MASTER BUS
    // ==========================================
    init() {
        if (this.isGlobalMuted) return;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this._buildMasterBus();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
            try { this.ctx.resume(); } catch (e) { /* bỏ qua */ }
        }
    }

    // masterGain -> DynamicsCompressor -> destination
    _buildMasterBus() {
        if (!this.ctx) return;
        try {
            if (typeof this.ctx.createGain === 'function') {
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
            }
            if (typeof this.ctx.createDynamicsCompressor === 'function') {
                const comp = this.ctx.createDynamicsCompressor();
                const t = this.ctx.currentTime;
                comp.threshold.setValueAtTime(-18, t);
                comp.knee.setValueAtTime(12, t);
                comp.ratio.setValueAtTime(6, t);
                comp.attack.setValueAtTime(0.003, t);
                comp.release.setValueAtTime(0.15, t);
                this.compressor = comp;
            }
            if (this.masterGain && this.compressor) {
                this.masterGain.connect(this.compressor);
                this.compressor.connect(this.ctx.destination);
            } else if (this.masterGain) {
                this.masterGain.connect(this.ctx.destination);
            }
        } catch (e) {
            this.masterGain = null;
            this.compressor = null;
        }
    }

    // Tự động resume() AudioContext ngay khi người chơi chạm / click / bấm phím
    bindUserGestureUnlock() {
        if (this._unlockBound || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
        this._unlockBound = true;
        const unlock = () => {
            if (this.isGlobalMuted) return;
            this.init();
            if (this._wantBgm && !this.bgmPlaying && !this.isMuted) {
                this.startBgm();
            }
        };
        ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
            window.addEventListener(evt, unlock, { passive: true });
        });
    }

    // Điểm đến của mọi nguồn âm (master bus nếu có)
    _out() {
        return this.masterGain || this.ctx.destination;
    }

    // Nếu có masterGain thì âm lượng tổng đã nằm ở masterGain
    _vol(v) {
        return this.masterGain ? v : v * this.masterVolume;
    }

    _nowMs() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    // SFX Limiter: chặn phát lặp quá dày cho cùng một loại âm thanh
    _canPlay(key) {
        if (this.isGlobalMuted || this.isMuted) return false;
        const cd = SFX_COOLDOWNS[key] || 0;
        const now = this._nowMs();
        const last = this._lastPlayedTime[key];
        if (last !== undefined && now - last < cd) return false;
        this._lastPlayedTime[key] = now;
        return true;
    }

    _ready() {
        if (this.isGlobalMuted || this.isMuted) return false;
        this.init();
        return !!this.ctx;
    }

    // Biến thiên cao độ ngẫu nhiên (0.94 - 1.06)
    _pitch() {
        return 0.94 + Math.random() * 0.12;
    }

    // Oscillator với envelope attack ngắn + exponential decay
    _osc(type, f0, f1, dur, vol, delay = 0) {
        const ctx = this.ctx;
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(10, f0), t);
        if (f1 !== null && f1 !== undefined) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
        }
        gain.gain.setValueAtTime(0.0001, t);
        if (typeof gain.gain.linearRampToValueAtTime === 'function') {
            gain.gain.linearRampToValueAtTime(this._vol(vol), t + 0.003);
        } else {
            gain.gain.setValueAtTime(this._vol(vol), t);
        }
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(this._out());
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    // Bộ đệm nhiễu trắng dùng chung (tạo 1 lần, tiết kiệm CPU / GC)
    _getNoiseBuffer() {
        if (!this.ctx || typeof this.ctx.createBuffer !== 'function') return null;
        if (!this._noiseBuffer) {
            const len = Math.floor(this.ctx.sampleRate * 1.0);
            const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
            this._noiseBuffer = buffer;
        }
        return this._noiseBuffer;
    }

    // Nhiễu trắng qua bộ lọc có quét tần số (freqs: [f0, f1] hoặc [f0, fPeak, f2])
    _noise(dur, filterType, freqs, vol, q = 1, delay = 0) {
        const ctx = this.ctx;
        const buf = this._getNoiseBuffer();
        if (!buf || typeof ctx.createBufferSource !== 'function' || typeof ctx.createBiquadFilter !== 'function') return;
        const t = ctx.currentTime + delay;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(freqs[0], t);
        if (freqs.length === 3) {
            filter.frequency.exponentialRampToValueAtTime(freqs[1], t + dur * 0.45);
            filter.frequency.exponentialRampToValueAtTime(freqs[2], t + dur);
        } else if (freqs.length === 2) {
            filter.frequency.exponentialRampToValueAtTime(freqs[1], t + dur);
        }
        if (filter.Q && typeof filter.Q.setValueAtTime === 'function') {
            filter.Q.setValueAtTime(q, t);
        }
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(this._vol(vol), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this._out());
        const offset = Math.random() * 0.5;
        src.start(t, offset, dur + 0.02);
    }

    // ==========================================
    // TUÂN THỦ YOUTUBE PLAYABLES (MUTE HỆ THỐNG)
    // ==========================================
    syncWithYouTubeAudio() {
        const yt = (typeof ytgame !== 'undefined') ? ytgame : (typeof window !== 'undefined' ? window.ytgame : undefined);
        if (yt && yt.system && typeof yt.system.isAudioEnabled === 'function') {
            const ytEnabled = yt.system.isAudioEnabled();
            this.setGlobalMute(!ytEnabled);
        }
    }

    setGlobalMute(mute) {
        this.isGlobalMuted = Boolean(mute);
        this.isMuted = this.isGlobalMuted;
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        }
        if (this.isGlobalMuted) {
            // Dừng toàn bộ âm thanh và nhạc nền ngay lập tức
            this.pauseBGM?.();
            this.stopBgm?.();
        }
    }

    pauseBGM() {
        this.stopBgm();
    }

    setMute(mute) {
        if (this.isGlobalMuted && !mute) {
            // Không được phép bật lại âm thanh nếu YouTube vẫn đang tắt tiếng
            this.isMuted = true;
            return;
        }
        this.isMuted = !!mute;
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        }
    }

    toggleMute() {
        if (this.isGlobalMuted) {
            this.isMuted = true;
            return true;
        }
        this.setMute(!this.isMuted);
        return this.isMuted;
    }

    // Helper cũ (giữ tương thích): tạo bộ đệm nhiễu trắng theo độ dài
    createNoiseBuffer(duration = 0.2) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Phát 1 nốt đơn (dùng cho BGM, còi báo động, thông báo...)
    playTone(freq, type = 'sine', duration = 0.1, targetFreq = null, volume = 0.25) {
        if (this.isGlobalMuted || this.isMuted) return;
        if (!this._ready()) return;
        this._osc(type, freq, targetFreq, duration, volume);
    }

    // ==========================================
    // 6 ÂM THANH VŨ KHÍ RIÊNG BIỆT
    // ==========================================
    playWeaponFire(weaponId) {
        if (this.isGlobalMuted || this.isMuted) return;
        const key = WEAPON_SFX_ALIASES[String(weaponId || '').toLowerCase()] || 'pistol';
        if (!this._canPlay(key)) return;
        if (!this._ready()) return;
        const p = this._pitch();

        switch (key) {
            case 'pistol':
                // "Pặc" gọn, đanh: Triangle + Square 520 -> 140Hz trong 70ms
                this._osc('triangle', 520 * p, 140 * p, 0.07, 0.22);
                this._osc('square', 520 * p, 140 * p, 0.07, 0.07);
                break;
            case 'smg':
                // Bắn nhanh êm tai: Triangle 680 -> 220Hz trong 45ms, gain 0.12
                this._osc('triangle', 680 * p, 220 * p, 0.045, 0.12);
                break;
            case 'shotgun':
                // "Đoàng" dày: Noise burst bandpass 90ms + sóng trầm 180 -> 55Hz
                this._noise(0.09, 'bandpass', [1600 * p, 350 * p], 0.32, 0.9);
                this._osc('triangle', 180 * p, 55 * p, 0.16, 0.38);
                break;
            case 'laser':
                // "Chíu" xuyên phá: Sawtooth 950 -> 280Hz trong 85ms
                this._osc('sawtooth', 950 * p, 280 * p, 0.085, 0.12);
                this._osc('sine', 1900 * p, 560 * p, 0.05, 0.05);
                break;
            case 'katana':
                // "Xoẹt!" lưỡi kiếm chém gió: Noise bandpass quét 400 -> 1800 -> 600Hz trong 100ms
                this._noise(0.10, 'bandpass', [400 * p, 1800 * p, 600 * p], 0.34, 2.5);
                break;
            case 'rocket_launch':
                // Tiếng đẩy hơi khi phóng: 240 -> 110Hz trong 90ms
                this._osc('triangle', 240 * p, 110 * p, 0.09, 0.2);
                this._noise(0.09, 'lowpass', [1200, 300], 0.08, 0.7);
                break;
        }
    }

    // Tên lửa nổ diện rộng "BÙM": Sub-bass 120 -> 28Hz + Low-pass Noise 220ms
    playExplosion() {
        if (this.isGlobalMuted || this.isMuted) return;
        if (!this._canPlay('explosion')) return;
        if (!this._ready()) return;
        const p = this._pitch();
        this._osc('sine', 120 * p, 28, 0.22, 0.55);
        this._noise(0.22, 'lowpass', [1000 * p, 80], 0.38, 0.8);
    }

    // ==========================================
    // SFX PHẢN HỒI CHIẾN ĐẤU
    // ==========================================
    // "Tạch" rất nhỏ khi đạn găm trúng quái (25ms, gain 0.06, cooldown 45ms)
    playEnemyHit() {
        if (this.isGlobalMuted || this.isMuted) return;
        if (!this._canPlay('enemy_hit')) return;
        if (!this._ready()) return;
        const p = this._pitch();
        this._osc('square', 1300 * p, 700 * p, 0.025, 0.06);
    }

    // "Bụp / Pop" giòn tan khi quái vỡ vụn
    playEnemyDeath() {
        if (this.isGlobalMuted || this.isMuted) return;
        if (!this._canPlay('enemy_death')) return;
        if (!this._ready()) return;
        const p = this._pitch();
        this._osc('triangle', 620 * p, 110 * p, 0.07, 0.2);
        this._noise(0.05, 'bandpass', [2400 * p, 900 * p], 0.1, 1.2);
    }

    // "Ting!" trong trẻo, tăng nhẹ cao độ khi nhặt liên tiếp
    playGemPickup() {
        if (this.isGlobalMuted || this.isMuted) return;
        if (!this._canPlay('gem_pickup')) return;
        if (!this._ready()) return;
        const freq = this.gemPitches[this.gemPitchIndex % this.gemPitches.length];
        this._osc('sine', freq * 1.5, freq * 1.52, 0.09, 0.16);
        this._osc('sine', freq * 3, freq * 3, 0.05, 0.04);

        this.gemPitchIndex++;
        clearTimeout(this.gemPitchResetTimer);
        this.gemPitchResetTimer = setTimeout(() => {
            this.gemPitchIndex = 0;
        }, 900);
    }

    // ==========================================
    // TÊN HÀM CŨ (GIỮ TƯƠNG THÍCH VỚI main.js / shop.js)
    // ==========================================
    shootPistol() { if (this.isGlobalMuted || this.isMuted) return; this.playWeaponFire('pistol'); }
    shootShotgun() { if (this.isGlobalMuted || this.isMuted) return; this.playWeaponFire('shotgun'); }
    shootSMG() { if (this.isGlobalMuted || this.isMuted) return; this.playWeaponFire('smg'); }
    shootLaser() { if (this.isGlobalMuted || this.isMuted) return; this.playWeaponFire('laser'); }
    shootRocket() { if (this.isGlobalMuted || this.isMuted) return; this.playWeaponFire('rocket'); }
    slash() { if (this.isGlobalMuted || this.isMuted) return; this.playWeaponFire('katana'); }
    enemyHit() { if (this.isGlobalMuted || this.isMuted) return; this.playEnemyHit(); }
    enemyExplode() { if (this.isGlobalMuted || this.isMuted) return; this.playEnemyDeath(); }
    gemPickup() { if (this.isGlobalMuted || this.isMuted) return; this.playGemPickup(); }

    // ==========================================
    // ÂM THANH GIAO DIỆN & SỰ KIỆN
    // ==========================================
    // Tiếng thăng cấp (Level Up Arpeggio)
    levelUp() {
        if (this.isGlobalMuted || this.isMuted) return;
        this.init();
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
        notes.forEach((f, idx) => {
            setTimeout(() => {
                if (this.isGlobalMuted || this.isMuted) return;
                this.playTone(f, 'triangle', 0.16, f * 1.05, 0.3);
            }, idx * 60);
        });
    }

    // Tiếng người chơi nhận sát thương
    playerHurt() {
        if (this.isGlobalMuted || this.isMuted) return;
        this.playTone(90, 'sawtooth', 0.15, 40, 0.4);
    }

    // Tiếng hồi máu
    heal() {
        if (this.isGlobalMuted || this.isMuted) return;
        this.playTone(523.25, 'sine', 0.12, 784, 0.25);
    }

    // Tiếng mua hàng trong Shop
    buy() {
        if (this.isGlobalMuted || this.isMuted) return;
        this.init();
        this.playTone(987.77, 'sine', 0.08, null, 0.25);
        setTimeout(() => {
            if (this.isGlobalMuted || this.isMuted) return;
            this.playTone(1318.51, 'sine', 0.18, null, 0.3);
        }, 80);
    }

    // Tiếng làm mới Shop (Reroll)
    reroll() {
        if (this.isGlobalMuted || this.isMuted) return;
        this.playTone(440, 'triangle', 0.06, 660, 0.2);
    }

    // Tiếng hoàn thành Wave / Bắt đầu Wave
    waveComplete() {
        if (this.isGlobalMuted || this.isMuted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
            setTimeout(() => {
                if (this.isGlobalMuted || this.isMuted) return;
                this.playTone(f, 'sine', 0.25, null, 0.3);
            }, i * 110);
        });
    }

    // Tiếng chiến thắng
    victory() {
        if (this.isGlobalMuted || this.isMuted) return;
        const chords = [
            [523.25, 659.25, 783.99],
            [587.33, 739.99, 880.00],
            [659.25, 830.61, 987.77],
            [1046.50, 1318.51, 1567.98]
        ];
        chords.forEach((chord, i) => {
            setTimeout(() => {
                if (this.isGlobalMuted || this.isMuted) return;
                chord.forEach(f => this.playTone(f, 'triangle', 0.35, null, 0.25));
            }, i * 220);
        });
    }

    // Tiếng thất bại
    defeat() {
        if (this.isGlobalMuted || this.isMuted) return;
        const notes = [440, 415.3, 392, 349.23];
        notes.forEach((f, i) => {
            setTimeout(() => {
                if (this.isGlobalMuted || this.isMuted) return;
                this.playTone(f, 'sawtooth', 0.3, f * 0.9, 0.3);
            }, i * 180);
        });
    }

    // ==========================================
    // NHẠC NỀN (BGM)
    // ==========================================
    // BGM động Synthwave tạo cảm giác hưng phấn (âm lượng thấp để nhường chỗ cho tiếng súng)
    startBgm() {
        if (this.isGlobalMuted || this.isMuted) return;
        this._wantBgm = true;
        this.init();
        if (this.bgmPlaying && this.bgmInterval) return;
        this.bgmPlaying = true;
        let step = 0;
        const bassLine = [110, 110, 130.81, 110, 98, 98, 110, 123.47]; // A2, C3, G2, B2
        const hiHatPattern = [0, 1, 0, 1, 0, 1, 1, 1];

        const playStep = () => {
            if (this.isGlobalMuted || this.isMuted || !this.bgmPlaying || !this.ctx) return;
            const currentBass = bassLine[step % bassLine.length];
            this._osc('triangle', currentBass, currentBass * 0.85, 0.12, 0.13);

            if (hiHatPattern[step % hiHatPattern.length]) {
                this._noise(0.04, 'highpass', [6000], 0.06, 0.7);
            }

            step++;
        };

        if (this.ctx && this.ctx.state === 'running') {
            playStep();
        }

        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
        }
        this.bgmInterval = setInterval(playStep, 180); // ~166 BPM 8th notes
        if (this.bgmInterval && typeof this.bgmInterval.unref === 'function') {
            this.bgmInterval.unref();
        }
    }

    startBGM() {
        return this.startBgm();
    }

    stopBgm() {
        this.bgmPlaying = false;
        this._wantBgm = false;
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    stopBGM() {
        return this.stopBgm();
    }
}

// Khởi tạo instance toàn cục
window.SurvivorGame.RetroAudio = RetroAudio;
window.SurvivorGame.audio = new RetroAudio();
window.SurvivorGame.retroAudio = window.SurvivorGame.audio;
window.retroAudio = window.SurvivorGame.audio;

// Tự động resume AudioContext khi người chơi tương tác lần đầu
try {
    window.SurvivorGame.retroAudio.bindUserGestureUnlock();
} catch (e) {
    console.warn('Audio unlock binding error:', e);
}

// Tự động đồng bộ trạng thái âm thanh với YouTube Playables ngay khi khởi tạo
try {
    window.SurvivorGame.retroAudio.syncWithYouTubeAudio();
} catch (e) {
    console.warn('Initial audio sync error:', e);
}
