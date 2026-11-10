/// <reference path="./ytgame.d.ts" />

/**
 * SURVIVOR PLAYABLES - MODULE KHỞI CHẠY TRUNG TÂM (MAIN LAUNCHER & YT SDK)
 * Tích hợp toàn diện YouTube Playables SDK và kết nối toàn bộ hệ thống Scenes Phaser 3
 */

window.SurvivorGame = window.SurvivorGame || {};

// ==========================================
// 1. YOUTUBE PLAYABLES SDK INTEGRATION WRAPPER
// ==========================================
class YouTubePlayablesSDK {
    constructor() {
        this.isSupported = this.isPlayablesEnv();
        this.saveDataKey = 'ORBIT_SURVIVOR_SAVE';
        this.currentActiveScene = null;
        this.cachedData = { highScore: 0, maxWave: 1 };
        this.audioEnabled = true;
        this._firstFrameSent = false;
        this._gameReadySent = false;
        this._isDataLoaded = false;
        this.initEventListeners();
        if (window.SurvivorGame && window.SurvivorGame.retroAudio && typeof window.SurvivorGame.retroAudio.syncWithYouTubeAudio === 'function') {
            window.SurvivorGame.retroAudio.syncWithYouTubeAudio();
        } else if (window.retroAudio && typeof window.retroAudio.syncWithYouTubeAudio === 'function') {
            window.retroAudio.syncWithYouTubeAudio();
        }
    }

    // Kiểm tra xem game có đang chạy trong môi trường YouTube Playables hay không
    isPlayablesEnv() {
        return typeof window !== 'undefined' && !!window.ytgame && window.ytgame.IN_PLAYABLES_ENV === true;
    }

    // 1. Gọi khi DOM tải xong và khung hình đầu tiên được vẽ (BootScene)
    notifyFirstFrameReady() {
        if (this._firstFrameSent) return;
        this._firstFrameSent = true;
        try {
            const yt = (typeof ytgame !== 'undefined') ? ytgame : (typeof window !== 'undefined' ? window.ytgame : undefined);
            if (yt && yt.game && typeof yt.game.firstFrameReady === 'function') {
                yt.game.firstFrameReady();
            }
        } catch (err) {
            console.warn('firstFrameReady warning:', err);
            this.logWarning();
        }
    }

    // 2. Gọi khi Menu chính sẵn sàng nhận tương tác (MenuScene)
    notifyGameReady() {
        if (this._gameReadySent) return;
        // Đảm bảo firstFrameReady luôn được gọi trước gameReady
        if (!this._firstFrameSent) {
            this.notifyFirstFrameReady();
        }
        this._gameReadySent = true;
        try {
            const yt = (typeof ytgame !== 'undefined') ? ytgame : (typeof window !== 'undefined' ? window.ytgame : undefined);
            if (yt && yt.game && typeof yt.game.gameReady === 'function') {
                yt.game.gameReady();
            }
        } catch (err) {
            console.warn('gameReady warning:', err);
            this.logWarning();
        }
    }

    // Tương thích ngược với các lệnh gọi onFirstFrameReady & onGameReady
    onFirstFrameReady() {
        this.notifyFirstFrameReady();
    }

    onGameReady() {
        this.notifyGameReady();
    }

    // Đăng ký scene hiện tại để điều phối Pause/Resume và Audio
    bindScene(scene) {
        this.currentActiveScene = scene;
    }

    // Điều phối trạng thái âm thanh đồng bộ giữa Audio Synth và Phaser Scene
    applyAudioState(enabled) {
        this.audioEnabled = !!enabled;
        const retro = (window.SurvivorGame && window.SurvivorGame.retroAudio) || window.retroAudio;
        if (retro) {
            if (typeof retro.setGlobalMute === 'function') {
                retro.setGlobalMute(!this.audioEnabled);
            }
            if (typeof retro.setMute === 'function') {
                retro.setMute(!this.audioEnabled);
            }
            retro.isMuted = !this.audioEnabled;
        }
        if (this.currentActiveScene && this.currentActiveScene.sound) {
            this.currentActiveScene.sound.mute = !this.audioEnabled;
        }
    }

    // 3. Lắng nghe các sự kiện hệ thống từ YouTube
    initEventListeners() {
        const yt = (typeof ytgame !== 'undefined') ? ytgame : (typeof window !== 'undefined' ? window.ytgame : undefined);
        if (!this.isPlayablesEnv() || !yt || !yt.system) {
            console.log('[YT Playables] SDK không khả dụng trong môi trường này. Kích hoạt chế độ mô phỏng.');
            return;
        }

        try {
            // Truy vấn và thiết lập trạng thái âm thanh ban đầu
            if (typeof yt.system.isAudioEnabled === 'function') {
                try {
                    const initialAudio = yt.system.isAudioEnabled();
                    this.applyAudioState(initialAudio);
                } catch (e) {
                    this.logWarning();
                }
            }

            // 1. Khi YouTube gọi onPause: Tạm dừng toàn bộ vòng lặp, tắt âm thanh và LƯU GAME NGAY LẬP TỤC
            if (typeof yt.system.onPause === 'function') {
                yt.system.onPause(() => {
                    console.log('[YT Playables] System Pause received');
                    // Tạm dừng mọi Scene đang chạy trong Phaser
                    if (window.SurvivorGame && window.SurvivorGame.game && window.SurvivorGame.game.scene && typeof window.SurvivorGame.game.scene.getScenes === 'function') {
                        const activeScenes = window.SurvivorGame.game.scene.getScenes(true);
                        if (Array.isArray(activeScenes)) {
                            activeScenes.forEach(scene => {
                                if (scene && scene.scene && typeof scene.scene.pause === 'function') {
                                    scene.scene.pause();
                                }
                            });
                        }
                    }
                    if (this.currentActiveScene && this.currentActiveScene.scene && typeof this.currentActiveScene.scene.pause === 'function') {
                        this.currentActiveScene.scene.pause();
                    }

                    // Dừng nhạc nền và hiệu ứng âm thanh
                    if (window.SurvivorGame && window.SurvivorGame.retroAudio) {
                        window.SurvivorGame.retroAudio.pauseBGM?.();
                        if (typeof window.SurvivorGame.retroAudio.stopBgm === 'function') {
                            window.SurvivorGame.retroAudio.stopBgm();
                        }
                    } else if (window.retroAudio) {
                        if (typeof window.retroAudio.pauseBGM === 'function') {
                            window.retroAudio.pauseBGM();
                        }
                        if (typeof window.retroAudio.stopBgm === 'function') {
                            window.retroAudio.stopBgm();
                        }
                        window.retroAudio.bgmPlaying = false;
                    }

                    // Bắt buộc gọi lưu tiến trình vào đám mây ngay lập tức
                    if (window.SurvivorGame && window.SurvivorGame.ytSDK && typeof window.SurvivorGame.ytSDK.saveGameData === 'function') {
                        window.SurvivorGame.ytSDK.saveGameData();
                    } else if (typeof this.saveGameData === 'function') {
                        this.saveGameData();
                    }
                    if (typeof this.quickSave === 'function') {
                        this.quickSave();
                    }
                });
            }

            // 2. Khi YouTube gọi onResume: Chỉ tiếp tục thực thi khi có lệnh này
            if (typeof yt.system.onResume === 'function') {
                yt.system.onResume(() => {
                    console.log('[YT Playables] System Resume received');
                    if (window.SurvivorGame && window.SurvivorGame.game && window.SurvivorGame.game.scene && typeof window.SurvivorGame.game.scene.getScenes === 'function') {
                        const currentScenes = window.SurvivorGame.game.scene.getScenes(true);
                        if (Array.isArray(currentScenes)) {
                            currentScenes.forEach(scene => {
                                if (scene && scene.scene) {
                                    if (typeof scene.scene.isPaused === 'function') {
                                        if (scene.scene.isPaused()) {
                                            scene.scene.resume();
                                        }
                                    } else if (typeof scene.scene.resume === 'function') {
                                        scene.scene.resume();
                                    }
                                }
                            });
                        }
                    }
                    if (this.currentActiveScene && this.currentActiveScene.scene && typeof this.currentActiveScene.scene.resume === 'function') {
                        this.currentActiveScene.scene.resume();
                    }

                    // Đồng bộ lại âm thanh theo trạng thái của YouTube
                    if (window.SurvivorGame && window.SurvivorGame.retroAudio) {
                        window.SurvivorGame.retroAudio.syncWithYouTubeAudio?.();
                    } else if (window.retroAudio && typeof window.retroAudio.syncWithYouTubeAudio === 'function') {
                        window.retroAudio.syncWithYouTubeAudio();
                    }
                });
            }

            // Khi bật/tắt âm thanh qua thanh điều khiển YouTube
            if (typeof yt.system.onAudioEnabledChange === 'function') {
                yt.system.onAudioEnabledChange((enabled) => {
                    console.log('[YT Playables] Audio Enabled Change:', enabled);
                    this.applyAudioState(enabled);
                });
            }
        } catch (err) {
            console.error('[YT Playables] Lỗi khởi tạo event listeners:', err);
            this.logWarning();
        }
    }

    // Lưu dữ liệu đám mây (Cloud Save) theo chuẩn ytgame.game.saveData
    async saveData(data) {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }
        // Kiểm tra tính hợp lệ UTF-16 well-formed
        if (typeof data.isWellFormed === 'function' && !data.isWellFormed()) {
            console.warn('[YT Playables] saveData: Chuỗi không đúng định dạng UTF-16');
            this.logWarning();
            return false;
        }
        // Giới hạn dữ liệu < 3 MiB
        if (data.length >= 3 * 1024 * 1024) {
            console.error('[YT Playables] saveData: Dữ liệu vượt quá giới hạn 3 MiB');
            this.logError();
            return false;
        }

        if (this.isPlayablesEnv() && window.ytgame.game && typeof window.ytgame.game.saveData === 'function') {
            try {
                await window.ytgame.game.saveData(data);
                console.log('[YT Playables] Cloud save thành công');
                return true;
            } catch (e) {
                console.warn('[YT Playables] saveData cloud failed:', e);
                this.logWarning();
            }
        }

