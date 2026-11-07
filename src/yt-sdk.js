/**
 * YouTube Playables SDK Integration Wrapper
 * Hỗ trợ trọn vẹn vòng đời SDK, lưu dữ liệu đám mây, tính điểm và quảng cáo
 */
class YouTubePlayablesSDK {
    constructor() {
        this.isSupported = typeof window !== 'undefined' && !!window.ytgame;
        this.saveDataKey = 'brotato_playables_save_v1';
        this.currentActiveScene = null;
        this.cachedData = { highScore: 0, maxWave: 1 };
        this.initEventListeners();
    }

    // 1. Gọi khi DOM tải xong và khung hình đầu tiên được vẽ
    onFirstFrameReady() {
        console.log('[YT Playables] firstFrameReady triggered');
        if (this.isSupported && window.ytgame.game && typeof window.ytgame.game.firstFrameReady === 'function') {
            try {
                window.ytgame.game.firstFrameReady();
            } catch (e) {
                console.warn('[YT Playables] firstFrameReady error:', e);
            }
        }
    }

    // 2. Gọi khi tài nguyên khởi tạo hoàn tất và Menu chính sẵn sàng nhận tương tác
    onGameReady() {
        console.log('[YT Playables] gameReady triggered');
        if (this.isSupported && window.ytgame.game && typeof window.ytgame.game.gameReady === 'function') {
            try {
                window.ytgame.game.gameReady();
            } catch (e) {
                console.warn('[YT Playables] gameReady error:', e);
            }
        }
    }

    // Đăng ký scene hiện tại để điều phối Pause/Resume và Audio
    bindScene(scene) {
        this.currentActiveScene = scene;
    }

    // 3. Lắng nghe các sự kiện hệ thống từ YouTube
    initEventListeners() {
        if (!this.isSupported || !window.ytgame.system) {
            console.log('[YT Playables] SDK không khả dụng trong môi trường này. Kích hoạt chế độ mô phỏng.');
            return;
        }

        try {
            // Khi người dùng bấm tạm dừng trên trình phát YouTube
            if (typeof window.ytgame.system.onPause === 'function') {
                window.ytgame.system.onPause(() => {
                    console.log('[YT Playables] System Pause received');
                    if (this.currentActiveScene && this.currentActiveScene.scene) {
                        this.currentActiveScene.scene.pause();
                    }
                    if (window.retroAudio) {
                        window.retroAudio.stopBgm();
                    }
                });
            }

            // Khi người dùng tiếp tục
            if (typeof window.ytgame.system.onResume === 'function') {
                window.ytgame.system.onResume(() => {
                    console.log('[YT Playables] System Resume received');
                    if (this.currentActiveScene && this.currentActiveScene.scene) {
                        this.currentActiveScene.scene.resume();
                    }
                });
            }

            // Khi bật/tắt âm thanh qua thanh điều khiển YouTube
            if (typeof window.ytgame.system.onAudioEnabledChange === 'function') {
                window.ytgame.system.onAudioEnabledChange((enabled) => {
                    console.log('[YT Playables] Audio Enabled:', enabled);
                    if (window.retroAudio) {
                        window.retroAudio.setMute(!enabled);
                    }
                    if (this.currentActiveScene && this.currentActiveScene.sound) {
                        this.currentActiveScene.sound.mute = !enabled;
                    }
                });
            }
        } catch (err) {
            console.error('[YT Playables] Lỗi khởi tạo event listeners:', err);
        }
    }

    // 4. Lưu dữ liệu đám mây (Cloud Save) & Gửi điểm số
    async saveGameProgress(highScore, maxWave) {
        this.cachedData.highScore = Math.max(this.cachedData.highScore || 0, highScore);
        this.cachedData.maxWave = Math.max(this.cachedData.maxWave || 1, maxWave);

        const payload = JSON.stringify({
            highScore: this.cachedData.highScore,
            maxWave: this.cachedData.maxWave,
            timestamp: Date.now()
        });

        // Lưu vào YouTube Cloud Save nếu có
        if (this.isSupported && window.ytgame.game && typeof window.ytgame.game.saveData === 'function') {
            try {
                await window.ytgame.game.saveData(payload);
                console.log('[YT Playables] Saved to cloud:', payload);
            } catch (e) {
                console.warn('[YT Playables] saveData cloud failed, falling back to local:', e);
            }
        }

        // Fallback lưu LocalStorage
        try {
            localStorage.setItem(this.saveDataKey, payload);
        } catch (e) {}

        // Gửi điểm số lên bảng xếp hạng YouTube Playables
        if (this.isSupported && window.ytgame.engagement && typeof window.ytgame.engagement.sendScore === 'function') {
            try {
                window.ytgame.engagement.sendScore({ value: Math.floor(highScore) });
                console.log('[YT Playables] sendScore sent:', highScore);
            } catch (e) {
                console.warn('[YT Playables] sendScore failed:', e);
            }
        }
    }

    // Tải dữ liệu đám mây
    async loadGameProgress() {
        if (this.isSupported && window.ytgame.game && typeof window.ytgame.game.loadData === 'function') {
            try {
                const cloudData = await window.ytgame.game.loadData();
                if (cloudData) {
                    const parsed = JSON.parse(cloudData);
                    this.cachedData = Object.assign(this.cachedData, parsed);
                    return this.cachedData;
                }
            } catch (e) {
                console.warn('[YT Playables] loadData cloud failed:', e);
            }
        }

        // Fallback LocalStorage
        try {
            const raw = localStorage.getItem(this.saveDataKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.cachedData = Object.assign(this.cachedData, parsed);
            }
        } catch (e) {}

        return this.cachedData;
    }

    // 5. Stub Quảng cáo giữa màn (Interstitial Ad)
    showInterstitialAd(onComplete = null) {
        console.log('[YT Playables AD] Requesting Interstitial Ad...');
        // Mở rộng khi YouTube cung cấp ad API chính thức
        if (this.isSupported && window.ytgame.ads && typeof window.ytgame.ads.showInterstitialAd === 'function') {
            window.ytgame.ads.showInterstitialAd().then(() => {
                if (onComplete) onComplete(true);
            }).catch(() => {
                if (onComplete) onComplete(false);
            });
        } else {
            // Chế độ mô phỏng mượt mà
            setTimeout(() => {
                console.log('[YT Playables AD] Interstitial Ad finished (simulated)');
                if (onComplete) onComplete(true);
            }, 300);
        }
    }

    // 5. Stub Quảng cáo nhận thưởng (Rewarded Ad)
    showRewardedAd(onRewarded = null, onFailed = null) {
        console.log('[YT Playables AD] Requesting Rewarded Ad...');
        if (this.isSupported && window.ytgame.ads && typeof window.ytgame.ads.showRewardedAd === 'function') {
            window.ytgame.ads.showRewardedAd().then((result) => {
                if (result && result.rewarded) {
                    if (onRewarded) onRewarded();
                } else {
                    if (onFailed) onFailed();
                }
            }).catch(() => {
                if (onFailed) onFailed();
            });
        } else {
            // Mô phỏng nhận thưởng ngay sau thông báo ngắn
            setTimeout(() => {
                console.log('[YT Playables AD] Rewarded Ad successfully viewed (simulated)');
                if (onRewarded) onRewarded();
            }, 400);
        }
    }
}

// Khởi tạo instance toàn cục
window.ytSDK = new YouTubePlayablesSDK();

// Bắt sự kiện DOMContentLoaded để gọi firstFrameReady sớm nhất
document.addEventListener('DOMContentLoaded', () => {
    window.ytSDK.onFirstFrameReady();
});
