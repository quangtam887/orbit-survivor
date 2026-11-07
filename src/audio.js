/**
 * AudioSystem - Trình tổng hợp âm thanh Retro sử dụng Web Audio API thuần
 * Hoạt động 100% không cần tải file âm thanh ngoài, tương thích chuẩn Web & Mobile
 */
class RetroAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.masterVolume = 0.35;
        this.bgmPlaying = false;
        this.bgmInterval = null;
        this.gemPitchIndex = 0;
        this.gemPitchResetTimer = null;
        this.gemPitches = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(mute) {
        this.isMuted = !!mute;
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        }
    }

    toggleMute() {
        this.setMute(!this.isMuted);
        return this.isMuted;
    }

    // Helper: Tạo bộ lọc nhiễu trắng cho hiệu ứng nổ / chém
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

    playTone(freq, type = 'sine', duration = 0.1, targetFreq = null, volume = 0.25) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(freq, now);
        if (targetFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, targetFreq), now + duration);
        }

        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Tiếng bắn súng lục
    shootPistol() {
        this.playTone(550, 'triangle', 0.12, 120, 0.22);
    }

    // Tiếng bắn Shotgun (chùm đạn mạnh mẽ)
    shootShotgun() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        // Âm bass nổ kết hợp nhiễu
        this.playTone(180, 'sawtooth', 0.18, 40, 0.35);

        const noiseBuf = this.createNoiseBuffer(0.15);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            gain.gain.setValueAtTime(0.3 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        }
    }

    // Tiếng súng máy SMG (nhanh, sắc bén)
    shootSMG() {
        this.playTone(720, 'square', 0.07, 180, 0.15);
    }

    // Tiếng tên lửa / Laser
    shootRocket() {
        this.playTone(300, 'sawtooth', 0.25, 80, 0.3);
    }

    // Tiếng vũ khí chém cận chiến
    slash() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        const noiseBuf = this.createNoiseBuffer(0.12);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.12);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25 * this.masterVolume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        }
    }

    // Tiếng quái trúng đạn
    enemyHit() {
        this.playTone(160, 'square', 0.05, 70, 0.12);
    }

    // Tiếng quái bị tiêu diệt (nổ)
    enemyExplode() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        this.playTone(120, 'sawtooth', 0.2, 35, 0.3);

        const noiseBuf = this.createNoiseBuffer(0.22);
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.22);

            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            gain.gain.setValueAtTime(0.28 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        }
    }

    // Tiếng nhặt ngọc EXP / Vàng (chuỗi nốt vui nhộn tăng dần)
    gemPickup() {
        if (this.isMuted) return;
        this.init();
        const freq = this.gemPitches[this.gemPitchIndex % this.gemPitches.length];
        this.playTone(freq, 'sine', 0.1, freq * 1.25, 0.25);

        this.gemPitchIndex++;
        clearTimeout(this.gemPitchResetTimer);
        this.gemPitchResetTimer = setTimeout(() => {
            this.gemPitchIndex = 0;
        }, 900);
    }

    // Tiếng thăng cấp (Level Up Arpeggio)
    levelUp() {
        if (this.isMuted) return;
        this.init();
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
        notes.forEach((f, idx) => {
            setTimeout(() => {
                this.playTone(f, 'triangle', 0.16, f * 1.05, 0.3);
            }, idx * 60);
        });
    }

    // Tiếng người chơi nhận sát thương
    playerHurt() {
        this.playTone(90, 'sawtooth', 0.15, 40, 0.4);
    }

    // Tiếng mua hàng trong Shop
    buy() {
        if (this.isMuted) return;
        this.init();
        this.playTone(987.77, 'sine', 0.08, null, 0.25);
        setTimeout(() => {
            this.playTone(1318.51, 'sine', 0.18, null, 0.3);
        }, 80);
    }

    // Tiếng làm mới Shop (Reroll)
    reroll() {
        this.playTone(440, 'triangle', 0.06, 660, 0.2);
    }

    // Tiếng hoàn thành Wave / Bắt đầu Wave
    waveComplete() {
        if (this.isMuted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.25, null, 0.3), i * 110);
        });
    }

    // Tiếng chiến thắng
    victory() {
        if (this.isMuted) return;
        const chords = [
            [523.25, 659.25, 783.99],
            [587.33, 739.99, 880.00],
            [659.25, 830.61, 987.77],
            [1046.50, 1318.51, 1567.98]
        ];
        chords.forEach((chord, i) => {
            setTimeout(() => {
                chord.forEach(f => this.playTone(f, 'triangle', 0.35, null, 0.25));
            }, i * 220);
        });
    }

    // Tiếng thất bại
    defeat() {
        if (this.isMuted) return;
        const notes = [440, 415.3, 392, 349.23];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.3, f * 0.9, 0.3), i * 180);
        });
    }

    // BGM động Synthwave tạo cảm giác hưng phấn
    startBgm() {
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        let step = 0;
        const bassLine = [110, 110, 130.81, 110, 98, 98, 110, 123.47]; // A2, C3, G2, B2
        const hiHatPattern = [0, 1, 0, 1, 0, 1, 1, 1];

        this.bgmInterval = setInterval(() => {
            if (this.isMuted || !this.bgmPlaying || !this.ctx) return;
            const currentBass = bassLine[step % bassLine.length];
            this.playTone(currentBass, 'triangle', 0.12, currentBass * 0.85, 0.16);

            if (hiHatPattern[step % hiHatPattern.length]) {
                const noiseBuf = this.createNoiseBuffer(0.04);
                if (noiseBuf) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(6000, this.ctx.currentTime);
                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.08 * this.masterVolume, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);
                    noise.start();
                }
            }

            step++;
        }, 180); // ~166 BPM 8th notes
    }

    stopBgm() {
        this.bgmPlaying = false;
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

// Khởi tạo instance toàn cục
window.retroAudio = new RetroAudio();