        // Fallback localStorage
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(this.saveDataKey, data);
                return true;
            }
        } catch (e) {
            console.warn('[YT Playables] localStorage save error:', e);
        }
        return false;
    }

    // Tải dữ liệu đám mây
    async loadData() {
        let result = null;
        if (this.isPlayablesEnv() && window.ytgame.game && typeof window.ytgame.game.loadData === 'function') {
            try {
                const cloudData = await window.ytgame.game.loadData();
                if (cloudData) {
                    result = cloudData;
                }
            } catch (e) {
                console.warn('[YT Playables] loadData cloud failed:', e);
                this.logWarning();
            }
        }

        if (!result) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const localData = window.localStorage.getItem(this.saveDataKey);
                    if (localData) {
                        result = localData;
                    }
                }
            } catch (e) {}
        }

        // Bật khóa xác nhận tải dữ liệu hoàn tất
        this._isDataLoaded = true;
        return result;
    }

    // Lưu dữ liệu game khẩn cấp / đầy đủ (Cloud Save với khóa bảo vệ _isDataLoaded & giới hạn an toàn 64 KiB)
    async saveGameData() {
        if (!this._isDataLoaded) {
            console.warn("Save blocked: loadData() has not finished yet.");
            return;
        }
        try {
            const gps = (window.SurvivorGame && window.SurvivorGame.GlobalPlayerState) 
                ? window.SurvivorGame.GlobalPlayerState 
                : (typeof GlobalPlayerState !== 'undefined' ? GlobalPlayerState : this.cachedData);
            const dataStr = JSON.stringify(gps);

            // 2. Kiểm tra dung lượng an toàn tối đa 64 KiB theo quy định YouTube
            const byteSize = (typeof Blob !== 'undefined') ? new Blob([dataStr]).size : Buffer.byteLength(dataStr, 'utf8');
            if (byteSize > 64 * 1024) {
                console.error("Save failed: Data exceeds 64 KiB limit!");
                return;
            }

            if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV && ytgame.game && typeof ytgame.game.saveData === 'function') {
                await ytgame.game.saveData(dataStr);
            } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem('ORBIT_SURVIVOR_SAVE', dataStr);
            }
        } catch (error) {
            try {
                if (typeof ytgame !== 'undefined' && ytgame.health && typeof ytgame.health.logWarning === 'function') {
                    ytgame.health.logWarning();
                } else {
                    this.logWarning();
                }
            } catch (_) {}
        }
    }

    // Quick save khi hệ thống pause
    quickSave() {
        const gps = (window.SurvivorGame && window.SurvivorGame.GlobalPlayerState) || (typeof GlobalPlayerState !== 'undefined' ? GlobalPlayerState : null);
        if (gps) {
            const currentHigh = (typeof gps.sanitizeScore === 'function') ? gps.sanitizeScore(gps.highScore) : Math.floor(Number(gps.highScore) || 0);
            this.cachedData.highScore = Math.max(this.cachedData.highScore || 0, currentHigh);
            this.cachedData.maxWave = Math.max(this.cachedData.maxWave || 1, Math.floor(Number(gps.currentWave) || 1));
        }

        const payload = JSON.stringify({
            highScore: this.cachedData.highScore || 0,
            maxWave: this.cachedData.maxWave || 1,
            timestamp: Date.now()
        });
        return this.saveData(payload);
    }

    // Lưu tiến trình chơi game & gửi điểm số
    async saveGameProgress(scoreOrHigh, maxWave) {
        const gps = (window.SurvivorGame && window.SurvivorGame.GlobalPlayerState) || (typeof GlobalPlayerState !== 'undefined' ? GlobalPlayerState : null);
        const sanitize = (v) => {
            if (gps && typeof gps.sanitizeScore === 'function') {
                return gps.sanitizeScore(v);
            }
            const num = Math.floor(Number(v) || 0);
            return Math.min(Math.max(0, num), Number.MAX_SAFE_INTEGER);
        };

        const candidateScore = sanitize(scoreOrHigh);
        const currentHigh = gps ? sanitize(gps.highScore) : sanitize(this.cachedData.highScore);
        const resolvedHighScore = Math.max(sanitize(this.cachedData.highScore), candidateScore, currentHigh);

        this.cachedData.highScore = resolvedHighScore;
        this.cachedData.maxWave = Math.max(Math.floor(Number(this.cachedData.maxWave) || 1), Math.floor(Number(maxWave) || 1));

        if (gps) {
            gps.highScore = resolvedHighScore;
        }

        const payload = JSON.stringify({
            highScore: this.cachedData.highScore,
            maxWave: this.cachedData.maxWave,
            timestamp: Date.now()
        });

        await this.saveData(payload);
        // Gửi điểm số cao nhất khớp 100% với saveData và giao diện game theo quy định YouTube
        await this.sendScore(this.cachedData.highScore);
    }

    // Tải tiến trình chơi game
    async loadGameProgress() {
        try {
            const raw = await this.loadData();
            this._isDataLoaded = true;
            if (raw) {
                const parsed = JSON.parse(raw);
                this.cachedData = Object.assign(this.cachedData, parsed);
                const gps = (window.SurvivorGame && window.SurvivorGame.GlobalPlayerState) || (typeof GlobalPlayerState !== 'undefined' ? GlobalPlayerState : null);
                if (gps) {
                    const loadedHigh = Math.floor(Number(this.cachedData.highScore) || 0);
                    gps.highScore = Math.max(gps.highScore || 0, loadedHigh);
                }
            }
        } catch (e) {
            console.warn('[YT Playables] loadGameProgress parse failed:', e);
        }
        this._isDataLoaded = true;
        return this.cachedData;
    }

    // Gửi điểm số lên Leaderboard chuẩn ytgame.engagement.sendScore
    async sendScore(score) {
        let safeIntScore = Math.floor(Number(score) || 0);
        if (safeIntScore < 0) safeIntScore = 0;
        if (score === Infinity || safeIntScore > Number.MAX_SAFE_INTEGER) {
            safeIntScore = Number.MAX_SAFE_INTEGER;
        }

        if (this.isPlayablesEnv() && window.ytgame.engagement && typeof window.ytgame.engagement.sendScore === 'function') {
            try {
                await window.ytgame.engagement.sendScore({ value: safeIntScore });
                console.log('[YT Playables] sendScore sent:', safeIntScore);
            } catch (e) {
                console.warn('[YT Playables] sendScore failed:', e);
                this.logWarning();
            }
        }
    }

    // Báo lỗi hệ thống theo chuẩn (): void
    logError() {
        if (this.isPlayablesEnv() && window.ytgame.health && typeof window.ytgame.health.logError === 'function') {
            try {
                window.ytgame.health.logError();
            } catch (e) {}
        }
    }

    // Báo cảnh báo hệ thống theo chuẩn (): void
    logWarning() {
        if (this.isPlayablesEnv() && window.ytgame.health && typeof window.ytgame.health.logWarning === 'function') {
            try {
                window.ytgame.health.logWarning();
            } catch (e) {}
        }
    }

    // Khởi tạo ngôn ngữ theo chuẩn YouTube Playables SDK (Mặc định Tiếng Anh 'en', chỉ bật 'vi' khi mã ngôn ngữ bắt đầu bằng 'vi')
    async initLanguage() {
        let detectedLang = 'en'; // Mặc định bắt buộc là Tiếng Anh
        try {
            const yt = (typeof ytgame !== 'undefined') ? ytgame : (typeof window !== 'undefined' ? window.ytgame : undefined);
            if (yt && yt.IN_PLAYABLES_ENV && yt.system && typeof yt.system.getLanguage === 'function') {
                const ytLang = await yt.system.getLanguage();
                if (ytLang && typeof ytLang === 'string' && ytLang.toLowerCase().startsWith('vi')) {
                    detectedLang = 'vi';
                }
            }
        } catch (err) {
            console.warn('[YT Playables] Language detection fallback to English');
        }
        if (window.SurvivorGame && window.SurvivorGame.I18N && typeof window.SurvivorGame.I18N.setLanguage === 'function') {
            window.SurvivorGame.I18N.setLanguage(detectedLang);
        }
        return detectedLang;
    }

    // Lấy ngôn ngữ từ hệ thống với fallback "en"
    async getLanguage() {
        const yt = (typeof ytgame !== 'undefined') ? ytgame : (typeof window !== 'undefined' ? window.ytgame : undefined);
        if (this.isPlayablesEnv() && yt && yt.system && typeof yt.system.getLanguage === 'function') {
            try {
                const lang = await yt.system.getLanguage();
                if (lang) return lang;
            } catch (e) {
                console.warn('[YT Playables] getLanguage error:', e);
                this.logWarning();
            }
        }
        return 'en';
    }

    // 5. Quảng cáo xen kẽ giữa màn (Interstitial Ad)
    async showInterstitialAd(onComplete = null) {
        console.log('[YT Playables AD] Requesting Interstitial Ad...');
        const prevAudio = this.audioEnabled;
        this.applyAudioState(false);

        const done = (success) => {
            this.applyAudioState(prevAudio);
            if (onComplete) onComplete(success);
        };

        if (this.isPlayablesEnv() && window.ytgame.ads && typeof window.ytgame.ads.requestInterstitialAd === 'function') {
            try {
                await window.ytgame.ads.requestInterstitialAd();
                done(true);
            } catch (e) {
                console.warn('[YT Playables AD] Interstitial Ad error:', e);
                this.logWarning();
                done(false);
            }
        } else if (this.isPlayablesEnv() && window.ytgame.ads && typeof window.ytgame.ads.showInterstitialAd === 'function') {
            try {
                await window.ytgame.ads.showInterstitialAd();
                done(true);
            } catch (e) {
                done(false);
            }
        } else {
            console.log('[YT Playables AD] Interstitial Ad finished (simulated)');
            done(true);
        }
    }

    // 6. Quảng cáo nhận thưởng (Rewarded Ad) với mã định danh rewardId chuẩn
    async showRewardedAd(onRewarded = null, onFailed = null, rewardId = '') {
        console.log(`[YT Playables AD] Requesting Rewarded Ad for ID: ${rewardId}...`);
        const prevAudio = this.audioEnabled;
        this.applyAudioState(false);

        const success = () => {
            this.applyAudioState(prevAudio);
            if (onRewarded) onRewarded();
        };

        const fail = () => {
            this.applyAudioState(prevAudio);
            if (onFailed) onFailed();
        };

        if (this.isPlayablesEnv() && window.ytgame.ads && typeof window.ytgame.ads.requestRewardedAd === 'function') {
            try {
                const result = await window.ytgame.ads.requestRewardedAd(rewardId);
                if (result === true) {
                    success();
                } else {
                    fail();
                }
            } catch (e) {
                console.warn('[YT Playables AD] Rewarded Ad error:', e);
                this.logWarning();
                fail();
            }
        } else if (this.isPlayablesEnv() && window.ytgame.ads && typeof window.ytgame.ads.showRewardedAd === 'function') {
            try {
                const res = await window.ytgame.ads.showRewardedAd();
                if (res && res.rewarded) {
                    success();
                } else {
                    fail();
                }
            } catch (e) {
                fail();
            }
        } else {
            console.log(`[YT Playables AD] Rewarded Ad finished (simulated) for ID: ${rewardId}`);
            success();
        }
    }
}

// Khởi tạo instance YouTube SDK toàn cục
window.ytSDK = window.ytSDK || new YouTubePlayablesSDK();
window.SurvivorGame.YouTubePlayablesSDK = YouTubePlayablesSDK;
window.SurvivorGame.ytSDK = window.ytSDK;

// ==========================================
// SCENE 1: BOOT & GENERATE PROCEDURAL TEXTURES
// ==========================================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const { width, height } = this.scale;
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x1e293b, 0.8);
        progressBg.fillRoundedRect(width / 2 - 150, height / 2 - 15, 300, 30, 15);

        const progressBar = this.add.graphics();
        this.add.text(width / 2, height / 2 - 45, t('boot.init'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '20px',
            color: '#38bdf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.load.on('progress', (val) => {
            progressBar.clear();
            progressBar.fillStyle(0x38bdf8, 1);
            progressBar.fillRoundedRect(width / 2 - 146, height / 2 - 11, 292 * val, 22, 11);
        });
    }

    create() {
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        // 1. Vẽ giao diện màn hình tải (Loading/Waiting screen) rõ ràng lên Canvas
        if (this.add) {
            const { width, height } = this.scale || { width: 800, height: 600 };

            // Nền tối
            const bg = this.add.graphics();
            bg.fillStyle(0x030712, 1);
            bg.fillRect(0, 0, width, height);

            // Tên game ORBIT SURVIVOR
            this.add.text(width / 2, height / 2 - 40, 'ORBIT SURVIVOR', {
                fontFamily: 'Orbitron, Outfit, sans-serif',
                fontSize: '32px',
                color: '#38bdf8',
                fontStyle: '900'
            }).setOrigin(0.5);

            // Thanh trạng thái loading bar
            const barBg = this.add.graphics();
            barBg.fillStyle(0x1e293b, 1);
            barBg.fillRoundedRect(width / 2 - 150, height / 2 + 10, 300, 16, 8);

            const barFill = this.add.graphics();
            barFill.fillStyle(0x38bdf8, 1);
            barFill.fillRoundedRect(width / 2 - 148, height / 2 + 12, 200, 12, 6);

            // Dòng chữ trạng thái ĐANG TẢI DỮ LIỆU...
            this.add.text(width / 2, height / 2 + 42, t('boot.loading'), {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '14px',
                color: '#94a3b8',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // 2. Sử dụng requestAnimationFrame để gọi firstFrameReady() ngay khi khung hình đầu tiên vừa được kết xuất
        const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
        raf(() => {
            if (window.SurvivorGame && window.SurvivorGame.ytSDK) {
                window.SurvivorGame.ytSDK.notifyFirstFrameReady();
            } else if (window.ytSDK) {
                window.ytSDK.notifyFirstFrameReady();
            }
        });

        // 3. Khởi tạo đồ họa procedural textures
        this.createProceduralTextures();

        // 4. Khởi tạo ngôn ngữ từ YouTube SDK & nạp dữ liệu đám mây (Cloud Save) rồi chuyển sang MenuScene
        const sdk = (window.SurvivorGame && window.SurvivorGame.ytSDK) ? window.SurvivorGame.ytSDK : window.ytSDK;
        const langPromise = (sdk && typeof sdk.initLanguage === 'function') ? sdk.initLanguage().catch(() => 'en') : Promise.resolve('en');
        const dataPromise = (sdk && typeof sdk.loadGameProgress === 'function') ? sdk.loadGameProgress().catch(() => null) : Promise.resolve(null);

        Promise.all([langPromise, dataPromise]).then(() => {
            this.scene.start('MenuScene');
        }).catch(() => {
            this.scene.start('MenuScene');
        });
    }

    createProceduralTextures() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // 1. Player Texture: Chú chibi tròn màu xanh ngọc, viền phát sáng, mắt sinh động
        g.clear();
        g.lineStyle(4, 0x38bdf8, 1);
        g.fillStyle(0x06b6d4, 1);
        g.fillCircle(24, 24, 20);
        g.strokeCircle(24, 24, 20);
        g.fillStyle(0x22d3ee, 1);
        g.fillCircle(21, 20, 15);
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(28, 18, 4);
        g.fillCircle(28, 30, 4);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(29, 17, 1.5);
        g.fillCircle(29, 29, 1.5);
        g.generateTexture('player', 48, 48);

        // 2. Texture các vũ khí (gắn xung quanh nhân vật)
        // Pistol
        g.clear();
        g.fillStyle(0x64748b, 1);
        g.fillRect(8, 6, 16, 8);
        g.fillStyle(0x0284c7, 1);
        g.fillRect(16, 8, 10, 4);
        g.fillStyle(0x334155, 1);
        g.fillRect(6, 12, 6, 8);
        g.generateTexture('wp_pistol', 28, 22);

        // Shotgun
        g.clear();
        g.fillStyle(0xd97706, 1);
        g.fillRect(8, 4, 20, 10);
        g.fillStyle(0x475569, 1);
        g.fillRect(20, 5, 12, 4);
        g.fillRect(20, 9, 12, 4);
        g.generateTexture('wp_shotgun', 34, 20);

        // SMG
        g.clear();
        g.fillStyle(0xeab308, 1);
        g.fillRect(6, 6, 18, 7);
        g.fillStyle(0x1e293b, 1);
        g.fillRect(14, 12, 5, 10);
        g.fillStyle(0xfde047, 1);
        g.fillRect(22, 8, 6, 3);
        g.generateTexture('wp_smg', 30, 24);

        // Laser
        g.clear();
        g.fillStyle(0xa855f7, 1);
        g.fillRect(4, 5, 22, 8);
        g.fillStyle(0xf43f5e, 1);
        g.fillCircle(15, 9, 4);
        g.fillStyle(0xe879f9, 1);
        g.fillRect(22, 7, 10, 4);
        g.generateTexture('wp_laser', 34, 20);

        // Rocket
        g.clear();
        g.fillStyle(0xef4444, 1);
        g.fillRect(4, 4, 22, 12);
        g.fillStyle(0xb91c1c, 1);
        g.fillTriangle(26, 4, 34, 10, 26, 16);
        g.generateTexture('wp_rocket', 36, 20);

        // Katana
        g.clear();
        g.fillStyle(0x10b981, 1);
        g.lineStyle(3, 0x6ee7b7, 1);
        g.beginPath();
        g.moveTo(6, 16);
        g.lineTo(28, 6);
        g.strokePath();
        g.fillStyle(0x064e3b, 1);
        g.fillRect(4, 15, 6, 6);
        g.generateTexture('wp_blade', 32, 24);

        // 3. Texture Quái vật
        // Swarmer
        g.clear();
        g.fillStyle(0xef4444, 1);
        g.fillTriangle(28, 16, 4, 4, 4, 28);
        g.lineStyle(2, 0xfca5a5, 1);
        g.strokeTriangle(28, 16, 4, 4, 4, 28);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(14, 16, 3.5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(15, 16, 1.8);
        g.generateTexture('enemy_swarmer', 32, 32);

        // Tank
        g.clear();
        g.fillStyle(0x881337, 1);
        g.fillRoundedRect(4, 4, 34, 34, 6);
        g.lineStyle(3, 0xf43f5e, 1);
        g.strokeRoundedRect(4, 4, 34, 34, 6);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(14, 18, 4);
        g.fillCircle(28, 18, 4);
        g.fillStyle(0x000000, 1);
        g.fillCircle(15, 18, 2);
        g.fillCircle(27, 18, 2);
        g.generateTexture('enemy_tank', 42, 42);

        // Dasher
        g.clear();
        g.fillStyle(0xf97316, 1);
        g.fillTriangle(18, 2, 34, 18, 2, 18);
        g.fillTriangle(18, 34, 34, 18, 2, 18);
        g.lineStyle(2, 0xfed7aa, 1);
        g.strokeTriangle(18, 2, 34, 18, 2, 18);
        g.strokeTriangle(18, 34, 34, 18, 2, 18);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(18, 18, 3.5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(18, 18, 1.8);
        g.generateTexture('enemy_dasher', 36, 36);

        // Spitter
        g.clear();
        g.fillStyle(0x7c3aed, 1);
        g.fillCircle(18, 18, 16);
        g.lineStyle(3, 0xc4b5fd, 1);
        g.strokeCircle(18, 18, 16);
        g.fillStyle(0x4c1d95, 1);
        g.fillCircle(18, 18, 9);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(18, 18, 4);
        g.generateTexture('enemy_spitter', 36, 36);

        // Boss
        g.clear();
        g.fillStyle(0x450a0a, 1);
        g.fillCircle(40, 40, 36);
        g.lineStyle(5, 0xdc2626, 1);
        g.strokeCircle(40, 40, 36);
        g.fillStyle(0xdc2626, 1);
        g.fillTriangle(20, 20, 10, 2, 32, 14);
        g.fillTriangle(60, 20, 70, 2, 48, 14);
        g.fillStyle(0xfef08a, 1);
        g.fillCircle(28, 38, 7);
        g.fillCircle(52, 38, 7);
        g.fillStyle(0x991b1b, 1);
        g.fillCircle(29, 38, 3.5);
        g.fillCircle(51, 38, 3.5);
        g.generateTexture('enemy_boss', 80, 80);

        // Elite
        g.clear();
        g.lineStyle(4, 0xf59e0b, 0.85);
        g.strokeCircle(32, 32, 28);
        g.fillStyle(0x7f1d1d, 1);
        g.fillCircle(32, 32, 24);
        g.lineStyle(3, 0xfbbf24, 1);
        g.strokeCircle(32, 32, 24);
        g.fillStyle(0xf59e0b, 1);
        g.fillTriangle(32, 2, 25, 14, 39, 14);
        g.fillTriangle(32, 62, 25, 50, 39, 50);
        g.fillTriangle(2, 32, 14, 25, 14, 39);
        g.fillTriangle(62, 32, 50, 25, 50, 39);
        g.fillStyle(0xfde047, 1);
        g.fillCircle(24, 30, 5);
        g.fillCircle(40, 30, 5);
        g.fillStyle(0x991b1b, 1);
        g.fillCircle(24, 30, 2.5);
        g.fillCircle(40, 30, 2.5);
        g.generateTexture('enemy_elite', 64, 64);

        // 4. Texture Đạn
        // Đạn thường
        g.clear();
        g.fillStyle(0x38bdf8, 1);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(7, 7, 3);
        g.generateTexture('bullet_normal', 16, 16);

        // Đạn quái
        g.clear();
        g.fillStyle(0xec4899, 1);
        g.fillCircle(8, 8, 7);
        g.lineStyle(2, 0xf43f5e, 1);
        g.strokeCircle(8, 8, 7);
        g.generateTexture('bullet_enemy', 16, 16);

        // Đạn tên lửa
        g.clear();
        g.fillStyle(0xef4444, 1);
        g.fillCircle(9, 9, 8);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(7, 7, 4);
        g.generateTexture('bullet_rocket', 18, 18);

        // Hiệu ứng nổ shockwave
        g.clear();
        g.lineStyle(4, 0xf97316, 1);
        g.strokeCircle(32, 32, 30);
        g.fillStyle(0xfef08a, 0.4);
        g.fillCircle(32, 32, 28);
        g.generateTexture('shockwave', 64, 64);

        // 5. Texture Ngọc EXP & Vàng
        // EXP Gem
        g.clear();
        g.fillStyle(0x10b981, 1);
        g.fillTriangle(10, 2, 18, 10, 10, 18);
        g.fillTriangle(10, 2, 2, 10, 10, 18);
        g.fillStyle(0x6ee7b7, 1);
        g.fillCircle(10, 10, 3);
        g.generateTexture('gem_exp', 20, 20);

        // Gold Gem
        g.clear();
        g.fillStyle(0xf59e0b, 1);
        g.fillCircle(10, 10, 9);
        g.lineStyle(2, 0xfde68a, 1);
        g.strokeCircle(10, 10, 8);
        g.fillStyle(0xfef08a, 1);
        g.fillCircle(8, 8, 3);
        g.generateTexture('gem_gold', 20, 20);

        // 6. Texture Hạt vỡ Particle
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);

        // 7. Grid ô gạch Arena sàn đấu
        g.clear();
        g.fillStyle(0x0b1120, 1);
        g.fillRect(0, 0, 64, 64);
        g.lineStyle(1, 0x1e293b, 0.6);
        g.strokeRect(0, 0, 64, 64);
        g.fillStyle(0x334155, 0.4);
        g.fillRect(30, 30, 4, 4);
        g.generateTexture('tile_floor', 64, 64);

        // 8. Virtual Joystick Textures
        g.clear();
        g.lineStyle(4, 0x38bdf8, 0.5);
        g.fillStyle(0x0f172a, 0.45);
        g.fillCircle(64, 64, 60);
        g.strokeCircle(64, 64, 60);
        g.generateTexture('joystick_base', 128, 128);

        g.clear();
        g.fillStyle(0x38bdf8, 0.85);
        g.fillCircle(30, 30, 26);
        g.lineStyle(3, 0xffffff, 0.9);
        g.strokeCircle(30, 30, 26);
        g.generateTexture('joystick_knob', 60, 60);

        g.destroy();
    }
}

// ==========================================
// SCENE 2: MENU SCENE
// ==========================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        window.ytSDK.bindScene(this);

        this._isStarting = false;

        // Xóa sạch mọi modal overlay còn sót lại để không chắn chuột
        if (window.SurvivorGame.SkillModalSystem && typeof window.SurvivorGame.SkillModalSystem.cleanModal === 'function') {
            window.SurvivorGame.SkillModalSystem.cleanModal();
        } else {
            const existingOverlay = document.getElementById('skill-modal-overlay');
            if (existingOverlay) {
                existingOverlay.style.setProperty('display', 'none', 'important');
                existingOverlay.style.setProperty('pointer-events', 'none', 'important');
                existingOverlay.remove();
            }
        }

        const { width, height } = this.scale;

        // Phát nhạc nền ngay lập tức nếu AudioContext đã được mở khóa
        const menuAudio = (window.SurvivorGame && window.SurvivorGame.retroAudio) || window.retroAudio;
        if (menuAudio) {
            menuAudio._wantBgm = true;
            if (menuAudio.ctx && menuAudio.ctx.state === 'running' && !menuAudio.isGlobalMuted && !menuAudio.isMuted) {
                menuAudio.startBGM?.() || menuAudio.startBgm?.();
            }
        }

        // Lắng nghe cú chạm/click hoặc di chuyển đầu tiên trên MenuScene để resume() AudioContext và phát nhạc nền ngay
        const unlockAndStartMenuBgm = () => {
            const audio = (window.SurvivorGame && window.SurvivorGame.retroAudio) || window.retroAudio;
            if (!audio || audio.isGlobalMuted || audio.isMuted) return;
            audio.init?.();
            if (audio.ctx && audio.ctx.state === 'suspended' && typeof audio.ctx.resume === 'function') {
                try { audio.ctx.resume(); } catch (e) { /* bỏ qua */ }
            }
            audio.startBGM?.() || audio.startBgm?.();
        };
        if (this.input && typeof this.input.once === 'function') {
            this.input.once('pointerdown', unlockAndStartMenuBgm);
            this.input.once('pointermove', unlockAndStartMenuBgm);
        }

        // Background Gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0b1329, 0x0b1329, 0x030712, 0x030712, 1);
        bg.fillRect(0, 0, width, height);

        // Tiêu đề Game chính thức
        const titleText = this.add.text(width / 2, height * 0.14, 'ORBIT SURVIVOR', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '44px',
            color: '#38bdf8',
            fontStyle: '900',
            stroke: '#0369a1',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.tweens.add({
            targets: titleText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);

        this.add.text(width / 2, height * 0.22, t('menu.subtitle'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#facc15',
            letterSpacing: 3,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Hero Preview Avatar ở giữa màn hình xoay vòng 6 vũ khí
        const avatarContainer = this.add.container(width / 2, height * 0.40);
        const hero = this.add.sprite(0, 0, 'player').setScale(1.6);
        avatarContainer.add(hero);

        const weaponSprites = [];
        const wpKeys = ['wp_pistol', 'wp_shotgun', 'wp_smg', 'wp_laser', 'wp_rocket', 'wp_blade'];
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const dist = 60;
            const wp = this.add.sprite(Math.cos(angle) * dist, Math.sin(angle) * dist, wpKeys[i]).setScale(1.2);
            weaponSprites.push({ sprite: wp, baseAngle: angle });
            avatarContainer.add(wp);
        }

        this.tweens.addCounter({
            from: 0,
            to: Math.PI * 2,
            duration: 4000,
            repeat: -1,
            onUpdate: (tw) => {
                const cur = tw.getValue();
                weaponSprites.forEach(item => {
                    const ang = item.baseAngle + cur;
                    item.sprite.setPosition(Math.cos(ang) * 60, Math.sin(ang) * 60);
                    item.sprite.setRotation(ang);
                });
            }
        });

        // Hiển thị Kỷ lục High Score & Max Wave đã đạt
        const recordBox = this.add.graphics();
        recordBox.fillStyle(0x1e293b, 0.75);
        recordBox.lineStyle(2, 0x334155, 1);
        recordBox.fillRoundedRect(width / 2 - 200, height * 0.57, 400, 48, 10);
        recordBox.strokeRoundedRect(width / 2 - 200, height * 0.57, 400, 48, 10);

        const rec = window.ytSDK.cachedData;
        const displayHighScore = Math.max(rec.highScore || 0, GlobalPlayerState.highScore || 0);
        this.add.text(width / 2, height * 0.61, t('menu.record', { score: displayHighScore, level: rec.maxWave || 1, max: GAME_CONFIG.MAX_WAVES }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '15px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Nút BẮT ĐẦU CHIẾN ĐẤU (PLAY BUTTON) - DUY NHẤT TRÊN PHASER CANVAS
        const btnY = height * 0.74;
        const playBtn = this.add.container(width / 2, btnY);

        const btnW = 280;
        const btnH = 56;
        const btnRadius = 28;

        const btnG = this.add.graphics();
        btnG.fillStyle(0x0284c7, 1);
        btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
        btnG.lineStyle(3, 0x38bdf8, 1);
        btnG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);

        const playText = this.add.text(0, 0, t('menu.play_btn'), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        playBtn.add([btnG, playText]);
        playBtn.setSize(btnW, btnH);

        // Mở rộng và bao phủ Clickbox (Hit area với padding mở rộng để chạm/click dễ dàng, không bị bấm trượt)
        const hitPadding = 16;
        const hitRect = new Phaser.Geom.Rectangle(
            -(btnW / 2) - hitPadding,
            -(btnH / 2) - hitPadding,
            btnW + (hitPadding * 2),
            btnH + (hitPadding * 2)
        );
        playBtn.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
        if (playBtn.input) {
            playBtn.input.cursor = 'pointer';
        }

        // Đặt con trỏ chuột thành hình bàn tay khi rê vào nút và hiệu ứng Hover
        playBtn.on('pointerover', () => {
            if (this.input && this.input.manager && typeof this.input.manager.setDefaultCursor === 'function') {
                this.input.manager.setDefaultCursor('pointer');
            }
            btnG.clear();
            btnG.fillStyle(0x0ea5e9, 1);
            btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
            btnG.lineStyle(4, 0xbae6fd, 1);
            btnG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
            if (typeof playBtn.setScale === 'function') playBtn.setScale(1.04);
        });

        playBtn.on('pointerout', () => {
            if (this.input && this.input.manager && typeof this.input.manager.setDefaultCursor === 'function') {
                this.input.manager.setDefaultCursor('default');
            }
            btnG.clear();
            btnG.fillStyle(0x0284c7, 1);
            btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
            btnG.lineStyle(3, 0x38bdf8, 1);
            btnG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
            if (typeof playBtn.setScale === 'function') playBtn.setScale(1.0);
        });

        // Đảm bảo nút DOM HTML ẩn hoàn toàn khỏi màn hình để không đè lên Phaser Button
        const htmlStartBtn = (typeof document !== 'undefined') ? document.getElementById('start-game-btn') : null;
        if (htmlStartBtn) {
            htmlStartBtn.style.display = 'none';
        }

        const startGameNow = () => {
            if (this._isStarting) return;
            this._isStarting = true;

            if (this.input && this.input.manager && typeof this.input.manager.setDefaultCursor === 'function') {
                this.input.manager.setDefaultCursor('default');
            }

            if (htmlStartBtn) {
                htmlStartBtn.style.display = 'none';
            }

            try {
                if (window.SurvivorGame.GlobalPlayerState && typeof window.SurvivorGame.GlobalPlayerState.reset === 'function') {
                    window.SurvivorGame.GlobalPlayerState.reset();
                } else if (typeof GlobalPlayerState !== 'undefined' && typeof GlobalPlayerState.reset === 'function') {
                    GlobalPlayerState.reset();
                }
                if (window.SurvivorGame.retroAudio) {
                    window.SurvivorGame.retroAudio.init?.();
                    window.SurvivorGame.retroAudio.startBGM?.() || window.SurvivorGame.retroAudio.startBgm?.();
                } else if (typeof window.retroAudio !== 'undefined') {
                    window.retroAudio.init?.();
                    window.retroAudio.startBGM?.() || window.retroAudio.startBgm?.();
                }
            } catch (err) {
                console.warn("Audio/State init warning:", err);
            }
            this.scene.start('GameScene');
        };

        if (htmlStartBtn) {
            htmlStartBtn.onclick = (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                startGameNow();
            };
        }

        playBtn.on('pointerdown', () => {
            if (typeof playBtn.setScale === 'function') playBtn.setScale(0.96);
            startGameNow();
        });

        // Hỗ trợ phím SPACE và ENTER để vào thẳng GameScene
        if (this.input && this.input.keyboard) {
            const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
            spaceKey.once('down', startGameNow);
            enterKey.once('down', startGameNow);
        }

        // Tự động khôi phục con trỏ và ẩn nút HTML khi Scene đóng lại
        this.events.once('shutdown', () => {
            if (this.input && this.input.manager && typeof this.input.manager.setDefaultCursor === 'function') {
                this.input.manager.setDefaultCursor('default');
            }
            if (htmlStartBtn) htmlStartBtn.style.display = 'none';
        });

        // Hướng dẫn điều khiển ngắn gọn
        this.add.text(width / 2, height * 0.86, t('menu.guide_controls'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#64748b'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.91, t('menu.guide_gameplay'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        // Báo gameReady() sau 50ms khi nút bấm tương tác đã hiển thị hoàn tất trên màn hình
        if (this.time && typeof this.time.delayedCall === 'function') {
            this.time.delayedCall(50, () => {
                if (window.SurvivorGame && window.SurvivorGame.ytSDK) {
                    window.SurvivorGame.ytSDK.notifyGameReady();
                } else if (window.ytSDK) {
                    window.ytSDK.notifyGameReady();
                }
            });
        } else {
            setTimeout(() => {
                if (window.SurvivorGame && window.SurvivorGame.ytSDK) {
                    window.SurvivorGame.ytSDK.notifyGameReady();
                } else if (window.ytSDK) {
                    window.ytSDK.notifyGameReady();
                }
            }, 50);
        }
    }
}

// ==========================================
// SCENE 3: GAME SCENE (VÒNG CHIẾN ĐẤU 3 PHÚT)
// ==========================================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        try {
            window.ytSDK.bindScene(this);
            try {
                if (window.SurvivorGame && window.SurvivorGame.retroAudio) {
                    window.SurvivorGame.retroAudio.startBGM?.() || window.SurvivorGame.retroAudio.startBgm?.();
                } else if (window.retroAudio) {
                    window.retroAudio.startBGM?.() || window.retroAudio.startBgm?.();
                }
            } catch (aErr) {
                console.warn("Audio start warning:", aErr);
            }

            this.waveTimer = GAME_CONFIG.WAVE_DURATION;
            this.elapsedTime = 0;
            this.isWaveOver = false;
            this.isGameRunning = true;
            this.isIntermission = false;
            this.isRoundPaused = false;
            this.isRoundActive = true;
            this.currentSkillModal = null;

            if (window.SurvivorGame.SkillModalSystem && typeof window.SurvivorGame.SkillModalSystem.cleanModal === 'function') {
                window.SurvivorGame.SkillModalSystem.cleanModal();
            } else {
                const oldModal = document.getElementById("skill-modal-overlay");
                if (oldModal) oldModal.remove();
            }

            this.pendingSkillPicks = GlobalPlayerState.pendingSkillPicks || 0;
            GlobalPlayerState.hp = GlobalPlayerState.maxHp;
            GlobalPlayerState.roundGold = 0;
            this.spawnTimer = 0;
            this.spawnInterval = 900;
            const curLvl = GlobalPlayerState.currentWave || 1;
            const lvlOffset = Math.max(0, curLvl - 1);
            this.maxActiveEnemies = Math.floor(6 + lvlOffset * 1);
            this.currentPhase = 1;
            this.phase3SpecialSpawned = false;
            this.isClimaxMode = false;

            // Anti-Camping
            this.lastMovePosition = { x: 0, y: 0 };
            this.idleTimer = 0;
            this.isBerserkMode = false;
            this.berserkOrigin = { x: 0, y: 0 };
            this.lastWarnBeepTime = 0;
            this.lastSirenTime = 0;

            // Physics Bounds
            this.physics.world.setBounds(0, 0, GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT);

            // Nền Arena
            this.add.tileSprite(
                GAME_CONFIG.ARENA_WIDTH / 2,
                GAME_CONFIG.ARENA_HEIGHT / 2,
                GAME_CONFIG.ARENA_WIDTH,
                GAME_CONFIG.ARENA_HEIGHT,
                'tile_floor'
            );

            // Viền Neon
            const border = this.add.graphics();
            border.lineStyle(8, 0xef4444, 0.85);
            border.strokeRect(10, 10, GAME_CONFIG.ARENA_WIDTH - 20, GAME_CONFIG.ARENA_HEIGHT - 20);
            border.lineStyle(2, 0xfca5a5, 0.9);
            border.strokeRect(14, 14, GAME_CONFIG.ARENA_WIDTH - 28, GAME_CONFIG.ARENA_HEIGHT - 28);

            // Player
            this.player = this.physics.add.sprite(
                GAME_CONFIG.ARENA_WIDTH / 2,
                GAME_CONFIG.ARENA_HEIGHT / 2,
                'player'
            );
            this.player.setCollideWorldBounds(true);
            this.player.body.setCircle(20);
            this.player.setDepth(20);
            this.lastMovePosition = { x: this.player.x, y: this.player.y };

            // Khởi tạo PlayerSystem và EnemySystem an toàn (hỗ trợ cả class instance lẫn static)
            try {
                if (typeof window.SurvivorGame.PlayerSystem === 'function') {
                    this.playerSystem = new window.SurvivorGame.PlayerSystem(this);
                }
                if (typeof window.SurvivorGame.EnemySystem === 'function') {
                    this.enemySystem = new window.SurvivorGame.EnemySystem(this, this.playerSystem);
                }
            } catch (sysErr) {
                console.warn("System instantiate warning:", sysErr);
            }

            // Weapon Orbitals
            this.weaponSprites = [];
            this.rebuildWeaponOrbitals();

            // Object Pools
            const BulletClass = window.SurvivorGame.Bullet || Bullet;
            const EnemyClass = window.SurvivorGame.Enemy || Enemy;
            const GemClass = window.SurvivorGame.Gem || Gem;

            this.bulletPool = this.physics.add.group({
                classType: BulletClass,
                maxSize: 350,
                runChildUpdate: true
            });

            this.enemyBulletPool = this.physics.add.group({
                classType: BulletClass,
                maxSize: 100,
                runChildUpdate: true
            });

            this.enemyPool = this.physics.add.group({
                classType: EnemyClass,
                maxSize: 600,
                runChildUpdate: false
            });
            this.enemies = this.enemyPool;

            this.gemPool = this.physics.add.group({
                classType: GemClass,
                maxSize: 800,
                runChildUpdate: false
            });

            this.particles = this.add.particles(0, 0, 'particle', {
                speed: { min: 60, max: 220 },
                scale: { start: 1.2, end: 0 },
                lifespan: 350,
                blendMode: 'ADD',
                emitting: false
            }).setDepth(15);

            // Camera
            this.cameras.main.setBounds(0, 0, GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT);
            this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

            // Controls (Gọi an toàn qua instance hoặc static)
            if (this.playerSystem && typeof this.playerSystem.setupControls === 'function') {
                this.playerSystem.setupControls();
            } else if (window.SurvivorGame.PlayerSystem && typeof window.SurvivorGame.PlayerSystem.setupControls === 'function') {
                window.SurvivorGame.PlayerSystem.setupControls(this);
            }

            if (this.playerSystem && typeof this.playerSystem.setupVirtualJoystick === 'function') {
                this.playerSystem.setupVirtualJoystick();
            } else if (window.SurvivorGame.PlayerSystem && typeof window.SurvivorGame.PlayerSystem.setupVirtualJoystick === 'function') {
                window.SurvivorGame.PlayerSystem.setupVirtualJoystick(this);
            }

            // HUD
            this.createHUD();

            // Overlaps
            this.physics.add.overlap(this.bulletPool, this.enemyPool, this.handleBulletHitEnemy, null, this);
            this.physics.add.overlap(this.player, this.enemyPool, this.handleEnemyTouchPlayer, null, this);
            this.physics.add.overlap(this.player, this.enemyBulletPool, this.handleEnemyBulletHitPlayer, null, this);
            this.physics.add.overlap(this.player, this.gemPool, this.handlePlayerCollectGem, null, this);

            // Wave Timer 1s tick
            this.time.addEvent({
                delay: 1000,
                callback: this.onSecondTick,
                callbackScope: this,
                loop: true
            });

            // Khóa hpRegen = 0 (không tự động hồi máu theo giây trong trận, chỉ hồi 100% máu khi qua vòng)
            GlobalPlayerState.hpRegen = 0;
            if (this.player) this.player.hpRegen = 0;
        } catch (e) {
            console.error("GameScene Create Error:", e);
        }
    }

    // Delegated player methods
    rebuildWeaponOrbitals() {
        window.SurvivorGame.PlayerSystem.rebuildWeaponOrbitals(this);
    }

    setupVirtualJoystick() {
        window.SurvivorGame.PlayerSystem.setupVirtualJoystick(this);
    }

    updateOrbitingWeapons(delta) {
        window.SurvivorGame.PlayerSystem.updateOrbitingWeapons(this, delta);
    }

    fireWeapon(item, wx, wy, aimAngle, target) {
        window.SurvivorGame.PlayerSystem.fireWeapon(this, item, wx, wy, aimAngle, target);
    }

    performMeleeSlash(x, y, angle, range, dmg, knockback, isCrit) {
        window.SurvivorGame.PlayerSystem.performMeleeSlash(this, x, y, angle, range, dmg, knockback, isCrit);
    }

    createExplosionAoE(x, y, radius, damage) {
        window.SurvivorGame.PlayerSystem.createExplosionAoE(this, x, y, radius, damage);
    }

    // Delegated enemy methods
    getActiveEnemyCount() {
        return window.SurvivorGame.EnemySystem.getActiveEnemyCount(this);
    }

    triggerBerserkMode() {
        window.SurvivorGame.EnemySystem.triggerBerserkMode(this);
    }

    endBerserkMode() {
        window.SurvivorGame.EnemySystem.endBerserkMode(this);
    }

    spawnEnemyCluster() {
        window.SurvivorGame.EnemySystem.spawnEnemyCluster(this);
    }

    spawnEnemy(x, y, tier, options = {}) {
        return window.SurvivorGame.EnemySystem.spawnEnemy(this, x, y, tier, options);
    }

    spawnSingleEnemy() {
        return this.spawnEnemy();
    }

    spawnPhase3Special() {
        window.SurvivorGame.EnemySystem.spawnPhase3Special(this);
    }

    updateEnemies(delta) {
        window.SurvivorGame.EnemySystem.updateEnemies(this, delta);
    }

    fireEnemyBullet(x, y, angle) {
        window.SurvivorGame.EnemySystem.fireEnemyBullet(this, x, y, angle);
    }

    updateGemAttraction(delta) {
        window.SurvivorGame.EnemySystem.updateGemAttraction(this, delta);
    }

    onEnemyKilled(enemy) {
        window.SurvivorGame.EnemySystem.onEnemyKilled(this, enemy);
    }

    // HUD Creation
    createHUD() {
        const { width, height } = this.scale;
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);

        this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(90);

        const topBar = this.add.graphics();
        topBar.fillStyle(0x020617, 0.88);
        topBar.fillRect(0, 0, width, 72);
        topBar.lineStyle(2, 0x1e293b, 1);
        topBar.strokeLineShape(new Phaser.Geom.Line(0, 72, width, 72));
        this.hudContainer.add(topBar);

        this.waveTitleText = this.add.text(width / 2, 16, t('hud.level_title', { level: GlobalPlayerState.currentWave, max: GAME_CONFIG.MAX_WAVES }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '15px',
            color: '#38bdf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const mins = Math.floor(this.waveTimer / 60);
        const secs = this.waveTimer % 60;
        this.timerText = this.add.text(width / 2, 38, `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`, {
            fontFamily: 'Orbitron, Outfit, monospace',
            fontSize: '24px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.enemyCapText = this.add.text(width / 2, 58, t('hud.enemies', { count: 0, max: this.maxActiveEnemies }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '11px',
            color: '#94a3b8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.idleWarnText = this.add.text(width / 2, height * 0.40, '', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#facc15',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(250).setVisible(false);

        this.berserkBanner = this.add.text(width / 2, 105, '', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#ff2222',
            fontStyle: '900',
            stroke: '#7f1d1d',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(260).setVisible(false);

        this.hudContainer.add([this.waveTitleText, this.timerText, this.enemyCapText, this.idleWarnText, this.berserkBanner]);

        // HP Bar
        this.hpBarGraphics = this.add.graphics();
        this.hudContainer.add(this.hpBarGraphics);
        this.hpText = this.add.text(20, 38, '', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        this.hudContainer.add(this.hpText);
        this.updateHpBar();

        // Tiền Vàng & Cấp Độ
        this.goldText = this.add.text(width - 20, 16, `💰 ${GlobalPlayerState.gold}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '17px',
            color: '#fbbf24',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        this.levelText = this.add.text(width - 20, 38, t('hud.player_level', { level: GlobalPlayerState.level }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#a855f7',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        this.pendingBadge = this.add.text(width - 20, 56, t('hud.pending_cards', { count: this.pendingSkillPicks }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(1, 0);
        this.pendingBadge.setVisible(this.pendingSkillPicks > 0);

        this.hudContainer.add([this.goldText, this.levelText, this.pendingBadge]);

        // EXP Bar
        this.expBarGraphics = this.add.graphics();
        this.hudContainer.add(this.expBarGraphics);
        this.updateExpBar();
    }

    updateHpBar() {
        const hp = Math.max(0, GlobalPlayerState.hp);
        const max = GlobalPlayerState.maxHp;
        const pct = Phaser.Math.Clamp(hp / max, 0, 1);

        this.hpBarGraphics.clear();
        this.hpBarGraphics.fillStyle(0x334155, 0.9);
        this.hpBarGraphics.fillRoundedRect(18, 14, 160, 20, 5);
        const barColor = pct > 0.35 ? 0xef4444 : 0xb91c1c;
        this.hpBarGraphics.fillStyle(barColor, 1);
        this.hpBarGraphics.fillRoundedRect(20, 16, 156 * pct, 16, 4);

        if (this.hpText) {
            this.hpText.setText(`❤️ ${Math.round(hp)} / ${max}`);
        }
    }

    updateExpBar() {
        const { width } = this.scale;
        const cur = GlobalPlayerState.exp;
        const req = GlobalPlayerState.expToLevel;
        const pct = Phaser.Math.Clamp(cur / req, 0, 1);

        this.expBarGraphics.clear();
        this.expBarGraphics.fillStyle(0x0f172a, 0.9);
        this.expBarGraphics.fillRect(0, 68, width, 4);

        this.expBarGraphics.fillStyle(0x10b981, 1);
        this.expBarGraphics.fillRect(0, 68, width * pct, 4);
    }

    onSecondTick() {
        if (this.isWaveOver || !this.isGameRunning || this.isIntermission || this.isRoundPaused) return;

        this.waveTimer--;
        this.elapsedTime = GAME_CONFIG.WAVE_DURATION - this.waveTimer;
        const elapsed = this.elapsedTime;
        const currentLevel = GlobalPlayerState.currentWave;
        const lvlOffset = Math.max(0, currentLevel - 1);

        const mins = Math.max(0, Math.floor(this.waveTimer / 60));
        const secs = Math.max(0, this.waveTimer % 60);
        this.timerText.setText(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);

        if (elapsed < 45) {
            this.currentPhase = 1;
            this.spawnInterval = 2000;
            this.maxActiveEnemies = Math.floor(6 + lvlOffset * 1);
        } else if (elapsed >= 45 && elapsed < 90) {
            this.currentPhase = 2;
            this.spawnInterval = 1300;
            this.maxActiveEnemies = Math.floor(10 + lvlOffset * 1.5);
        } else if (elapsed >= 90 && elapsed < 135) {
            this.currentPhase = 3;
            this.spawnInterval = 1000;
            this.maxActiveEnemies = Math.floor(14 + lvlOffset * 2);
            if (!this.phase3SpecialSpawned) {
                this.phase3SpecialSpawned = true;
                this.spawnPhase3Special();
            }
        } else if (elapsed >= 135 && elapsed < 165) {
            this.currentPhase = 4;
            this.spawnInterval = 800;
            this.maxActiveEnemies = Math.floor(18 + lvlOffset * 2);
        } else if (elapsed >= 165) {
            this.currentPhase = 5;
            this.spawnInterval = 500;
            this.maxActiveEnemies = Math.floor(25 + lvlOffset * 2);
            if (!this.isClimaxMode) {
                this.isClimaxMode = true;
                this.triggerClimaxMode();
            }
        }

        if (this.enemyCapText) {
            const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
            this.enemyCapText.setText(t('hud.enemies', { count: this.getActiveEnemyCount(), max: this.maxActiveEnemies }));
        }

        if (this.waveTimer <= 5 && this.waveTimer > 0) {
            this.timerText.setColor('#ef4444');
            window.retroAudio.playTone(400, 'sine', 0.05, 300, 0.15);
        }

        if (this.waveTimer <= 0) {
            this.finishWave();
        }
    }

    showBannerNotice(text, color = '#facc15') {
        const { width } = this.scale;
        const banner = this.add.text(width / 2, 110, text, {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.tweens.add({
            targets: banner,
            scaleX: 1.15,
            scaleY: 1.15,
            alpha: { from: 1, to: 0 },
            y: 90,
            duration: 2200,
            ease: 'Sine.easeOut',
            onComplete: () => banner.destroy()
        });
    }

    triggerClimaxMode() {
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        this.timerText.setColor('#ef4444');
        this.cameras.main.shake(400, 0.025);
        window.retroAudio.playTone(160, 'sawtooth', 0.25, 90, 0.55);
        this.showBannerNotice(t('hud.climax_banner'), '#f43f5e');
    }

    // MAIN UPDATE LOOP
    update(time, delta) {
        if (this.isWaveOver || !this.isGameRunning || this.isIntermission || this.isRoundPaused || this.isRoundActive === false) {
            if (this.player && this.player.body) {
                this.player.body.setVelocity(0, 0);
            }
            return;
        }

        const safeDelta = (Number.isFinite(delta) && delta > 0) ? delta : 16.6;

        try {
            // 1. Cập nhật di chuyển người chơi (instance hoặc static)
            if (this.playerSystem && typeof this.playerSystem.updateMovement === 'function') {
                this.playerSystem.updateMovement(safeDelta);
            } else if (window.SurvivorGame.PlayerSystem) {
                const fn = window.SurvivorGame.PlayerSystem.updatePlayerMovement || window.SurvivorGame.PlayerSystem.updateMovement;
                if (typeof fn === 'function') fn.call(window.SurvivorGame.PlayerSystem, this, safeDelta);
            }

            // 2. Cập nhật xoay quanh & tự bắn của vũ khí
            if (this.playerSystem && typeof this.playerSystem.updateOrbitingWeapons === 'function') {
                this.playerSystem.updateOrbitingWeapons(safeDelta);
            } else if (window.SurvivorGame.PlayerSystem && typeof window.SurvivorGame.PlayerSystem.updateOrbitingWeapons === 'function') {
                window.SurvivorGame.PlayerSystem.updateOrbitingWeapons(this, safeDelta);
            }

            // 3. Hệ thống chống đứng yên (Anti-camping)
            if (this.enemySystem && typeof this.enemySystem.updateAntiCamping === 'function') {
                this.enemySystem.updateAntiCamping(time, safeDelta);
            } else if (window.SurvivorGame.EnemySystem && typeof window.SurvivorGame.EnemySystem.updateAntiCamping === 'function') {
                window.SurvivorGame.EnemySystem.updateAntiCamping(this, time, safeDelta);
            }

            // 4. Nhịp sinh quái Spawner
            if (window.SurvivorGame.EnemySystem && typeof window.SurvivorGame.EnemySystem.calculateSpawnInterval === 'function') {
                this.spawnInterval = window.SurvivorGame.EnemySystem.calculateSpawnInterval(this);
            } else {
                this.spawnInterval = 800;
            }
            this.spawnTimer = (Number(this.spawnTimer) || 0) + safeDelta;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemyCluster();
            }

            // 5. Di chuyển của quái vật
            if (this.enemySystem && typeof this.enemySystem.updateEnemies === 'function') {
                this.enemySystem.updateEnemies(safeDelta);
            } else if (window.SurvivorGame.EnemySystem && typeof window.SurvivorGame.EnemySystem.updateEnemies === 'function') {
                window.SurvivorGame.EnemySystem.updateEnemies(this, safeDelta);
            }

            // 6. Nam châm ngọc EXP & Vàng
            if (this.enemySystem && typeof this.enemySystem.updateGemAttraction === 'function') {
                this.enemySystem.updateGemAttraction(safeDelta);
            } else if (window.SurvivorGame.EnemySystem && typeof window.SurvivorGame.EnemySystem.updateGemAttraction === 'function') {
                window.SurvivorGame.EnemySystem.updateGemAttraction(this, safeDelta);
            }

            // Cập nhật text số lượng quái và Bậc quái trên HUD
            if (this.enemyCapText) {
                const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
                const currentLevel = GlobalPlayerState.currentWave || 1;
                const activeCount = this.getActiveEnemyCount();
                const pool = window.SurvivorGame.SlidingTierManager.getLevelPool(currentLevel);
                const activeTiers = Object.keys(pool).map(Number);
                const minT = activeTiers[0] || 1;
                const maxT = activeTiers[activeTiers.length - 1] || 4;
                const minL = window.SurvivorGame.SlidingTierManager.getTierLetter(minT);
                const maxL = window.SurvivorGame.SlidingTierManager.getTierLetter(maxT);

                if (this.isBerserkMode) {
                    this.enemyCapText.setText(t('hud.berserk_enemies', { count: activeCount, maxT, maxL }));
                    this.enemyCapText.setColor('#ff2222');
                } else {
                    this.enemyCapText.setText(t('hud.enemies_tier', { count: activeCount, max: this.maxActiveEnemies, minT, minL, maxT, maxL }));
                    this.enemyCapText.setColor('#94a3b8');
                }
            }
        } catch (uErr) {
            console.error("GameScene update error:", uErr);
        }
    }

    // Đạn bắn trúng quái
    handleBulletHitEnemy(bullet, enemy) {
        if (!bullet.alive || !enemy.alive) return;
        if (bullet.hitEnemies.has(enemy)) return;

        bullet.hitEnemies.add(enemy);
        bullet.hitsCount++;

        const angle = bullet.rotation;
        enemy.takeDamage(bullet.damage, angle, bullet.knockback);

        this.showDamageText(enemy.x, enemy.y, bullet.damage, bullet.isCrit);
        window.retroAudio.enemyHit();

        if (bullet.isExplosive) {
            this.createExplosionAoE(bullet.x, bullet.y, bullet.explosionRadius, bullet.damage);
            bullet.deactivate();
            return;
        }

        if (bullet.hitsCount >= bullet.pierce) {
            bullet.deactivate();
        }
    }

    // Quái va chạm người chơi
    handleEnemyTouchPlayer(player, enemy) {
        if (!enemy.alive || this.isWaveOver) return;

        const now = this.time.now;
        if (this.lastHurtTime && now - this.lastHurtTime < 400) return;
        this.lastHurtTime = now;

        const armorReduction = Math.min(0.7, (GlobalPlayerState.armor || 0) * 0.04);
        const actualDmg = Math.max(1, Math.round(enemy.damage * (1 - armorReduction)));

        GlobalPlayerState.hp -= actualDmg;
        this.updateHpBar();
        window.retroAudio.playerHurt();

        this.cameras.main.shake(180, 0.015);
        this.player.setTintFill(0xff0000);
        this.time.delayedCall(120, () => this.player.clearTint());

        if (GlobalPlayerState.hp <= 0) {
            this.handlePlayerGameOver();
        }
    }

    // Đạn quái trúng người chơi
    handleEnemyBulletHitPlayer(player, bullet) {
        if (!bullet.alive || this.isWaveOver) return;
        bullet.deactivate();

        const armorReduction = Math.min(0.7, (GlobalPlayerState.armor || 0) * 0.04);
        const actualDmg = Math.max(1, Math.round(bullet.damage * (1 - armorReduction)));

        GlobalPlayerState.hp -= actualDmg;
        this.updateHpBar();
        window.retroAudio.playerHurt();
        this.cameras.main.shake(140, 0.012);

        if (GlobalPlayerState.hp <= 0) {
            this.handlePlayerGameOver();
        }
    }

    // Nhặt ngọc EXP / Vàng
    handlePlayerCollectGem(player, gem) {
        if (!gem.alive) return;

        if (gem.gemType === 'gold') {
            GlobalPlayerState.gold += gem.value;
            GlobalPlayerState.roundGold = (GlobalPlayerState.roundGold || 0) + gem.value;
            this.goldText.setText(`💰 ${GlobalPlayerState.gold}`);
            window.retroAudio.gemPickup();
        } else {
            GlobalPlayerState.exp += gem.value;
            GlobalPlayerState.score += gem.value * 10;
            window.retroAudio.gemPickup();

            if (GlobalPlayerState.exp >= GlobalPlayerState.expToLevel) {
                let gainedLevels = 0;
                while (GlobalPlayerState.exp >= GlobalPlayerState.expToLevel) {
                    GlobalPlayerState.exp -= GlobalPlayerState.expToLevel;
                    GlobalPlayerState.level++;
                    this.pendingSkillPicks++;
                    GlobalPlayerState.pendingSkillPicks = this.pendingSkillPicks;
                    GlobalPlayerState.expToLevel = Math.round(GlobalPlayerState.expToLevel * 1.3);
                    gainedLevels++;
                }
                this.handleLevelUpNotification(gainedLevels);
            }
            this.updateExpBar();
        }

        gem.deactivate();
    }

    handleLevelUpNotification(count) {
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        this.levelText.setText(t('hud.player_level', { level: GlobalPlayerState.level }));
        if (this.pendingBadge) {
            this.pendingBadge.setText(t('hud.pending_cards', { count: this.pendingSkillPicks }));
            this.pendingBadge.setVisible(true);
        }

        window.retroAudio.levelUp();

        const txt = this.add.text(this.player.x, this.player.y - 30, t('hud.level_up_float', { count }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '16px',
            color: '#facc15',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(40);

        this.tweens.add({
            targets: txt,
            y: this.player.y - 75,
            alpha: 0,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 850,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });
    }

    showDamageText(x, y, amount, isCrit) {
        const textStr = isCrit ? `💥 ${amount}` : `${amount}`;
        const color = isCrit ? '#facc15' : '#ffffff';
        const fontSize = isCrit ? '18px' : '14px';

        const dmgTxt = this.add.text(x, y - 10, textStr, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: fontSize,
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);

        this.tweens.add({
            targets: dmgTxt,
            y: y - 45,
            alpha: 0,
            duration: 550,
            ease: 'Cubic.easeOut',
            onComplete: () => dmgTxt.destroy()
        });
    }

    // Kết thúc vòng đấu
    finishWave() {
        this.isWaveOver = true;
        this.isGameRunning = false;
        this.isRoundActive = false;
        if (this.player && this.player.body) {
            this.player.body.setVelocity(0, 0);
        }

        window.retroAudio.waveComplete();

        this.isBerserkMode = false;
        this.idleTimer = 0;
        if (this.idleWarnText) this.idleWarnText.setVisible(false);
        if (this.berserkBanner) this.berserkBanner.setVisible(false);
        this.enemyPool.getChildren().forEach(e => {
            if (e.tierLabel) e.tierLabel.setVisible(false);
        });

        this.enemyPool.getChildren().forEach(enemy => {
            if (enemy.alive) {
                this.particles.emitParticleAt(enemy.x, enemy.y, 10);
                GlobalPlayerState.score += (enemy.isBoss ? 500 : 25);
                enemy.die();
            }
        });

        this.gemPool.getChildren().forEach(gem => {
            if (gem.alive) {
                if (gem.gemType === 'gold') {
                    GlobalPlayerState.gold += gem.value;
                    GlobalPlayerState.roundGold = (GlobalPlayerState.roundGold || 0) + gem.value;
                } else {
                    GlobalPlayerState.exp += gem.value;
                    GlobalPlayerState.score += gem.value * 10;
                }
                gem.deactivate();
            }
        });

        while (GlobalPlayerState.exp >= GlobalPlayerState.expToLevel) {
            GlobalPlayerState.exp -= GlobalPlayerState.expToLevel;
            GlobalPlayerState.level++;
            this.pendingSkillPicks++;
            GlobalPlayerState.pendingSkillPicks = this.pendingSkillPicks;
            GlobalPlayerState.expToLevel = Math.round(GlobalPlayerState.expToLevel * 1.3);
        }
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        this.goldText.setText(`💰 ${GlobalPlayerState.gold}`);
        this.levelText.setText(t('hud.player_level', { level: GlobalPlayerState.level }));

        // Tự động hồi phục 100% máu về mức tối đa ngay khi chiến thắng vòng đấu
        GlobalPlayerState.hp = GlobalPlayerState.maxHp;
        if (this.player) {
            this.player.maxHp = GlobalPlayerState.maxHp;
            this.player.hp = GlobalPlayerState.maxHp;
        }
        this.updateHpBar();

        const { width, height } = this.scale;
        const banner = this.add.text(width / 2, height / 2, t('hud.wave_complete_banner', { level: GlobalPlayerState.currentWave }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '26px',
            color: '#10b981',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#064e3b',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(500);

        this.tweens.add({
            targets: banner,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 300,
            yoyo: true
        });

        window.ytSDK.saveGameProgress(GlobalPlayerState.score, GlobalPlayerState.currentWave);

        this.time.delayedCall(1400, () => {
            banner.destroy();
            if (this.pendingSkillPicks > 0) {
                this.startIntermissionSkillPicks();
            } else {
                this.proceedToShopOrVictory();
            }
        });
    }

    startIntermissionSkillPicks() {
        window.SurvivorGame.SkillModalSystem.show(this);
    }

    proceedToShopOrVictory() {
        window.SurvivorGame.SkillModalSystem.cleanModal();

        // Đảm bảo máu luôn đầy 100% khi bước sang Shop hoặc vòng tiếp theo
        GlobalPlayerState.hp = GlobalPlayerState.maxHp;

        this.isRoundPaused = false;
        this.isIntermission = false;

        if (this.joystickBase) this.joystickBase.setVisible(true);
        if (this.joystickKnob) this.joystickKnob.setVisible(true);

        if (GlobalPlayerState.currentWave >= GAME_CONFIG.MAX_WAVES) {
            this.scene.start('VictoryScene');
        } else {
            this.scene.start('ShopScene');
        }
    }

    handlePlayerGameOver() {
        window.SurvivorGame.SkillModalSystem.cleanModal();
        this.isWaveOver = true;
        this.isGameRunning = false;
        window.retroAudio.defeat();
        window.retroAudio.stopBgm();

        this.physics.pause();
        this.cameras.main.shake(300, 0.025);

        window.ytSDK.saveGameProgress(GlobalPlayerState.score, GlobalPlayerState.currentWave);

        this.time.delayedCall(1200, () => {
            this.scene.start('GameOverScene');
        });
    }
}

// ==========================================
// SCENE 5: VICTORY SCENE (CHIẾN THẮNG 100 LEVEL)
// ==========================================
class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    create() {
        window.ytSDK.bindScene(this);
        window.retroAudio.victory();
        window.retroAudio.stopBgm();

        const { width, height } = this.scale;
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x064e3b, 0x064e3b, 0x022c22, 0x022c22, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, height * 0.16, t('victory.title'), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '30px',
            color: '#facc15',
            fontStyle: '900',
            stroke: '#78350f',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.24, t('victory.subtitle', { max: GAME_CONFIG.MAX_WAVES }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '15px',
            color: '#6ee7b7',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Bảng tổng kết
        const statsBox = this.add.graphics();
        statsBox.fillStyle(0x0f172a, 0.85);
        statsBox.fillRoundedRect(width / 2 - 180, height * 0.32, 360, 180, 14);
        statsBox.lineStyle(3, 0x10b981, 1);
        statsBox.strokeRoundedRect(width / 2 - 180, height * 0.32, 360, 180, 14);

        this.add.text(width / 2, height * 0.38, t('victory.score', { score: GlobalPlayerState.currentScore, best: GlobalPlayerState.highScore }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.44, t('victory.kills', { kills: GlobalPlayerState.enemiesKilled }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '16px',
            color: '#e2e8f0'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.50, t('victory.gold', { gold: GlobalPlayerState.gold }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '16px',
            color: '#fbbf24'
        }).setOrigin(0.5);

        window.ytSDK.saveGameProgress(GlobalPlayerState.score, GAME_CONFIG.MAX_WAVES);

        // Nút Chơi Lại với Interstitial Ad (Hitbox 100% + Zoom phản hồi)
        const replayBtn = this.add.container(width / 2, height * 0.72);
        const btnG = this.add.graphics();
        btnG.fillStyle(0x10b981, 1);
        btnG.fillRoundedRect(-140, -28, 280, 56, 28);
        const replayTxt = this.add.text(0, 0, t('victory.replay_btn'), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        replayBtn.add([btnG, replayTxt]);

        const replayAction = () => {
            window.ytSDK.showInterstitialAd(() => {
                GlobalPlayerState.reset();
                this.scene.start('GameScene');
            });
        };
        const replayHit = window.SurvivorGame.createContainerHitArea
            ? window.SurvivorGame.createContainerHitArea(this, replayBtn, 280, 56)
            : replayBtn.setSize(280, 56).setInteractive({ useHandCursor: true });
        if (window.SurvivorGame.attachInteractiveCardEffects) {
            window.SurvivorGame.attachInteractiveCardEffects(this, replayBtn, replayHit, replayAction);
        } else {
            replayHit.on('pointerdown', replayAction);
        }
    }
}

// ==========================================
// SCENE 6: GAME OVER SCENE (THẤT BẠI)
// ==========================================
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        window.ytSDK.bindScene(this);
        const { width, height } = this.scale;
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        const rewardIds = window.SurvivorGame.REWARD_AD_IDS || (window.GAME_CONFIG && window.GAME_CONFIG.REWARD_AD_IDS) || {
            BONUS_GOLD: 'orbit-reward-100-gold',
            FREE_REROLL: 'orbit-reward-free-reroll',
            REVIVE_PLAYER: 'orbit-reward-revive-full-hp'
        };

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x450a0a, 0x450a0a, 0x020617, 0x020617, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, 68, t('gameover.title'), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '28px',
            color: '#ef4444',
            fontStyle: '900',
            stroke: '#7f1d1d',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Khung thống kê
        const statsBox = this.add.graphics();
        statsBox.fillStyle(0x0f172a, 0.88);
        statsBox.fillRoundedRect(width / 2 - 180, 108, 360, 130, 12);
        statsBox.lineStyle(2, 0xef4444, 1);
        statsBox.strokeRoundedRect(width / 2 - 180, 108, 360, 130, 12);

        this.add.text(width / 2, 132, t('gameover.level', { level: GlobalPlayerState.currentWave, max: GAME_CONFIG.MAX_WAVES }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '15px',
            color: '#f87171',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 162, t('gameover.score', { score: GlobalPlayerState.currentScore, best: GlobalPlayerState.highScore }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '15px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 190, t('gameover.kills', { kills: GlobalPlayerState.enemiesKilled }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#cbd5e1'
        }).setOrigin(0.5);

        this.goldDisplay = this.add.text(width / 2, 218, t('gameover.gold', { gold: GlobalPlayerState.gold }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#fbbf24',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 1. NÚT REWARDED AD: HỒI SINH ĐẦY MÁU (REVIVE PLAYER)
        const reviveBtn = this.add.container(width / 2, 290);
        const rW = 320;
        const rH = 50;
        const rG = this.add.graphics();
        rG.fillStyle(0x059669, 1);
        rG.fillRoundedRect(-rW / 2, -rH / 2, rW, rH, 25);
        rG.lineStyle(3, 0x34d399, 1);
        rG.strokeRoundedRect(-rW / 2, -rH / 2, rW, rH, 25);

        const rTxt = this.add.text(0, 0, t('gameover.revive_btn', { level: GlobalPlayerState.currentWave }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        reviveBtn.add([rG, rTxt]);
        const reviveHit = window.SurvivorGame.createContainerHitArea
            ? window.SurvivorGame.createContainerHitArea(this, reviveBtn, rW, rH)
            : reviveBtn.setSize(rW, rH).setInteractive({ useHandCursor: true });
        const reviveAction = () => {
            rTxt.setText(t('shop.ad_loading'));
            window.ytSDK.showRewardedAd(() => {
                GlobalPlayerState.hp = GlobalPlayerState.maxHp;
                if (window.retroAudio && typeof window.retroAudio.heal === 'function') {
                    window.retroAudio.heal();
                }
                this.scene.start('GameScene');
            }, () => {
                rTxt.setText(t('shop.ad_failed'));
            }, rewardIds.REVIVE_PLAYER);
        };
        if (window.SurvivorGame.attachInteractiveCardEffects) {
            window.SurvivorGame.attachInteractiveCardEffects(this, reviveBtn, reviveHit, reviveAction);
        } else {
            reviveHit.on('pointerdown', reviveAction);
        }

        // 2. NÚT REWARDED AD: XEM QC NHẬN 100 VÀNG (BONUS GOLD)
        const adBtn = this.add.container(width / 2, 355);
        const aW = 320;
        const aH = 46;
        const adG = this.add.graphics();
        adG.fillStyle(0xd97706, 1);
        adG.fillRoundedRect(-aW / 2, -aH / 2, aW, aH, 23);
        adG.lineStyle(2, 0xfbbf24, 1);
        adG.strokeRoundedRect(-aW / 2, -aH / 2, aW, aH, 23);

        const adTxt = this.add.text(0, 0, t('gameover.watch_ad_gold'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        adBtn.add([adG, adTxt]);
        const adHit = window.SurvivorGame.createContainerHitArea
            ? window.SurvivorGame.createContainerHitArea(this, adBtn, aW, aH)
            : adBtn.setSize(aW, aH).setInteractive({ useHandCursor: true });
        const adAction = () => {
            adTxt.setText(t('shop.ad_loading'));
            window.ytSDK.showRewardedAd(() => {
                GlobalPlayerState.gold += 100;
                this.goldDisplay.setText(t('gameover.gold', { gold: GlobalPlayerState.gold }));
                if (window.retroAudio && typeof window.retroAudio.buy === 'function') {
                    window.retroAudio.buy();
                }
                adBtn.destroy();

                this.add.text(width / 2, 355, t('gameover.gold_claimed'), {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '15px',
                    color: '#facc15',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
            }, () => {
                adTxt.setText(t('shop.ad_failed'));
            }, rewardIds.BONUS_GOLD);
        };
        if (window.SurvivorGame.attachInteractiveCardEffects) {
            window.SurvivorGame.attachInteractiveCardEffects(this, adBtn, adHit, adAction);
        } else {
            adHit.on('pointerdown', adAction);
        }

        // 3. NÚT THỬ LẠI TRẬN MỚI (VỚI INTERSTITIAL AD)
        const retryBtn = this.add.container(width / 2, 425);
        const btnW = 320;
        const btnH = 50;
        const btnG = this.add.graphics();
        btnG.fillStyle(0x0284c7, 1);
        btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 25);
        btnG.lineStyle(2, 0x38bdf8, 1);
        btnG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 25);

        const retryTxt = this.add.text(0, 0, t('gameover.retry_btn'), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        retryBtn.add([btnG, retryTxt]);
        const retryHit = window.SurvivorGame.createContainerHitArea
            ? window.SurvivorGame.createContainerHitArea(this, retryBtn, btnW, btnH)
            : retryBtn.setSize(btnW, btnH).setInteractive({ useHandCursor: true });

        const retryAction = () => {
            window.ytSDK.showInterstitialAd(() => {
                GlobalPlayerState.reset();
                this.scene.start('GameScene');
            });
        };
        if (window.SurvivorGame.attachInteractiveCardEffects) {
            window.SurvivorGame.attachInteractiveCardEffects(this, retryBtn, retryHit, retryAction);
        } else {
            retryHit.on('pointerdown', retryAction);
        }
    }
}

// ==========================================
// CẤU HÌNH PHASER 3 GAME & KHỞI CHẠY
// ==========================================
const phaserConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_CONFIG.CANVAS_WIDTH,
    height: GAME_CONFIG.CANVAS_HEIGHT,
    pauseOnBlur: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        MenuScene,
        GameScene,
        window.SurvivorGame.ShopScene,
        VictoryScene,
        GameOverScene
    ]
};

// Gắn toàn bộ vào namespace SurvivorGame
window.SurvivorGame.BootScene = BootScene;
window.SurvivorGame.MenuScene = MenuScene;
window.SurvivorGame.GameScene = GameScene;
window.SurvivorGame.VictoryScene = VictoryScene;
window.SurvivorGame.GameOverScene = GameOverScene;
window.SurvivorGame.phaserConfig = phaserConfig;

// Khởi chạy game khi window sẵn sàng
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('load', () => {
        // Đảm bảo ShopScene có sẵn từ window.SurvivorGame
        if (!phaserConfig.scene.includes(window.SurvivorGame.ShopScene) && window.SurvivorGame.ShopScene) {
            phaserConfig.scene[3] = window.SurvivorGame.ShopScene;
        }
        window.game = new Phaser.Game(phaserConfig);
        window.SurvivorGame.game = window.game;
    });
}
