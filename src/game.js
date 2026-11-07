/**
 * SURVIVOR PLAYABLES - PHASER 3 GAME ENGINE
 * Trò chơi Survivor-like phong cách Brotato hoàn chỉnh chuẩn YouTube Playables
 */

// ==========================================
// CẤU HÌNH TRÒ CHƠI TOÀN CỤC
// ==========================================
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    ARENA_WIDTH: 1800,
    ARENA_HEIGHT: 1800,
    WAVE_DURATION: 180, // 3 phút (180 giây) mỗi round đấu
    MAX_WAVES: 100,     // Lộ trình 100 Level chuẩn
    MAX_WEAPONS: 6
};

// State người chơi toàn cục qua các Wave và Shop
const GlobalPlayerState = {
    maxHp: 100,
    hp: 100,
    hpRegen: 0,
    speed: 180, // Tốc độ di chuyển chuẩn 180 ở Level 1
    speedMult: 1.0,
    flatDamage: 0,
    damageMult: 1.0,
    attackSpeedMult: 1.0,
    rangeMult: 1.0,
    critChance: 0.05,
    critMult: 2.0,
    armor: 0,
    pickupRadius: 100,
    gold: 20, // Cho 20 vàng ban đầu
    roundGold: 0,
    exp: 0,
    level: 1,
    expToLevel: 15,
    pendingSkillPicks: 0,
    score: 0,
    enemiesKilled: 0,
    currentWave: 1,
    weapons: (window.GAME_DATA && window.GAME_DATA.WEAPON_TYPES) ? [
        JSON.parse(JSON.stringify(window.GAME_DATA.WEAPON_TYPES.PISTOL))
    ] : [],
    upgradePrices: {
        damage: 25,
        hp: 30,
        speed: 20
    },

    reset() {
        this.maxHp = 100;
        this.hp = 100;
        this.hpRegen = 0;
        this.speed = 180; // Tốc độ di chuyển chuẩn 180 ở Level 1
        this.speedMult = 1.0;
        this.flatDamage = 0;
        this.damageMult = 1.0;
        this.attackSpeedMult = 1.0;
        this.rangeMult = 1.0;
        this.critChance = 0.05;
        this.critMult = 2.0;
        this.armor = 0;
        this.pickupRadius = 100;
        this.gold = 20;
        this.roundGold = 0;
        this.exp = 0;
        this.level = 1;
        this.expToLevel = 15;
        this.pendingSkillPicks = 0;
        this.score = 0;
        this.enemiesKilled = 0;
        this.currentWave = 1;
        this.upgradePrices = {
            damage: 25,
            hp: 30,
            speed: 20
        };
        // Bắt đầu với 1 súng lục Lv.1 mặc định (Miễn phí)
        this.weapons = [
            JSON.parse(JSON.stringify(window.GAME_DATA.WEAPON_TYPES.PISTOL))
        ];
    }
};

// ==========================================
// SCENE 1: BOOT & GENERATE TEXTURES
// ==========================================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Vẽ màn hình Loading tối giản đẹp mắt
        const { width, height } = this.scale;
        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x1e293b, 0.8);
        progressBg.fillRoundedRect(width / 2 - 150, height / 2 - 15, 300, 30, 15);

        const progressBar = this.add.graphics();
        const loadText = this.add.text(width / 2, height / 2 - 45, 'KHỞI TẠO TỰA GAME...', {
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
        // Tạo toàn bộ texture procedural bằng Phaser Graphics (không cần ảnh ngoài)
        this.createProceduralTextures();

        // Tải dữ liệu kỷ lục từ YouTube Cloud hoặc LocalStorage
        window.ytSDK.loadGameProgress().then(() => {
            // Chuyển sang MenuScene
            this.scene.start('MenuScene');
        });
    }

    createProceduralTextures() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // 1. Player Texture: Chú chibi tròn màu xanh ngọc, viền phát sáng, mắt sinh động
        g.clear();
        // Viền hào quang
        g.lineStyle(4, 0x38bdf8, 1);
        g.fillStyle(0x06b6d4, 1);
        g.fillCircle(24, 24, 20);
        g.strokeCircle(24, 24, 20);
        // Lõi sáng
        g.fillStyle(0x22d3ee, 1);
        g.fillCircle(21, 20, 15);
        // Hai mắt chibi đáng yêu
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(28, 18, 4);
        g.fillCircle(28, 30, 4);
        // Đốm sáng trong mắt
        g.fillStyle(0xffffff, 1);
        g.fillCircle(29, 17, 1.5);
        g.fillCircle(29, 29, 1.5);
        g.generateTexture('player', 48, 48);

        // 2. Texture các vũ khí (gắn xung quanh nhân vật)
        // Pistol
        g.clear();
        g.fillStyle(0x64748b, 1);
        g.fillRect(8, 6, 16, 8); // Thân súng
        g.fillStyle(0x0284c7, 1);
        g.fillRect(16, 8, 10, 4); // Nòng súng
        g.fillStyle(0x334155, 1);
        g.fillRect(6, 12, 6, 8);  // Tay cầm
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
        g.fillRect(14, 12, 5, 10); // Băng đạn
        g.fillStyle(0xfde047, 1);
        g.fillRect(22, 8, 6, 3);
        g.generateTexture('wp_smg', 30, 24);

        // Laser
        g.clear();
        g.fillStyle(0xa855f7, 1);
        g.fillRect(4, 5, 22, 8);
        g.fillStyle(0xf43f5e, 1);
        g.fillCircle(15, 9, 4); // Lõi pha lê
        g.fillStyle(0xe879f9, 1);
        g.fillRect(22, 7, 10, 4);
        g.generateTexture('wp_laser', 34, 20);

        // Rocket
        g.clear();
        g.fillStyle(0xef4444, 1);
        g.fillRect(4, 4, 22, 12);
        g.fillStyle(0xb91c1c, 1);
        g.fillTriangle(26, 4, 34, 10, 26, 16); // Đầu tên lửa
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

        // 3. Texture Quái vật (5 chủng loại)
        // Kẻ địch 1: Tam giác Đỏ (Swarmer - Nhanh, máu ít)
        g.clear();
        g.fillStyle(0xef4444, 1);
        g.fillTriangle(28, 16, 4, 4, 4, 28);
        g.lineStyle(2, 0xfca5a5, 1);
        g.strokeTriangle(28, 16, 4, 4, 4, 28);
        // Mắt quái
        g.fillStyle(0xffffff, 1);
        g.fillCircle(14, 16, 3.5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(15, 16, 1.8);
        g.generateTexture('enemy_swarmer', 32, 32);

        // Kẻ địch 2: Hình vuông Tím/Đỏ (Tank - Trâu, chậm)
        g.clear();
        g.fillStyle(0x881337, 1);
        g.fillRoundedRect(4, 4, 34, 34, 6);
        g.lineStyle(3, 0xf43f5e, 1);
        g.strokeRoundedRect(4, 4, 34, 34, 6);
        // Hai mắt giận dữ
        g.fillStyle(0xffffff, 1);
        g.fillCircle(14, 18, 4);
        g.fillCircle(28, 18, 4);
        g.fillStyle(0x000000, 1);
        g.fillCircle(15, 18, 2);
        g.fillCircle(27, 18, 2);
        g.generateTexture('enemy_tank', 42, 42);

        // Kẻ địch 3: Hình thoi Cam (Dasher - Lao nhanh)
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

        // Kẻ địch 4: Bát giác Tím (Spitter - Bắn đạn từ xa)
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

        // Kẻ địch 5: Trùm Wave 10 (Boss - Giga Overlord)
        g.clear();
        g.fillStyle(0x450a0a, 1);
        g.fillCircle(40, 40, 36);
        g.lineStyle(5, 0xdc2626, 1);
        g.strokeCircle(40, 40, 36);
        // Sừng
        g.fillStyle(0xdc2626, 1);
        g.fillTriangle(20, 20, 10, 2, 32, 14);
        g.fillTriangle(60, 20, 70, 2, 48, 14);
        // Mắt quỷ phát sáng
        g.fillStyle(0xfef08a, 1);
        g.fillCircle(28, 38, 7);
        g.fillCircle(52, 38, 7);
        g.fillStyle(0x991b1b, 1);
        g.fillCircle(29, 38, 3.5);
        g.fillCircle(51, 38, 3.5);
        g.generateTexture('enemy_boss', 80, 80);

        // Kẻ địch 6: Quái Tinh Anh (Elite Enemy - kích thước gấp đôi, hào quang phát sáng, viền vàng)
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

        // 4. Texture Đạn (Projectiles)
        // Đạn thường tròn sáng
        g.clear();
        g.fillStyle(0x38bdf8, 1);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(7, 7, 3);
        g.generateTexture('bullet_normal', 16, 16);

        // Đạn quái vật (màu tím nguy hiểm)
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

        // 5. Texture Ngọc EXP & Tiền Vàng
        // Hạt EXP (màu xanh lục lấp lánh)
        g.clear();
        g.fillStyle(0x10b981, 1);
        g.fillTriangle(10, 2, 18, 10, 10, 18);
        g.fillTriangle(10, 2, 2, 10, 10, 18);
        g.fillStyle(0x6ee7b7, 1);
        g.fillCircle(10, 10, 3);
        g.generateTexture('gem_exp', 20, 20);

        // Tiền Vàng (Hình đồng xu vàng sáng chói)
        g.clear();
        g.fillStyle(0xf59e0b, 1);
        g.fillCircle(10, 10, 9);
        g.lineStyle(2, 0xfde68a, 1);
        g.strokeCircle(10, 10, 8);
        g.fillStyle(0xfef08a, 1);
        g.fillCircle(8, 8, 3);
        g.generateTexture('gem_gold', 20, 20);

        // 6. Texture Hạt vỡ (Particle)
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);

        // 7. Grid ô gạch Arena (Nền sàn đấu Cyberpunk)
        g.clear();
        g.fillStyle(0x0b1120, 1);
        g.fillRect(0, 0, 64, 64);
        g.lineStyle(1, 0x1e293b, 0.6);
        g.strokeRect(0, 0, 64, 64);
        // Chấm nhẹ ở góc
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
        window.ytSDK.onGameReady();

        const { width, height } = this.scale;

        // Background Gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0b1329, 0x0b1329, 0x030712, 0x030712, 1);
        bg.fillRect(0, 0, width, height);

        // Tiêu đề Game hoành tráng phong cách Brotato / Survivor
        const titleText = this.add.text(width / 2, height * 0.14, 'BRO-SURVIVOR', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '42px',
            color: '#38bdf8',
            fontStyle: '900',
            stroke: '#0369a1',
            strokeThickness: 7
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

        const subTitle = this.add.text(width / 2, height * 0.22, 'YOUTUBE PLAYABLES EDITION • 3-MINUTE SURVIVAL', {
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

        // Demo 6 vũ khí xoay quanh
        const weaponSprites = [];
        const wpKeys = ['wp_pistol', 'wp_shotgun', 'wp_smg', 'wp_laser', 'wp_rocket', 'wp_blade'];
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const dist = 60;
            const wp = this.add.sprite(Math.cos(angle) * dist, Math.sin(angle) * dist, wpKeys[i]).setScale(1.2);
            weaponSprites.push({ sprite: wp, baseAngle: angle });
            avatarContainer.add(wp);
        }

        // Tween xoay demo vũ khí
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
        this.add.text(width / 2, height * 0.61, `🏆 KỶ LỤC: ${rec.highScore || 0}   |   🌊 LEVEL CAO NHẤT: ${rec.maxWave || 1} / ${GAME_CONFIG.MAX_WAVES}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '15px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Nút BẮT ĐẦU CHIẾN ĐẤU (PLAY BUTTON)
        const btnY = height * 0.74;
        const playBtn = this.add.container(width / 2, btnY);

        const btnG = this.add.graphics();
        btnG.fillStyle(0x0284c7, 1);
        btnG.fillRoundedRect(-140, -28, 280, 56, 28);
        btnG.lineStyle(3, 0x38bdf8, 1);
        btnG.strokeRoundedRect(-140, -28, 280, 56, 28);

        const playText = this.add.text(0, 0, '⚔️ BẮT ĐẦU CHƠI', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        playBtn.add([btnG, playText]);
        playBtn.setSize(280, 56);
        playBtn.setInteractive(new Phaser.Geom.Rectangle(-140, -28, 280, 56), Phaser.Geom.Rectangle.Contains);

        playBtn.on('pointerover', () => {
            btnG.clear();
            btnG.fillStyle(0x0ea5e9, 1);
            btnG.fillRoundedRect(-140, -28, 280, 56, 28);
            btnG.lineStyle(4, 0xbae6fd, 1);
            btnG.strokeRoundedRect(-140, -28, 280, 56, 28);
        });

        playBtn.on('pointerout', () => {
            btnG.clear();
            btnG.fillStyle(0x0284c7, 1);
            btnG.fillRoundedRect(-140, -28, 280, 56, 28);
            btnG.lineStyle(3, 0x38bdf8, 1);
            btnG.strokeRoundedRect(-140, -28, 280, 56, 28);
        });

        const startAction = () => {
            window.retroAudio.init();
            window.retroAudio.waveComplete();
            GlobalPlayerState.reset();
            this.scene.start('GameScene');
        };
        playBtn.on('pointerdown', startAction);
        playBtn.on('pointerup', startAction);

        // Hướng dẫn điều khiển ngắn gọn
        this.add.text(width / 2, height * 0.86, '💻 Phím WASD / Mũi tên  |  📱 Chạm kéo Joystick cảm ứng', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#64748b'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.91, '🎯 Tự động ngắm & bắn quái gần nhất • 3 phút mỗi vòng • Shop sau trận', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        // Nút Bật/Tắt Âm thanh
        const soundBtn = this.add.text(width - 40, 35, '🔊', {
            fontSize: '26px'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        soundBtn.on('pointerdown', () => {
            const isMuted = window.retroAudio.toggleMute();
            soundBtn.setText(isMuted ? '🔇' : '🔊');
        });
    }
}

// ==========================================
// THỰC THỂ ĐẠN (BULLET CLASS) - OBJECT POOLING
// ==========================================
class Bullet extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, 0, 0, 'bullet_normal');
        scene.physics.add.existing(this);
        this.body.setCircle(7);
        this.alive = false;
        this.traveled = 0;
        this.maxDistance = 400;
        this.damage = 10;
        this.pierce = 1;
        this.hitsCount = 0;
        this.knockback = 50;
        this.isExplosive = false;
        this.explosionRadius = 80;
        this.hitEnemies = new Set();
    }

    fire(x, y, angle, speed, damage, maxRange, pierce, knockback, isExplosive, explosionRadius, tex = 'bullet_normal') {
        this.setPosition(x, y);
        this.setTexture(tex);
        this.setRotation(angle);
        this.setActive(true);
        this.setVisible(true);
        this.alive = true;
        this.traveled = 0;
        this.maxDistance = maxRange;
        this.damage = damage;
        this.pierce = pierce || 1;
        this.hitsCount = 0;
        this.knockback = knockback || 50;
        this.isExplosive = !!isExplosive;
        this.explosionRadius = explosionRadius || 80;
        this.hitEnemies.clear();

        this.body.reset(x, y);
        this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    }

    update(time, delta) {
        if (!this.alive) return;
        const distStep = (this.body.speed * delta) / 1000;
        this.traveled += distStep;

        if (this.traveled >= this.maxDistance) {
            this.deactivate();
        }
    }

    deactivate() {
        this.alive = false;
        if (this.tierLabel) this.tierLabel.setVisible(false);
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.stop();
    }
}

// ==========================================
// HỆ THỐNG BẬC QUÁI TIẾN HÓA (SLIDING WINDOW TIER SYSTEM)
// ==========================================
const SlidingTierManager = {
    // Tính toán phân bổ tỷ lệ xuất hiện các Tier tại Level L (1 - 100)
    // Quy tắc:
    // - Level 1: T1(A: 40%), T2(B: 30%), T3(C: 20%), T4(D: 10%)
    // - Mỗi Level mới:
    //   1. Xuất hiện thêm 1 loại mới (Tier = L + 3) với 10%
    //   2. Loại mạnh nhất của Level trước đó TĂNG thêm +20%
    //   3. Loại yếu nhất đang có bị GIẢM -20% (kèm 10% cho tier mới = 30% tổng), nếu <= 0 thì loại bỏ và giảm tiếp bậc kế
    getLevelPool(currentLevel) {
        let pool = { 1: 40, 2: 30, 3: 20, 4: 10 };
        for (let L = 2; L <= currentLevel; L++) {
            const newTier = L + 3;
            const prevMaxTier = L + 2;

            pool[newTier] = 10;
            if (pool[prevMaxTier] !== undefined) {
                pool[prevMaxTier] += 20;
            }

            let toDeduct = 30;
            while (toDeduct > 0) {
                const activeTiers = Object.keys(pool).map(Number).sort((a, b) => a - b);
                if (activeTiers.length === 0) break;
                const minTier = activeTiers[0];
                if (pool[minTier] <= toDeduct) {
                    toDeduct -= pool[minTier];
                    delete pool[minTier];
                } else {
                    pool[minTier] -= toDeduct;
                    toDeduct = 0;
                }
            }
        }
        return pool;
    },

    // Chọn ngẫu nhiên 1 Tier dựa trên tỷ lệ của Level hiện tại
    rollTier(currentLevel) {
        const pool = this.getLevelPool(currentLevel);
        const tiers = Object.keys(pool).map(Number);
        const totalWeight = Object.values(pool).reduce((s, w) => s + w, 0);
        let rand = Math.random() * totalWeight;
        for (const tier of tiers) {
            if (rand < pool[tier]) {
                return tier;
            }
            rand -= pool[tier];
        }
        return tiers[tiers.length - 1];
    },

    // Tier cao nhất tại Level hiện tại
    getMaxTier(currentLevel) {
        return currentLevel + 3;
    },

    // Chuyển Tier sang ký hiệu chữ cái: 1=A, 2=B, 26=Z, 27=AA... 105=DA
    getTierLetter(tierIndex) {
        let label = '';
        let num = tierIndex;
        while (num > 0) {
            const rem = (num - 1) % 26;
            label = String.fromCharCode(65 + rem) + label;
            num = Math.floor((num - 1) / 26);
        }
        return label;
    },

    // Màu sắc rực rỡ đại diện cho từng Tier
    getTierColor(tierIndex) {
        const hue = ((tierIndex - 1) * 33) % 360;
        return Phaser.Display.Color.HSLToColor(hue / 360, 0.85, 0.55).color;
    }
};

// ==========================================
// THỰC THỂ QUÁI VẬT (ENEMY CLASS) - OBJECT POOLING
// ==========================================
class Enemy extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, 0, 0, 'enemy_swarmer');
        scene.physics.add.existing(this);
        this.alive = false;
        this.hp = 10;
        this.maxHp = 10;
        this.speed = 100;
        this.damage = 8;
        this.enemyType = 'swarmer';
        this.isBoss = false;
        this.isElite = false;
        this.isBerserk = false;
        this.tierIndex = 1;
        this.tierLetter = 'A';
        this.tierColor = 0xffffff;
        this.knockbackResist = 0;
        this.attackCooldown = 0;
        this.shootTimer = 0;

        // Nhãn chữ nổi hiển thị Tier trực quan trên đầu quái
        this.tierLabel = scene.add.text(0, 0, '', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2.5
        }).setOrigin(0.5).setDepth(22).setVisible(false);
    }

    // Khởi tạo quái vật theo hệ thống Sliding Tier & Anti-Camping
    spawnTier(x, y, tierIndex, currentLevel, options = {}) {
        this.setPosition(x, y);
        this.tierIndex = tierIndex || 1;
        this.tierLetter = SlidingTierManager.getTierLetter(this.tierIndex);
        this.tierColor = SlidingTierManager.getTierColor(this.tierIndex);
        this.alive = true;
        this.setActive(true);
        this.setVisible(true);
        this.setAlpha(1);

        this.isBerserk = !!options.isBerserk;
        this.isElite = !!options.isElite;
        this.isBoss = !!options.isBoss;

        const playerGuns = GlobalPlayerState.weapons || [];
        const gunCount = Math.max(1, playerGuns.length);

        // Công thức máu của quái theo đặc tả:
        // enemyHP = Math.round(22 * Math.pow(1.32, tierIndex - 1) * (1 + (playerGuns.length - 1) * 0.45));
        let hp = Math.round(22 * Math.pow(1.32, this.tierIndex - 1) * (1 + (gunCount - 1) * 0.45));

        // Buff máu nếu là Quái Bạo Loạn, Tinh Anh hoặc Trùm
        if (this.isBerserk) {
            hp = Math.round(hp * 3.0); // +200% Máu khi Bạo Loạn
        } else if (this.isElite) {
            hp = Math.round(hp * 4.5); // Mini-Elite
        } else if (this.isBoss) {
            hp = Math.round(hp * 12.0); // Trùm Boss
        }

        // Tốc độ di chuyển:
        // Từ Tier 5 trở đi: tốc độ áp sát nhanh hơn
        const tierSpeedBonus = (this.tierIndex >= 5) ? Math.min(50, (this.tierIndex - 4) * 2.5) : 0;
        let speed = 105 + tierSpeedBonus;
        if (this.isBerserk) {
            speed = Math.round(speed * 2.8); // +180% Tốc độ chạy khi Bạo Loạn!
        } else if (this.isElite) {
            speed = 90; // Mini-Elite đi chậm
        } else if (this.isBoss) {
            speed = 85;
        }

        // Sát thương:
        let damage = Math.round(5 + (this.tierIndex - 1) * 1.3 + (gunCount - 1) * 0.7);
        if (this.isBerserk) {
            damage = Math.round(damage * 2.0); // +100% Sát thương khi Bạo Loạn!
        }

        // Kháng đẩy lùi (Knockback Resistance) từ Tier 5 trở đi:
        if (this.isBoss) {
            this.knockbackResist = 1.0; // Miễn nhiễm giật lùi
        } else if (this.isElite) {
            this.knockbackResist = 0.90;
        } else if (this.tierIndex >= 5) {
            this.knockbackResist = Math.min(0.85, (this.tierIndex - 4) * 0.08);
        } else {
            this.knockbackResist = 0;
        }

        // Hình dáng đa giác & Texture theo Tier
        if (this.isBoss) {
            this.enemyType = 'boss';
            this.setTexture('enemy_boss');
            this.body.setCircle(36);
            this.expValue = 50;
            this.goldValue = 35;
            this.shootTimer = 1600;
        } else if (this.isElite) {
            this.enemyType = 'elite';
            this.setTexture('enemy_elite');
            this.body.setCircle(28);
            this.expValue = 15;
            this.goldValue = 10;
        } else {
            const shapeMod = this.tierIndex % 4;
            if (shapeMod === 1) {
                this.enemyType = 'swarmer';
                this.setTexture('enemy_swarmer');
                this.body.setCircle(14);
            } else if (shapeMod === 2) {
                this.enemyType = 'dasher';
                this.setTexture('enemy_dasher');
                this.body.setCircle(15);
            } else if (shapeMod === 3) {
                this.enemyType = 'tank';
                this.setTexture('enemy_tank');
                this.body.setCircle(18);
            } else {
                this.enemyType = 'spitter';
                this.setTexture('enemy_spitter');
                this.body.setCircle(16);
                if (currentLevel >= 5) {
                    this.shootTimer = Phaser.Math.Between(1800, 2800);
                }
            }
            this.expValue = Math.min(8, 1 + Math.floor(this.tierIndex / 4));
            this.goldValue = Math.min(5, 1 + Math.floor(this.tierIndex / 6));
        }

        // Kích thước quái lớn hơn một chút theo Tier
        const scale = this.isBoss ? 1.3 : (this.isElite ? 1.15 : Math.min(1.5, 0.85 + (this.tierIndex - 1) * 0.012));
        this.setScale(scale);

        // Màu sắc theo Tier hoặc Đỏ Rực Bạo Loạn
        if (this.isBerserk) {
            this.setTint(0xff1100);
        } else {
            this.setTint(this.tierColor);
        }

        // [SURGICAL FIX] Đảm bảo mỗi quái vật khi sinh ra đều có đầy đủ các thuộc tính số hợp lệ và fallback mặc định
        this.speed = (Number.isFinite(speed) && speed > 0) ? Number(speed) : 85;
        this.hp = (Number.isFinite(hp) && hp > 0) ? Number(hp) : 20;
        this.maxHp = this.hp;
        this.damage = (Number.isFinite(damage) && damage > 0) ? Number(damage) : 8;
        this.alive = true;
        this.active = true;
        this.setActive(true);
        this.setVisible(true);

        if (this.body) {
            this.body.enable = true;
            this.body.moves = true;
            this.body.reset(x, y);
        }

        // Hiển thị nhãn Tier trên đầu quái
        if (this.tierLabel) {
            const tag = this.isBoss ? `👑 BOSS ${this.tierLetter}` : (this.isElite ? `⭐ ELITE ${this.tierLetter}` : `T${this.tierIndex} ${this.tierLetter}`);
            this.tierLabel.setText(tag);
            this.tierLabel.setColor(this.isBerserk ? '#ff2222' : '#ffffff');
            this.tierLabel.setPosition(x, y - 18 * scale);
            this.tierLabel.setVisible(true);
        }
    }

    // Tương thích ngược với các lệnh gọi spawn cũ
    spawn(x, y, type, wave) {
        const curLvl = wave || GlobalPlayerState.currentWave || 1;
        let tier = SlidingTierManager.rollTier(curLvl);
        if (type === 'boss') {
            tier = SlidingTierManager.getMaxTier(curLvl) + 2;
            this.spawnTier(x, y, tier, curLvl, { isBoss: true });
        } else if (type === 'elite') {
            tier = SlidingTierManager.getMaxTier(curLvl) + 1;
            this.spawnTier(x, y, tier, curLvl, { isElite: true });
        } else {
            this.spawnTier(x, y, tier, curLvl);
        }
    }

    takeDamage(amount, knockAngle, knockDist) {
        if (!this.alive) return;
        this.hp -= amount;

        // Hiệu ứng giật lùi (Knockback) có tính kháng đẩy lùi từ Tier 5 trở lên
        if (knockAngle !== undefined && knockDist > 0) {
            let mult = 0.25;
            if (this.knockbackResist !== undefined) {
                mult *= (1 - this.knockbackResist);
            }
            this.x += Math.cos(knockAngle) * knockDist * mult;
            this.y += Math.sin(knockAngle) * knockDist * mult;
        }

        // Nhấp nháy màu trắng khi bị trúng đạn và khôi phục màu Tier
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => {
            if (this.alive) {
                this.setTint(this.isBerserk ? 0xff1100 : this.tierColor);
            }
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.alive = false;
        if (this.tierLabel) this.tierLabel.setVisible(false);
        this.scene.onEnemyKilled(this);
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.stop();
    }
}

// ==========================================
// THỰC THỂ GEM (EXP & GOLD) - OBJECT POOLING
// ==========================================
class Gem extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, 0, 0, 'gem_exp');
        scene.physics.add.existing(this);
        this.body.setCircle(10);
        this.alive = false;
        this.gemType = 'exp';
        this.value = 1;
    }

    spawn(x, y, gemType, value) {
        this.setPosition(x, y);
        this.gemType = gemType;
        this.value = value || 1;
        this.setTexture(gemType === 'gold' ? 'gem_gold' : 'gem_exp');
        this.alive = true;
        this.setActive(true);
        this.setVisible(true);
        this.body.reset(x, y);

        // Nảy nhẹ khi rớt ra
        this.setScale(0.3);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 250,
            ease: 'Back.easeOut'
        });
    }

    deactivate() {
        this.alive = false;
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.stop();
    }
}

// ==========================================
// SCENE 3: GAME SCENE (MAIN SURVIVOR LOOP)
// ==========================================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        window.ytSDK.bindScene(this);
        window.retroAudio.startBgm();

        this.waveTimer = GAME_CONFIG.WAVE_DURATION;
        this.elapsedTime = 0;
        this.isWaveOver = false;
        this.isGameRunning = true;
        this.isIntermission = false;
        this.isRoundPaused = false;
        this.isRoundActive = true; // Trận đấu đang diễn ra
        this.currentSkillModal = null;
        const oldModal = document.getElementById("skill-modal-overlay");
        if (oldModal) oldModal.remove();
        this.pendingSkillPicks = GlobalPlayerState.pendingSkillPicks || 0;
        GlobalPlayerState.roundGold = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 900; // Khởi đầu Pha 1 spawn mỗi 900ms (nhịp 600ms - 1000ms chuẩn)
        const curLvl = GlobalPlayerState.currentWave || 1;
        const lvlOffset = Math.max(0, curLvl - 1);
        this.maxActiveEnemies = Math.floor(6 + lvlOffset * 1);
        this.currentPhase = 1;
        this.phase3SpecialSpawned = false;
        this.isClimaxMode = false;

        // Hệ thống Chống đứng yên (Anti-Camping System)
        this.lastMovePosition = { x: 0, y: 0 };
        this.idleTimer = 0;
        this.isBerserkMode = false;
        this.berserkOrigin = { x: 0, y: 0 };
        this.lastWarnBeepTime = 0;
        this.lastSirenTime = 0;

        // Cài đặt Thế giới Physics
        this.physics.world.setBounds(0, 0, GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT);

        // 1. Tạo nền bản đồ Arena
        this.add.tileSprite(
            GAME_CONFIG.ARENA_WIDTH / 2,
            GAME_CONFIG.ARENA_HEIGHT / 2,
            GAME_CONFIG.ARENA_WIDTH,
            GAME_CONFIG.ARENA_HEIGHT,
            'tile_floor'
        );

        // Hàng rào viền bản đồ Arena phát sáng Neon
        const border = this.add.graphics();
        border.lineStyle(8, 0xef4444, 0.85);
        border.strokeRect(10, 10, GAME_CONFIG.ARENA_WIDTH - 20, GAME_CONFIG.ARENA_HEIGHT - 20);
        border.lineStyle(2, 0xfca5a5, 0.9);
        border.strokeRect(14, 14, GAME_CONFIG.ARENA_WIDTH - 28, GAME_CONFIG.ARENA_HEIGHT - 28);

        // 2. Khởi tạo Player
        this.player = this.physics.add.sprite(
            GAME_CONFIG.ARENA_WIDTH / 2,
            GAME_CONFIG.ARENA_HEIGHT / 2,
            'player'
        );
        this.player.setCollideWorldBounds(true);
        this.player.body.setCircle(20);
        this.player.setDepth(20);
        this.lastMovePosition = { x: this.player.x, y: this.player.y };

        // 3. Khởi tạo vũ khí xoay quanh Player (Orbiting Weapons)
        this.weaponSprites = [];
        this.rebuildWeaponOrbitals();

        // 4. Object Pools
        // Bullet Pool (Pool đạn)
        this.bulletPool = this.physics.add.group({
            classType: Bullet,
            maxSize: 350,
            runChildUpdate: true
        });

        // Enemy Bullet Pool (Đạn của quái bắn ra)
        this.enemyBulletPool = this.physics.add.group({
            classType: Bullet,
            maxSize: 100,
            runChildUpdate: true
        });

        // Enemy Pool (Pool quái vật)
        this.enemyPool = this.physics.add.group({
            classType: Enemy,
            maxSize: 600,
            runChildUpdate: false
        });
        this.enemies = this.enemyPool; // Tham chiếu danh sách quản lý quái vật chuẩn

        // Gem Pool (EXP & Vàng)
        this.gemPool = this.physics.add.group({
            classType: Gem,
            maxSize: 800,
            runChildUpdate: false
        });

        // Particle Emitter khi quái chết
        this.particles = this.add.particles(0, 0, 'particle', {
            speed: { min: 60, max: 220 },
            scale: { start: 1.2, end: 0 },
            lifespan: 350,
            blendMode: 'ADD',
            emitting: false
        }).setDepth(15);

        // 5. Cài đặt Camera theo dõi nhân vật
        this.cameras.main.setBounds(0, 0, GAME_CONFIG.ARENA_WIDTH, GAME_CONFIG.ARENA_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // 6. Cài đặt Hệ thống điều khiển (Bàn phím + Joystick)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.joystickVector = { x: 0, y: 0 };
        this.setupVirtualJoystick();

        // 7. Giao diện HUD (Đầu màn hình gắn cố định với Camera)
        this.createHUD();

        // 8. Va chạm Vật lý
        // Đạn người chơi trúng Quái vật
        this.physics.add.overlap(this.bulletPool, this.enemyPool, this.handleBulletHitEnemy, null, this);
        // Quái vật cắn Người chơi
        this.physics.add.overlap(this.player, this.enemyPool, this.handleEnemyTouchPlayer, null, this);
        // Đạn quái trúng Người chơi
        this.physics.add.overlap(this.player, this.enemyBulletPool, this.handleEnemyBulletHitPlayer, null, this);
        // Người chơi hút Ngọc
        this.physics.add.overlap(this.player, this.gemPool, this.handlePlayerCollectGem, null, this);

        // Đếm ngược thời gian Wave mỗi giây
        this.time.addEvent({
            delay: 1000,
            callback: this.onSecondTick,
            callbackScope: this,
            loop: true
        });

        // Tự động hồi máu (HP Regen) mỗi 1 giây
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (GlobalPlayerState.hpRegen > 0 && GlobalPlayerState.hp < GlobalPlayerState.maxHp) {
                    GlobalPlayerState.hp = Math.min(GlobalPlayerState.maxHp, GlobalPlayerState.hp + GlobalPlayerState.hpRegen);
                    this.updateHpBar();
                }
            },
            loop: true
        });
    }

    // Tái cấu trúc các vũ khí xoay quanh người chơi
    rebuildWeaponOrbitals() {
        // Dọn sprite cũ
        this.weaponSprites.forEach(w => w.sprite.destroy());
        this.weaponSprites = [];

        const count = GlobalPlayerState.weapons.length;
        for (let i = 0; i < count; i++) {
            const wpData = GlobalPlayerState.weapons[i];
            let texKey = 'wp_pistol';
            if (wpData.id === 'shotgun') texKey = 'wp_shotgun';
            else if (wpData.id === 'smg') texKey = 'wp_smg';
            else if (wpData.id === 'laser') texKey = 'wp_laser';
            else if (wpData.id === 'rocket') texKey = 'wp_rocket';
            else if (wpData.id === 'katana') texKey = 'wp_blade';

            const sprite = this.add.sprite(this.player.x, this.player.y, texKey).setDepth(22);
            this.weaponSprites.push({
                data: wpData,
                sprite: sprite,
                index: i,
                total: count,
                cooldownRemaining: 0
            });
        }
    }

    // Thiết lập Virtual Joystick cho điện thoại & màn hình cảm ứng
    setupVirtualJoystick() {
        const { width, height } = this.scale;
        const defaultX = 100;
        const defaultY = height - 100;

        this.joystickBase = this.add.image(defaultX, defaultY, 'joystick_base')
            .setScrollFactor(0)
            .setDepth(100)
            .setAlpha(0.45);

        this.joystickKnob = this.add.image(defaultX, defaultY, 'joystick_knob')
            .setScrollFactor(0)
            .setDepth(101)
            .setAlpha(0.75);

        this.isDraggingJoystick = false;

        this.input.on('pointerdown', (pointer) => {
            // Chỉ kích hoạt joystick khi đang trong trận đấu thực sự (không phải intermission hay modal)
            if (!this.isGameRunning || this.isWaveOver || this.isIntermission || this.isRoundPaused) return;
            // Nếu người chơi chạm vào nửa dưới màn hình
            if (pointer.y > height * 0.35) {
                this.isDraggingJoystick = true;
                this.joystickBase.setPosition(pointer.x, pointer.y).setAlpha(0.75);
                this.joystickKnob.setPosition(pointer.x, pointer.y).setAlpha(0.95);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isDraggingJoystick || !this.isGameRunning || this.isIntermission) return;
            const maxRadius = 50;
            const dx = pointer.x - this.joystickBase.x;
            const dy = pointer.y - this.joystickBase.y;
            const dist = Math.hypot(dx, dy);

            if (dist === 0) {
                this.joystickVector = { x: 0, y: 0 };
                return;
            }

            const clampedDist = Math.min(dist, maxRadius);
            const angle = Math.atan2(dy, dx);
            this.joystickKnob.x = this.joystickBase.x + Math.cos(angle) * clampedDist;
            this.joystickKnob.y = this.joystickBase.y + Math.sin(angle) * clampedDist;

            // Vector chuẩn hóa từ -1 đến 1
            this.joystickVector = {
                x: (Math.cos(angle) * clampedDist) / maxRadius,
                y: (Math.sin(angle) * clampedDist) / maxRadius
            };
        });

        const resetJoystick = () => {
            this.isDraggingJoystick = false;
            this.joystickVector = { x: 0, y: 0 };
            this.joystickBase.setPosition(defaultX, defaultY).setAlpha(0.45);
            this.joystickKnob.setPosition(defaultX, defaultY).setAlpha(0.75);
        };

        this.input.on('pointerup', resetJoystick);
        this.input.on('pointerupoutside', resetJoystick);
    }

    // Tạo HUD hiển thị Thông số, Thanh Máu, EXP, Thời gian Round (3 Phút)
    createHUD() {
        const { width, height } = this.scale;

        // Container cố định camera
        this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(90);

        // Header nền đen mờ sang trọng
        const topBar = this.add.graphics();
        topBar.fillStyle(0x020617, 0.88);
        topBar.fillRect(0, 0, width, 72);
        topBar.lineStyle(2, 0x1e293b, 1);
        topBar.strokeLineShape(new Phaser.Geom.Line(0, 72, width, 72));
        this.hudContainer.add(topBar);

        // 1. Đồng hồ đếm ngược Round (3 Phút = 180s) & Số Wave hiện tại
        this.waveTitleText = this.add.text(width / 2, 16, `LEVEL ${GlobalPlayerState.currentWave} / ${GAME_CONFIG.MAX_WAVES}`, {
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

        // Hiển thị số quái đang hoạt động / Giới hạn tối đa (Max Enemy Cap) kèm Tier
        this.enemyCapText = this.add.text(width / 2, 58, `👾 Quái: 0 / ${this.maxActiveEnemies}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '11px',
            color: '#94a3b8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Dòng chữ cảnh báo Anti-Camping ở giây thứ 7 (giữa màn hình)
        this.idleWarnText = this.add.text(width / 2, height * 0.40, '', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#facc15',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(250).setVisible(false);

        // Banner Quái Bạo Loạn (+200%)
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

        // 2. Thanh Máu (HP Bar) góc trái
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

        // 3. Tiền Vàng & Cấp Độ góc phải
        this.goldText = this.add.text(width - 20, 16, `💰 ${GlobalPlayerState.gold}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '17px',
            color: '#fbbf24',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        this.levelText = this.add.text(width - 20, 38, `⭐ CẤP ${GlobalPlayerState.level}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#a855f7',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        this.pendingBadge = this.add.text(width - 20, 56, `🎁 Thẻ chờ: ${this.pendingSkillPicks}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(1, 0);
        this.pendingBadge.setVisible(this.pendingSkillPicks > 0);

        this.hudContainer.add([this.goldText, this.levelText, this.pendingBadge]);

        // 4. Thanh Kinh Nghiệm (EXP Bar) trải dài dưới thanh topBar
        this.expBarGraphics = this.add.graphics();
        this.hudContainer.add(this.expBarGraphics);
        this.updateExpBar();
    }

    updateHpBar() {
        const hp = Math.max(0, GlobalPlayerState.hp);
        const max = GlobalPlayerState.maxHp;
        const pct = Phaser.Math.Clamp(hp / max, 0, 1);

        this.hpBarGraphics.clear();
        // Nền thanh máu
        this.hpBarGraphics.fillStyle(0x334155, 0.9);
        this.hpBarGraphics.fillRoundedRect(18, 14, 160, 20, 5);
        // Ruột thanh máu đỏ gradient
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

    // Đếm số lượng quái đang hoạt động trên bản đồ (phục vụ Max Enemy Cap)
    getActiveEnemyCount() {
        let count = 0;
        if (!this.enemyPool) return 0;
        const children = this.enemyPool.getChildren();
        for (let i = 0; i < children.length; i++) {
            if (children[i].alive && children[i].active) {
                count++;
            }
        }
        return count;
    }

    // ==============================================================
    // [LOCKED MODULE - DO NOT MODIFY: 3-MINUTE WAVE TIMER & PHASES]
    // ==============================================================
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

        // ==============================================================
        // KỊCH BẢN CHI TIẾT TRONG VÒNG 3 PHÚT (180 GIÂY) CHO MỖI LEVEL
        // ==============================================================
        // Pha 1 (0s - 45s): Spawn mỗi 2.0s. Max Cap = 6 + currentLevel (6 ở Lv1).
        if (elapsed < 45) {
            this.currentPhase = 1;
            this.spawnInterval = 2000;
            this.maxActiveEnemies = Math.floor(6 + lvlOffset * 1);
        }
        // Pha 2 (45s - 90s): Spawn mỗi 1.3s. Max Cap = 10 + currentLevel * 1.5 (10 ở Lv1).
        else if (elapsed >= 45 && elapsed < 90) {
            this.currentPhase = 2;
            this.spawnInterval = 1300;
            this.maxActiveEnemies = Math.floor(10 + lvlOffset * 1.5);
        }
        // Pha 3 (90s - 135s): Spawn mỗi 1.0s. Max Cap = 14 + currentLevel * 2 (14 ở Lv1).
        // Đúng giây thứ 90, xuất hiện 1 con Mini-Elite duy nhất (hoặc Boss nếu chia hết cho 10).
        else if (elapsed >= 90 && elapsed < 135) {
            this.currentPhase = 3;
            this.spawnInterval = 1000;
            this.maxActiveEnemies = Math.floor(14 + lvlOffset * 2);
            if (!this.phase3SpecialSpawned) {
                this.phase3SpecialSpawned = true;
                this.spawnPhase3Special();
            }
        }
        // Pha 4 (135s - 165s): Spawn mỗi 0.8s. Max Cap = 18 + currentLevel * 2 (18 ở Lv1).
        else if (elapsed >= 135 && elapsed < 165) {
            this.currentPhase = 4;
            this.spawnInterval = 800;
            this.maxActiveEnemies = Math.floor(18 + lvlOffset * 2);
        }
        // Pha 5 (165s - 180s - 15 GIÂY CUỐI): Chế độ Cao Trào.
        // Spawn mỗi 0.5s từ 4 góc màn hình, toàn bộ là quái máu giấy, di chuyển chậm (60% người chơi).
        // Max Cap = 25 + currentLevel * 2 (25 ở Lv1).
        else if (elapsed >= 165) {
            this.currentPhase = 5;
            this.spawnInterval = 500;
            this.maxActiveEnemies = Math.floor(25 + lvlOffset * 2);
            if (!this.isClimaxMode) {
                this.isClimaxMode = true;
                this.triggerClimaxMode();
            }
        }

        // Cập nhật text quái trên HUD
        if (this.enemyCapText) {
            this.enemyCapText.setText(`👾 Quái: ${this.getActiveEnemyCount()} / ${this.maxActiveEnemies}`);
        }

        // 5 giây cuối đổi màu vàng sang đỏ cảnh báo
        if (this.waveTimer <= 5 && this.waveTimer > 0) {
            this.timerText.setColor('#ef4444');
            window.retroAudio.playTone(400, 'sine', 0.05, 300, 0.15);
        }

        // Hết 3 phút (180s): KẾT THÚC ROUND CHIẾN ĐẤU
        if (this.waveTimer <= 0) {
            this.finishWave();
        }
    }

    // Hiển thị thông báo Banner nổi bật giữa màn hình
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

    // Xuất hiện 1 con Mini-Elite (hoặc Boss nếu chia hết cho 10) đúng giây thứ 90
    spawnPhase3Special() {
        const curWave = GlobalPlayerState.currentWave;
        const isBossWave = (curWave % 10 === 0);
        const maxTier = SlidingTierManager.getMaxTier(curWave);
        const tier = isBossWave ? (maxTier + 2) : (maxTier + 1);

        const angle = Math.random() * Math.PI * 2;
        const dist = 380;
        let sx = this.player.x + Math.cos(angle) * dist;
        let sy = this.player.y + Math.sin(angle) * dist;
        sx = Phaser.Math.Clamp(sx, 50, GAME_CONFIG.ARENA_WIDTH - 50);
        sy = Phaser.Math.Clamp(sy, 50, GAME_CONFIG.ARENA_HEIGHT - 50);

        const enemy = this.enemyPool.get();
        if (enemy) {
            enemy.spawnTier(sx, sy, tier, curWave, {
                isBoss: isBossWave,
                isElite: !isBossWave
            });
            this.cameras.main.shake(350, 0.025);
            window.retroAudio.playTone(180, 'sawtooth', 0.25, 100, 0.5);
            const notice = isBossWave
                ? `☠️ TRÙM BOSS LEVEL ${curWave} (TIER ${tier}) XUẤT HIỆN! ☠️`
                : `⚠️ MINI-ELITE TIER ${tier} (VÀNG & EXP X5) XUẤT HIỆN! ⚠️`;
            this.showBannerNotice(notice, isBossWave ? '#ef4444' : '#facc15');
        }
    }

    // Kích hoạt chế độ Cao Trào cho 15 giây cuối cùng
    triggerClimaxMode() {
        this.timerText.setColor('#ef4444');
        this.cameras.main.shake(400, 0.025);
        window.retroAudio.playTone(160, 'sawtooth', 0.25, 90, 0.55);
        this.showBannerNotice('⚡ CAO TRÀO: 15 GIÂY SINH TỒN CUỐI CÙNG! ⚡', '#f43f5e');
    }

    // VÒNG LẶP CHÍNH UPDATE
    update(time, delta) {
        if (this.isWaveOver || !this.isGameRunning || this.isIntermission || this.isRoundPaused || this.isRoundActive === false) {
            if (this.player && this.player.body) {
                this.player.body.setVelocity(0, 0);
            }
            return;
        }

        // ==============================================================
        // [LOCKED MODULE - DO NOT MODIFY: CONTROLS & JOYSTICK]
        // ==============================================================
        // 1. Xử lý di chuyển người chơi song song (Bàn phím + Joystick cùng lúc)
        let moveX = 0;
        let moveY = 0;

        // Phím Bàn Phím (WASD & 4 phím mũi tên)
        if (this.cursors.left.isDown || this.wasd.left.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) moveY += 1;

        // Joystick ảo (Cảm ứng / Mobile)
        if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
            moveX += this.joystickVector.x;
            moveY += this.joystickVector.y;
        }

        const totalSpeed = GlobalPlayerState.speed * (GlobalPlayerState.speedMult || 1);

        if (moveX !== 0 || moveY !== 0) {
            const mag = Math.hypot(moveX, moveY);
            const normX = moveX / mag;
            const normY = moveY / mag;
            this.player.body.setVelocity(normX * totalSpeed, normY * totalSpeed);

            // Chân thực: Hướng xoay người chơi nhìn theo chiều di chuyển
            this.player.setRotation(Math.atan2(normY, normX));
        } else {
            this.player.body.setVelocity(0, 0);
        }

        // ==============================================================
        // [LOCKED MODULE - DO NOT MODIFY: WEAPONS SYSTEM & AUTO-AIM]
        // ==============================================================
        // 2. Cập nhật vị trí & Tự động ngắm bắn cho các vũ khí xoay quanh (Orbiting Weapons)
        this.updateOrbitingWeapons(delta);

        // 3. Hệ thống Chống đứng yên (Anti-Camping / 10s Idle Punishment)
        const px = this.player.x;
        const py = this.player.y;

        if (this.isBerserkMode) {
            // Khi đang trong trạng thái Bạo Loạn: Bắt buộc di chuyển thoát xa > 280px tính từ vị trí kích hoạt
            const distEscaped = Phaser.Math.Distance.Between(px, py, this.berserkOrigin.x, this.berserkOrigin.y);
            this.berserkBanner.setText(`🚨 QUÁI VẬT BẠO LOẠN (+200%)! DI CHUYỂN NGAY!\n(Đã thoát: ${Math.round(distEscaped)}/280px)`);
            this.berserkBanner.setVisible(true);

            // Còi báo động nhấp nháy âm thanh
            if (!this.lastSirenTime || time - this.lastSirenTime > 650) {
                this.lastSirenTime = time;
                window.retroAudio.playTone(680, 'sawtooth', 0.16, 260, 0.45);
            }

            if (distEscaped > 280) {
                this.endBerserkMode();
            }
        } else {
            const distFromAnchor = Phaser.Math.Distance.Between(px, py, this.lastMovePosition.x, this.lastMovePosition.y);
            if (distFromAnchor < 45) {
                // Đứng yên hoặc chỉ loanh quanh bán kính < 45px
                this.idleTimer += delta / 1000;

                // Ở giây thứ 7: Cảnh báo nhấp nháy
                if (this.idleTimer >= 7) {
                    const secLeft = Math.max(1, Math.ceil(10 - this.idleTimer));
                    this.idleWarnText.setText(`⚠️ CẢNH BÁO: HÃY DI CHUYỂN!\nQuái vật sắp nổi loạn sau ${secLeft} giây...`);
                    this.idleWarnText.setVisible(true);
                    this.idleWarnText.setAlpha(0.6 + 0.4 * Math.sin(time * 0.015));

                    // Tiếng bíp cảnh báo
                    if (!this.lastWarnBeepTime || time - this.lastWarnBeepTime > 550) {
                        this.lastWarnBeepTime = time;
                        window.retroAudio.playTone(460, 'sine', 0.08, 420, 0.3);
                    }
                } else {
                    this.idleWarnText.setVisible(false);
                }

                // Khi đạt đủ 10 giây: KÍCH HOẠT BẠO LOẠN!
                if (this.idleTimer >= 10) {
                    this.triggerBerserkMode();
                }
            } else {
                // Người chơi di chuyển thoát ra ngoài 45px: cập nhật vị trí mới & reset
                this.lastMovePosition = { x: px, y: py };
                this.idleTimer = 0;
                this.idleWarnText.setVisible(false);
            }
        }

        // ==============================================================
        // [SURGICAL FIX] 4. BỘ ĐẾM VÀ KHỞI TẠO QUÁI VẬT (ENEMY SPAWNER)
        // ==============================================================
        const currentLevel = GlobalPlayerState.currentWave || 1;
        const activeCount = this.getActiveEnemyCount();
        const maxCap = (Number.isFinite(this.maxActiveEnemies) && this.maxActiveEnemies > 0)
            ? this.maxActiveEnemies
            : Math.floor(6 + (currentLevel - 1));
        const lowDensityThreshold = maxCap * 0.35;

        // Xác định nhịp sinh quái spawnInterval:
        // - Trạng thái bình thường: 600ms - 1000ms tùy từng pha trận đấu
        // - Khi ít quái hoặc Bạo loạn: khoảng cách tối thiểu giữa 2 lần sinh luôn >= 250ms (tối đa 4 đợt/giây)
        if (this.isBerserkMode) {
            this.spawnInterval = 280; // Bạo loạn: tối thiểu >= 250ms
        } else if (activeCount < lowDensityThreshold) {
            // Khi số quái trên sân ít: bù quái có kiểm soát nhịp độ (>= 350ms, không mass spawn 1 frame)
            this.spawnInterval = 350;
        } else {
            const elapsed = Number(this.elapsedTime) || 0;
            if (elapsed < 45) this.spawnInterval = 900;       // Pha 1: 900ms (khoảng 600ms - 1000ms chuẩn)
            else if (elapsed < 90) this.spawnInterval = 800;  // Pha 2: 800ms
            else if (elapsed < 135) this.spawnInterval = 700; // Pha 3: 700ms
            else if (elapsed < 165) this.spawnInterval = 600; // Pha 4: 600ms
            else this.spawnInterval = 450;                    // Pha 5 Cao trào: 450ms
        }

        // Đảm bảo an toàn không bao giờ dưới 250ms
        this.spawnInterval = Math.max(250, Number(this.spawnInterval) || 800);

        // Bộ đếm thời gian chờ spawnTimer tích lũy delta mỗi frame
        const safeDelta = (Number.isFinite(delta) && delta > 0) ? delta : 16.6;
        this.spawnTimer = (Number(this.spawnTimer) || 0) + safeDelta;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0; // Luôn reset về 0 sau mỗi lần gọi
            this.spawnEnemyCluster();
        }

        // ==============================================================
        // [SURGICAL FIX] 5. VÒNG LẶP DI CHUYỂN CỦA QUÁI VẬT (ENEMY MOVEMENT LOOP)
        // ==============================================================
        this.updateEnemies(safeDelta);

        // 6. Xử lý nam châm hút ngọc (EXP / Gold)
        this.updateGemAttraction(safeDelta);

        // Cập nhật text số lượng quái và Bậc quái trên HUD
        if (this.enemyCapText) {
            const pool = SlidingTierManager.getLevelPool(currentLevel);
            const activeTiers = Object.keys(pool).map(Number);
            const minT = activeTiers[0] || 1;
            const maxT = activeTiers[activeTiers.length - 1] || 4;
            const minL = SlidingTierManager.getTierLetter(minT);
            const maxL = SlidingTierManager.getTierLetter(maxT);

            if (this.isBerserkMode) {
                this.enemyCapText.setText(`🔥 BẠO LOẠN: ${activeCount} quái! (Tier ${maxT} ${maxL})`);
                this.enemyCapText.setColor('#ff2222');
            } else {
                this.enemyCapText.setText(`👾 Quái: ${activeCount} / ${this.maxActiveEnemies} | Bậc: T${minT}(${minL}) - T${maxT}(${maxL})`);
                this.enemyCapText.setColor('#94a3b8');
            }
        }
    }

    // Cập nhật vị trí và cơ chế tự động bắn của 1-6 vũ khí
    updateOrbitingWeapons(delta) {
        const orbitRadius = 42;
        const now = this.time.now;

        // Tìm quái vật gần người chơi nhất trong toàn bộ bán kính
        let nearestEnemy = null;
        let shortestDist = Infinity;

        this.enemyPool.getChildren().forEach(enemy => {
            if (enemy.alive) {
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (d < shortestDist) {
                    shortestDist = d;
                    nearestEnemy = enemy;
                }
            }
        });

        // Xoay nhẹ halo vũ khí liên tục
        const haloAngleOffset = (now * 0.0015);

        this.weaponSprites.forEach(item => {
            const wp = item.data;
            const baseAngle = haloAngleOffset + (item.index * Math.PI * 2) / item.total;
            const wx = this.player.x + Math.cos(baseAngle) * orbitRadius;
            const wy = this.player.y + Math.sin(baseAngle) * orbitRadius;
            item.sprite.setPosition(wx, wy);

            // Giảm hồi chiêu vũ khí
            if (item.cooldownRemaining > 0) {
                item.cooldownRemaining -= delta;
            }

            // Tầm bắn thực tế của vũ khí
            const effectiveRange = wp.range * (GlobalPlayerState.rangeMult || 1);

            // Kiểm tra xem quái gần nhất có nằm trong tầm bắn không
            if (nearestEnemy && shortestDist <= effectiveRange) {
                // Xoay nòng súng về phía quái vật
                const aimAngle = Phaser.Math.Angle.Between(wx, wy, nearestEnemy.x, nearestEnemy.y);
                item.sprite.setRotation(aimAngle);

                // Nếu vũ khí đã hồi chiêu -> BẮN!
                if (item.cooldownRemaining <= 0) {
                    this.fireWeapon(item, wx, wy, aimAngle, nearestEnemy);
                    const modifiedCooldown = wp.baseCooldown * (GlobalPlayerState.attackSpeedMult || 1);
                    item.cooldownRemaining = modifiedCooldown;
                }
            } else {
                // Nếu không có quái trong tầm, xoay theo vòng halo
                item.sprite.setRotation(baseAngle);
            }
        });
    }

    // Bắn đạn từ vũ khí
    fireWeapon(item, wx, wy, aimAngle, target) {
        const wp = item.data;

        // Tính sát thương (kèm flat damage, % damage, và chí mạng)
        let dmg = (wp.baseDamage + (GlobalPlayerState.flatDamage || 0)) * (GlobalPlayerState.damageMult || 1);
        let isCrit = Math.random() < (GlobalPlayerState.critChance || 0.05);
        if (isCrit) {
            dmg *= (GlobalPlayerState.critMult || 2.0);
        }
        dmg = Math.round(dmg);

        // Hiệu ứng giật nảy súng khi bắn (Recoil Tween)
        this.tweens.add({
            targets: item.sprite,
            scaleX: 0.8,
            scaleY: 1.3,
            duration: 80,
            yoyo: true
        });

        // Xử lý từng loại vũ khí
        if (wp.id === 'pistol') {
            window.retroAudio.shootPistol();
            const b = this.bulletPool.get();
            if (b) {
                b.fire(wx, wy, aimAngle, wp.bulletSpeed, dmg, wp.range, wp.pierce, wp.knockback, false, 0, 'bullet_normal');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'shotgun') {
            window.retroAudio.shootShotgun();
            const pellets = wp.pellets || 5;
            const spread = wp.spreadAngle || 0.45;
            for (let i = 0; i < pellets; i++) {
                const offset = (i - (pellets - 1) / 2) * (spread / (pellets - 1));
                const b = this.bulletPool.get();
                if (b) {
                    b.fire(wx, wy, aimAngle + offset, wp.bulletSpeed + Phaser.Math.Between(-30, 30), dmg, wp.range, 1, wp.knockback, false, 0, 'bullet_normal');
                    b.isCrit = isCrit;
                }
            }
        } else if (wp.id === 'smg') {
            window.retroAudio.shootSMG();
            const b = this.bulletPool.get();
            if (b) {
                const spread = (Math.random() - 0.5) * 0.15;
                b.fire(wx, wy, aimAngle + spread, wp.bulletSpeed, dmg, wp.range, 1, wp.knockback, false, 0, 'bullet_normal');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'laser') {
            window.retroAudio.shootPistol();
            const b = this.bulletPool.get();
            if (b) {
                b.fire(wx, wy, aimAngle, wp.bulletSpeed, dmg, wp.range, wp.pierce, wp.knockback, false, 0, 'bullet_normal');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'rocket') {
            window.retroAudio.shootRocket();
            const b = this.bulletPool.get();
            if (b) {
                b.fire(wx, wy, aimAngle, wp.bulletSpeed, dmg, wp.range, 1, wp.knockback, true, wp.explosionRadius, 'bullet_rocket');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'katana') {
            window.retroAudio.slash();
            // Đòn chém vòng cung cận chiến
            this.performMeleeSlash(wx, wy, aimAngle, wp.range, dmg, wp.knockback, isCrit);
        }
    }

    // Đòn chém kiếm cận chiến quét quái
    performMeleeSlash(x, y, angle, range, dmg, knockback, isCrit) {
        // Tạo hiệu ứng hình cung chém
        const slashG = this.add.graphics().setDepth(25);
        slashG.lineStyle(5, 0x10b981, 1);
        slashG.beginPath();
        slashG.arc(x, y, range, angle - 0.8, angle + 0.8, false);
        slashG.strokePath();

        this.tweens.add({
            targets: slashG,
            alpha: 0,
            duration: 160,
            onComplete: () => slashG.destroy()
        });

        // Gây sát thương toàn bộ quái trong vùng chém
        this.enemyPool.getChildren().forEach(enemy => {
            if (enemy.alive) {
                const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (d <= range + 20) {
                    const eAngle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                    const diff = Math.abs(Phaser.Math.Angle.Wrap(eAngle - angle));
                    if (diff <= 1.0) {
                        enemy.takeDamage(dmg, angle, knockback);
                        this.showDamageText(enemy.x, enemy.y, dmg, isCrit);
                        window.retroAudio.enemyHit();
                    }
                }
            }
        });
    }

    // Kích hoạt trạng thái Quái vật bạo loạn (Berserk Stampede) khi đứng yên 10s
    triggerBerserkMode() {
        if (this.isBerserkMode) return;
        this.isBerserkMode = true;
        this.idleTimer = 10;
        this.berserkOrigin = { x: this.player.x, y: this.player.y };
        this.idleWarnText.setVisible(false);

        // Hiệu ứng rung chấn mạnh & báo động
        this.cameras.main.shake(500, 0.035);
        this.cameras.main.flash(350, 255, 30, 30);
        window.retroAudio.playTone(750, 'sawtooth', 0.4, 200, 0.8);

        this.berserkBanner.setVisible(true);
        this.showBannerNotice('🚨 QUÁI VẬT BẠO LOẠN (+200%)! DI CHUYỂN NGAY! 🚨', '#ef4444');
    }

    // Tắt trạng thái bạo loạn khi người chơi đã di chuyển > 280px
    endBerserkMode() {
        this.isBerserkMode = false;
        this.idleTimer = 0;
        this.lastMovePosition = { x: this.player.x, y: this.player.y };
        this.berserkBanner.setVisible(false);
        this.idleWarnText.setVisible(false);

        window.retroAudio.playTone(480, 'sine', 0.25, 880, 0.35);
        this.showBannerNotice('✅ ĐÃ THOÁT KHỎI KHU VỰC BẠO LOẠN! QUÁI HẠ NHIỆT', '#22c55e');
    }

    // ==============================================================
    // [SURGICAL FIX] KHỞI TẠO QUÁI VẬT (ENEMY SPAWNER)
    // ==============================================================
    // Sinh cụm nhỏ chỉ từ 1 đến 2 con quái ở rìa màn hình theo từng nhịp thời gian
    spawnEnemyCluster() {
        const activeCount = this.getActiveEnemyCount();
        const maxCap = (Number.isFinite(this.maxActiveEnemies) && this.maxActiveEnemies > 0)
            ? this.maxActiveEnemies
            : 6;

        // Tuyệt đối không dùng vòng lặp while hay for đẻ 20-50 con cùng 1 frame
        // Mỗi nhịp chỉ sinh từ 1 đến 2 con quái ở rìa màn hình
        const spawnCount = this.isBerserkMode ? 2 : (activeCount < maxCap * 0.35 ? 2 : 1);

        for (let i = 0; i < spawnCount; i++) {
            // Khi không bạo loạn: tuân thủ maxActiveEnemies
            if (!this.isBerserkMode && this.getActiveEnemyCount() >= maxCap) {
                break;
            }
            this.spawnEnemy();
        }
    }

    // Sinh 1 con quái vật từ 4 cạnh/góc ngẫu nhiên có kiểm tra an toàn toàn bộ thuộc tính số
    spawnEnemy(x, y, tier, options = {}) {
        const currentLevel = GlobalPlayerState.currentWave || 1;
        const cam = this.cameras.main;
        const pad = 60;

        let sx = x;
        let sy = y;

        if (!Number.isFinite(sx) || !Number.isFinite(sy)) {
            const side = Phaser.Math.Between(0, 3);
            if (side === 0) { // Cạnh trên
                sx = Phaser.Math.Between(cam.worldView.left - pad, cam.worldView.right + pad);
                sy = cam.worldView.top - pad;
            } else if (side === 1) { // Cạnh phải
                sx = cam.worldView.right + pad;
                sy = Phaser.Math.Between(cam.worldView.top - pad, cam.worldView.bottom + pad);
            } else if (side === 2) { // Cạnh dưới
                sx = Phaser.Math.Between(cam.worldView.left - pad, cam.worldView.right + pad);
                sy = cam.worldView.bottom + pad;
            } else { // Cạnh trái
                sx = cam.worldView.left - pad;
                sy = Phaser.Math.Between(cam.worldView.top - pad, cam.worldView.bottom + pad);
            }
        }

        sx = Phaser.Math.Clamp(sx, 30, GAME_CONFIG.ARENA_WIDTH - 30);
        sy = Phaser.Math.Clamp(sy, 30, GAME_CONFIG.ARENA_HEIGHT - 30);

        let chosenTier = tier;
        if (!Number.isFinite(chosenTier)) {
            if (this.isBerserkMode) {
                chosenTier = SlidingTierManager.getMaxTier(currentLevel);
            } else {
                chosenTier = SlidingTierManager.rollTier(currentLevel);
            }
        }

        const pool = this.enemies || this.enemyPool;
        const enemy = pool ? pool.get() : null;
        if (enemy) {
            enemy.spawnTier(sx, sy, chosenTier, currentLevel, {
                isBerserk: this.isBerserkMode,
                ...options
            });

            // Đảm bảo mỗi quái vật khi sinh ra đều có đầy đủ các thuộc tính số hợp lệ và fallback mặc định
            enemy.speed = (Number.isFinite(enemy.speed) && enemy.speed > 0) ? Number(enemy.speed) : 85;
            enemy.hp = (Number.isFinite(enemy.hp) && enemy.hp > 0) ? Number(enemy.hp) : 20;
            enemy.maxHp = enemy.hp;
            enemy.damage = (Number.isFinite(enemy.damage) && enemy.damage > 0) ? Number(enemy.damage) : 8;
            enemy.active = true;
            enemy.alive = true;
            return enemy;
        }
        return null;
    }

    // Alias tương thích ngược cho các lệnh gọi spawnSingleEnemy
    spawnSingleEnemy() {
        return this.spawnEnemy();
    }

    // ==============================================================
    // [SURGICAL FIX] VÒNG LẶP DI CHUYỂN CỦA QUÁI VẬT (ENEMY MOVEMENT)
    // ==============================================================
    updateEnemies(delta) {
        if (!this.player || !this.player.active) return;
        if (this.isWaveOver || !this.isGameRunning || this.isIntermission || this.isRoundPaused || this.isRoundActive === false) {
            return;
        }

        const px = this.player.x;
        const py = this.player.y;
        const enemiesGroup = this.enemies || this.enemyPool;
        if (!enemiesGroup) return;

        const enemiesList = enemiesGroup.getChildren();
        const safeDelta = (Number.isFinite(delta) && delta > 0) ? delta : 16.6;

        for (let i = 0; i < enemiesList.length; i++) {
            const enemy = enemiesList[i];
            if (!enemy || !enemy.alive || !enemy.active) continue;

            // Đảm bảo tốc độ hợp lệ có fallback mặc định
            const speed = (Number.isFinite(enemy.speed) && enemy.speed > 0) ? Number(enemy.speed) : 85;
            enemy.speed = speed;

            // Tính góc từ từng con quái tới tọa độ hiện tại của người chơi (player.x, player.y)
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, px, py);
            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, px, py);

            // Cập nhật nhãn chữ nổi Tier trên đầu quái
            if (enemy.tierLabel && enemy.tierLabel.visible) {
                enemy.tierLabel.setPosition(enemy.x, enemy.y - 18 * (enemy.scaleY || 1));
            }

            // Hướng mắt nhìn về phía người chơi
            enemy.setRotation(angle);

            // Xử lý di chuyển theo từng chủng loại quái
            if (enemy.enemyType === 'spitter') {
                // Quái bắn xa Shooter: cơ động giữ cự ly bắn
                if (dist < 220) {
                    // Người chơi lại quá gần -> lùi lại giữ khoảng cách
                    if (enemy.body) {
                        this.physics.velocityFromRotation(angle + Math.PI, speed * 0.75, enemy.body.velocity);
                    } else {
                        const moveDist = (speed * 0.75 * safeDelta) / 1000;
                        enemy.x -= Math.cos(angle) * moveDist;
                        enemy.y -= Math.sin(angle) * moveDist;
                    }
                } else if (dist < 380) {
                    // Trong tầm bắn -> dừng lại ngắm bắn
                    if (enemy.body) {
                        enemy.body.setVelocity(0, 0);
                    }
                } else {
                    // Ngoài tầm bắn -> áp sát người chơi
                    if (enemy.body) {
                        this.physics.moveToObject(enemy, this.player, speed);
                    } else {
                        const moveDist = (speed * safeDelta) / 1000;
                        enemy.x += Math.cos(angle) * moveDist;
                        enemy.y += Math.sin(angle) * moveDist;
                    }
                }

                // Nhịp bắn đạn của Spitter
                enemy.shootTimer = (Number(enemy.shootTimer) || 0) - safeDelta;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = Phaser.Math.Between(1800, 2600);
                    this.fireEnemyBullet(enemy.x, enemy.y, angle);
                }
            } else if (enemy.enemyType === 'boss') {
                // Boss di chuyển ổn định và bắn đạn theo chu kỳ
                if (enemy.body) {
                    this.physics.moveToObject(enemy, this.player, speed);
                } else {
                    const moveDist = (speed * safeDelta) / 1000;
                    enemy.x += Math.cos(angle) * moveDist;
                    enemy.y += Math.sin(angle) * moveDist;
                }

                enemy.shootTimer = (Number(enemy.shootTimer) || 0) - safeDelta;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = 1400;
                    this.fireEnemyBullet(enemy.x, enemy.y, angle);
                }
            } else {
                // Toàn bộ quái còn lại (Swarmer, Dasher, Tank, Elite, Berserk):
                // Di chuyển dồn dập về phía người chơi bằng Arcade Physics (hoặc direct coordinate nếu không có body)
                if (enemy.body) {
                    this.physics.moveToObject(enemy, this.player, speed);
                } else {
                    const moveDist = (speed * safeDelta) / 1000;
                    enemy.x += Math.cos(angle) * moveDist;
                    enemy.y += Math.sin(angle) * moveDist;
                }
            }
        }
    }

    // Quái bắn đạn tím
    fireEnemyBullet(x, y, angle) {
        const b = this.enemyBulletPool.get();
        if (b) {
            b.fire(x, y, angle, 220, 10, 450, 1, 0, false, 0, 'bullet_enemy');
        }
    }

    // Xử lý nam châm hút ngọc (EXP / Gold)
    updateGemAttraction(delta) {
        const px = this.player.x;
        const py = this.player.y;
        const radius = GlobalPlayerState.pickupRadius || 100;

        this.gemPool.getChildren().forEach(gem => {
            if (!gem.alive) return;
            const dist = Phaser.Math.Distance.Between(gem.x, gem.y, px, py);

            if (dist <= radius) {
                // Tăng tốc bay về phía người chơi
                const angle = Phaser.Math.Angle.Between(gem.x, gem.y, px, py);
                const speed = 400 * (1 + (radius - dist) / radius);
                gem.x += Math.cos(angle) * (speed * delta) / 1000;
                gem.y += Math.sin(angle) * (speed * delta) / 1000;
            }
        });
    }

    // Xử lý đạn bắn trúng quái vật
    handleBulletHitEnemy(bullet, enemy) {
        if (!bullet.alive || !enemy.alive) return;
        if (bullet.hitEnemies.has(enemy)) return; // Không gây sát thương lặp cùng 1 quái

        bullet.hitEnemies.add(enemy);
        bullet.hitsCount++;

        const angle = bullet.rotation;
        enemy.takeDamage(bullet.damage, angle, bullet.knockback);

        // Hiển thị số sát thương nhảy lên
        this.showDamageText(enemy.x, enemy.y, bullet.damage, bullet.isCrit);
        window.retroAudio.enemyHit();

        // Xử lý đạn nổ diện rộng (Rocket)
        if (bullet.isExplosive) {
            this.createExplosionAoE(bullet.x, bullet.y, bullet.explosionRadius, bullet.damage);
            bullet.deactivate();
            return;
        }

        // Xử lý độ xuyên phá của đạn
        if (bullet.hitsCount >= bullet.pierce) {
            bullet.deactivate();
        }
    }

    // Nổ diện rộng AoE
    createExplosionAoE(x, y, radius, damage) {
        const wave = this.add.sprite(x, y, 'shockwave').setDepth(24);
        wave.setScale(0.2);
        this.tweens.add({
            targets: wave,
            scaleX: radius / 30,
            scaleY: radius / 30,
            alpha: 0,
            duration: 250,
            onComplete: () => wave.destroy()
        });

        this.enemyPool.getChildren().forEach(enemy => {
            if (enemy.alive) {
                const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (d <= radius) {
                    const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                    enemy.takeDamage(Math.round(damage * 0.8), angle, 120);
                }
            }
        });
    }

    // Quái va chạm người chơi
    handleEnemyTouchPlayer(player, enemy) {
        if (!enemy.alive || this.isWaveOver) return;

        const now = this.time.now;
        if (this.lastHurtTime && now - this.lastHurtTime < 400) return; // Bất tử ngắn
        this.lastHurtTime = now;

        // Tính giáp giảm sát thương
        const armorReduction = Math.min(0.7, (GlobalPlayerState.armor || 0) * 0.04);
        const actualDmg = Math.max(1, Math.round(enemy.damage * (1 - armorReduction)));

        GlobalPlayerState.hp -= actualDmg;
        this.updateHpBar();
        window.retroAudio.playerHurt();

        // Rung màn hình khi người chơi trúng đòn
        this.cameras.main.shake(180, 0.015);

        // Nhấp nháy đỏ
        this.player.setTintFill(0xff0000);
        this.time.delayedCall(120, () => this.player.clearTint());

        // Kiểm tra chết
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

    // Người chơi nhặt ngọc EXP hoặc Vàng
    handlePlayerCollectGem(player, gem) {
        if (!gem.alive) return;

        if (gem.gemType === 'gold') {
            GlobalPlayerState.gold += gem.value;
            GlobalPlayerState.roundGold = (GlobalPlayerState.roundGold || 0) + gem.value;
            this.goldText.setText(`💰 ${GlobalPlayerState.gold}`);
            window.retroAudio.gemPickup();
        } else {
            // EXP
            GlobalPlayerState.exp += gem.value;
            GlobalPlayerState.score += gem.value * 10;
            window.retroAudio.gemPickup();

            // Kiểm tra Thăng Cấp (Level Up) - TUYỆT ĐỐI KHÔNG MỞ POPUP TRONG TRẬN ĐẤU!
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

    // Thông báo Level Up nhẹ nhàng trong trận mà không gián đoạn nhịp chơi
    handleLevelUpNotification(count) {
        this.levelText.setText(`⭐ CẤP ${GlobalPlayerState.level}`);
        if (this.pendingBadge) {
            this.pendingBadge.setText(`🎁 Thẻ chờ: ${this.pendingSkillPicks}`);
            this.pendingBadge.setVisible(true);
        }

        // Âm thanh level up
        window.retroAudio.levelUp();

        // Hiệu ứng chữ nổi LEVEL UP bay lên nhẹ nhàng không dừng trận đấu
        const txt = this.add.text(this.player.x, this.player.y - 30, `⭐ LEVEL UP! (+${count} THẺ CHỜ)`, {
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

    // Sự kiện khi tiêu diệt 1 quái vật
    onEnemyKilled(enemy) {
        GlobalPlayerState.enemiesKilled++;
        GlobalPlayerState.score += (enemy.isBoss ? 500 : (enemy.isElite ? 250 : 25));

        // Âm thanh nổ
        window.retroAudio.enemyExplode();

        // Hiệu ứng hạt văng tung tóe
        const particleCount = enemy.isBoss ? 50 : (enemy.isElite ? 35 : 12);
        this.particles.emitParticleAt(enemy.x, enemy.y, particleCount);

        // Xử lý rớt Ngọc EXP & Tiền Vàng
        if (enemy.isElite) {
            // Mini-Elite: Rơi gấp 5 lần vàng & EXP (5 viên EXP giá trị 3 = 15 EXP, 5 viên Vàng giá trị 2 = 10 Vàng)
            for (let i = 0; i < 5; i++) {
                const ox = Phaser.Math.Between(-35, 35);
                const oy = Phaser.Math.Between(-35, 35);
                const expGem = this.gemPool.get();
                if (expGem) expGem.spawn(enemy.x + ox, enemy.y + oy, 'exp', 3);
            }
            for (let i = 0; i < 5; i++) {
                const ox = Phaser.Math.Between(-30, 30);
                const oy = Phaser.Math.Between(-30, 30);
                const goldGem = this.gemPool.get();
                if (goldGem) goldGem.spawn(enemy.x + ox, enemy.y + oy, 'gold', 2);
            }
            this.showBannerNotice('⭐ TIÊU DIỆT MINI-ELITE! +VÀNG & EXP X5! ⭐', '#facc15');
        } else if (enemy.isBoss) {
            // Trùm Boss mỗi 10 Level
            for (let i = 0; i < 15; i++) {
                const expGem = this.gemPool.get();
                if (expGem) expGem.spawn(enemy.x + Phaser.Math.Between(-50, 50), enemy.y + Phaser.Math.Between(-50, 50), 'exp', 4);
            }
            for (let i = 0; i < 10; i++) {
                const goldGem = this.gemPool.get();
                if (goldGem) goldGem.spawn(enemy.x + Phaser.Math.Between(-45, 45), enemy.y + Phaser.Math.Between(-45, 45), 'gold', 3);
            }
            this.showBannerNotice('👑 ĐẠI THẮNG TRÙM BOSS OVERLORD! 👑', '#ef4444');
        } else {
            // Quái thường
            const expGem = this.gemPool.get();
            if (expGem) {
                expGem.spawn(enemy.x, enemy.y, 'exp', enemy.expValue || 1);
            }
            // Tỉ lệ rớt thêm Vàng (cân đối kinh tế game)
            if (Math.random() < 0.40) {
                const goldGem = this.gemPool.get();
                if (goldGem) {
                    goldGem.spawn(enemy.x + Phaser.Math.Between(-12, 12), enemy.y + Phaser.Math.Between(-12, 12), 'gold', enemy.goldValue || 1);
                }
            }
        }
    }

    // Hiển thị số sát thương nhảy lên (Floating Damage Text)
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

    // KẾT THÚC ROUND CHIẾN ĐẤU (Hết 3 phút đếm ngược)
    finishWave() {
        this.isWaveOver = true;
        this.isGameRunning = false;
        this.isRoundActive = false;
        if (this.player && this.player.body) {
            this.player.body.setVelocity(0, 0);
        }

        window.retroAudio.waveComplete();

        // 0. Reset Anti-Camping và ẩn các nhãn Tier
        this.isBerserkMode = false;
        this.idleTimer = 0;
        if (this.idleWarnText) this.idleWarnText.setVisible(false);
        if (this.berserkBanner) this.berserkBanner.setVisible(false);
        this.enemyPool.getChildren().forEach(e => {
            if (e.tierLabel) e.tierLabel.setVisible(false);
        });

        // 1. Quét sạch toàn bộ quái còn sót trên bản đồ
        this.enemyPool.getChildren().forEach(enemy => {
            if (enemy.alive) {
                this.particles.emitParticleAt(enemy.x, enemy.y, 10);
                GlobalPlayerState.score += (enemy.isBoss ? 500 : 25);
                enemy.die();
            }
        });

        // 2. Tự động thu gom toàn bộ ngọc & vàng còn trên sàn
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

        // Kiểm tra nếu lượng EXP gom về đủ để lên thêm cấp
        while (GlobalPlayerState.exp >= GlobalPlayerState.expToLevel) {
            GlobalPlayerState.exp -= GlobalPlayerState.expToLevel;
            GlobalPlayerState.level++;
            this.pendingSkillPicks++;
            GlobalPlayerState.pendingSkillPicks = this.pendingSkillPicks;
            GlobalPlayerState.expToLevel = Math.round(GlobalPlayerState.expToLevel * 1.3);
        }
        this.goldText.setText(`💰 ${GlobalPlayerState.gold}`);
        this.levelText.setText(`⭐ CẤP ${GlobalPlayerState.level}`);

        // Banner thông báo hoàn thành Vòng đấu
        const { width, height } = this.scale;
        const banner = this.add.text(width / 2, height / 2, `HOÀN THÀNH VÒNG ${GlobalPlayerState.currentWave}!`, {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '32px',
            color: '#10b981',
            fontStyle: 'bold',
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

        // Lưu kỷ lục tạm thời
        window.ytSDK.saveGameProgress(GlobalPlayerState.score, GlobalPlayerState.currentWave);

        this.time.delayedCall(1400, () => {
            banner.destroy();
            // Nếu có các cấp độ đã đạt được trong vòng đấu -> Mở Round Intermission chọn thẻ
            if (this.pendingSkillPicks > 0) {
                this.startIntermissionSkillPicks();
            } else {
                this.proceedToShopOrVictory();
            }
        });
    }

    // ==============================================================
    // [LOCKED MODULE - DO NOT MODIFY: SKILL PICK POPUP & HITBOX]
    // ==============================================================
    // MÀN HÌNH TỔNG KẾT VÒNG ĐẤU: Lần lượt chọn 1 trong 3 thẻ kỹ năng
    // SỬA TRIỆT ĐỂ: Dùng isRoundPaused = true và HTML/CSS Overlay nằm trên Canvas đảm bảo Hitbox & Click 100% không bao giờ trượt
    startIntermissionSkillPicks() {
        this.isRoundPaused = true;
        this.isIntermission = true;
        this.isGameRunning = false;
        if (this.player && this.player.body) {
            this.player.body.setVelocity(0, 0);
        }

        // Vô hiệu hóa và ẩn vùng chạm Virtual Joystick để không che mất sự kiện click chuột/chạm
        if (this.joystickBase) this.joystickBase.setVisible(false);
        if (this.joystickKnob) this.joystickKnob.setVisible(false);

        // Xóa modal cũ nếu có
        const oldDomModal = document.getElementById('skill-modal-overlay');
        if (oldDomModal) oldDomModal.remove();

        if (this.currentSkillModal) {
            this.currentSkillModal.destroy();
            this.currentSkillModal = null;
        }

        if (this.pendingSkillPicks <= 0) {
            this.proceedToShopOrVictory();
            return;
        }

        // Lấy ngẫu nhiên 3 thẻ từ LEVEL_UP_CARDS
        const allCards = [...window.GAME_DATA.LEVEL_UP_CARDS];
        Phaser.Utils.Array.Shuffle(allCards);
        const offeredCards = allCards.slice(0, 3);

        const self = this;
        const container = document.getElementById('game-container') || document.body;

        const overlay = document.createElement('div');
        overlay.id = 'skill-modal-overlay';

        const colorToHex = (c) => {
            if (typeof c === 'number') {
                return '#' + c.toString(16).padStart(6, '0');
            }
            return c || '#38bdf8';
        };

        let cardsHtml = '';
        offeredCards.forEach((card, idx) => {
            const borderColor = colorToHex(card.color);
            const iconText = card.title.slice(0, 2);
            const rarityColor = card.rarity === 'Epic' ? '#f472b6' : (card.rarity === 'Rare' ? '#fde047' : '#7dd3fc');

            cardsHtml += `
                <div class="skill-card" data-index="${idx}" style="border-color: ${borderColor};">
                    <div class="skill-icon-circle" style="border-color: ${borderColor}; color: ${borderColor};">
                        ${iconText}
                    </div>
                    <div class="skill-card-title">${card.title}</div>
                    <div class="skill-card-rarity" style="color: ${rarityColor};">[${card.rarity}]</div>
                    <div class="skill-card-desc">${card.desc}</div>
                    <button class="select-skill-btn" data-index="${idx}">CHỌN KỸ NĂNG</button>
                </div>
            `;
        });

        overlay.innerHTML = `
            <div class="skill-modal-header">
                <div class="skill-modal-title">⭐ TỔNG KẾT VÒNG: CHỌN KỸ NĂNG ⭐</div>
                <div class="skill-modal-subtitle">Bạn còn ${this.pendingSkillPicks} lượt chọn thẻ kỹ năng tích lũy!</div>
            </div>
            <div class="skill-cards-grid">
                ${cardsHtml}
            </div>
        `;

        container.appendChild(overlay);

        let selectionLocked = false;
        const pickCard = (cardIndex) => {
            if (selectionLocked) return;
            selectionLocked = true;

            const selectedCard = offeredCards[cardIndex];
            if (!selectedCard) return;

            // 1. Phát âm thanh xác nhận
            window.retroAudio.buy();

            // 2. Áp dụng ngay chỉ số kỹ năng cho nhân vật
            selectedCard.apply(GlobalPlayerState);
            self.pendingSkillPicks--;
            GlobalPlayerState.pendingSkillPicks = self.pendingSkillPicks;

            self.updateHpBar();
            self.updateExpBar();
            self.rebuildWeaponOrbitals();
            if (self.pendingBadge) {
                self.pendingBadge.setText(`🎁 Thẻ chờ: ${self.pendingSkillPicks}`);
                self.pendingBadge.setVisible(self.pendingSkillPicks > 0);
            }

            // 3. Xóa bỏ hoàn toàn Popup kỹ năng khỏi màn hình
            overlay.remove();

            // 4. Nếu còn lượt chọn tiếp tục mở lượt kế tiếp, ngược lại chuyển sang Cửa hàng (Shop)
            if (self.pendingSkillPicks > 0) {
                self.startIntermissionSkillPicks();
            } else {
                self.proceedToShopOrVictory();
            }
        };

        // Gắn sự kiện click trực tiếp cho nút bấm và toàn bộ thẻ
        overlay.querySelectorAll('.select-skill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                pickCard(idx);
            });
        });

        overlay.querySelectorAll('.skill-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const idx = parseInt(card.getAttribute('data-index'), 10);
                pickCard(idx);
            });
        });
    }

    proceedToShopOrVictory() {
        const overlay = document.getElementById('skill-modal-overlay');
        if (overlay) overlay.remove();

        this.isRoundPaused = false;
        this.isIntermission = false;

        // Bật lại Virtual Joystick khi bắt đầu vòng mới
        if (this.joystickBase) this.joystickBase.setVisible(true);
        if (this.joystickKnob) this.joystickKnob.setVisible(true);

        // Nếu vừa hoàn thành Level 100 -> CHIẾN THẮNG TUYỆT ĐỐI!
        if (GlobalPlayerState.currentWave >= GAME_CONFIG.MAX_WAVES) {
            this.scene.start('VictoryScene');
        } else {
            // Chuyển sang Cửa Hàng (Shop Scene)
            this.scene.start('ShopScene');
        }
    }

    // NGƯỜI CHƠI BỊ HẾT MÁU (GAME OVER)
    handlePlayerGameOver() {
        const overlay = document.getElementById("skill-modal-overlay");
        if (overlay) overlay.remove();
        this.isWaveOver = true;
        this.isGameRunning = false;
        window.retroAudio.defeat();
        window.retroAudio.stopBgm();

        this.physics.pause();
        this.cameras.main.shake(300, 0.025);

        // Lưu điểm kỷ lục và chuyển GameOverScene
        window.ytSDK.saveGameProgress(GlobalPlayerState.score, GlobalPlayerState.currentWave);

        this.time.delayedCall(1200, () => {
            this.scene.start('GameOverScene');
        });
    }
}

// ==============================================================
// [LOCKED MODULE - DO NOT MODIFY: SHOP SYSTEM]
// ==============================================================
// SCENE 4: SHOP SCENE (CỬA HÀNG GIỮA CÁC WAVE)
// ==========================================
class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    create() {
        window.ytSDK.bindScene(this);
        const { width, height } = this.scale;
        this.rerollCost = 5;

        // Bảng giá tăng dần cho các nâng cấp vĩnh viễn (tăng 25% sau mỗi lần mua)
        if (!GlobalPlayerState.upgradePrices) {
            GlobalPlayerState.upgradePrices = {
                damage: 25,
                hp: 30,
                speed: 20
            };
        }

        // Chọn vũ khí ngẫu nhiên cho slot bán vũ khí
        this.currentGunOffer = this.getRandomWeaponOffer();

        // Background công nghệ tối màu
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x020617, 0x020617, 1);
        bg.fillRect(0, 0, width, height);

        // Header Tiêu đề Shop
        this.titleText = this.add.text(width / 2, 28, `🛒 CỬA HÀNG LEVEL ${GlobalPlayerState.currentWave} / ${GAME_CONFIG.MAX_WAVES}`, {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '20px',
            color: '#38bdf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Tiền vàng hiện có & tiền vàng nhặt được trong vòng
        this.goldDisplay = this.add.text(width / 2, 54, `VÀNG HIỆN CÓ: 💰 ${GlobalPlayerState.gold}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '18px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const roundGoldEarned = GlobalPlayerState.roundGold || 0;
        this.roundGoldText = this.add.text(width / 2, 74, `(Vàng nhặt được trong vòng vừa qua: +💰${roundGoldEarned})`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#38bdf8'
        }).setOrigin(0.5);

        // Khung hiển thị 6 vũ khí đang trang bị
        this.createEquippedWeaponsPanel(width, height);

        // Khung 4 thẻ nâng cấp dài hạn & súng mới
        this.shopItemsContainer = this.add.container(0, 0);
        this.renderShopUpgradeCards();

        // Nút Reroll (Làm mới cửa hàng)
        this.createRerollButton(width, height);

        // Nút NEXT ROUND (Tiến vào vòng đấu tiếp theo)
        this.createNextRoundButton(width, height);

        // Bảng tóm tắt chỉ số ở đáy màn hình
        this.createStatsFooter(width, height);
    }

    getRandomWeaponOffer() {
        const weapons = Object.values(window.GAME_DATA.WEAPON_TYPES);
        return Phaser.Utils.Array.GetRandom(weapons);
    }

    createEquippedWeaponsPanel(width, height) {
        this.weaponsHeader = this.add.text(width / 2, 98, `KHO VŨ KHÍ TRANG BỊ (${GlobalPlayerState.weapons.length} / ${GAME_CONFIG.MAX_WEAPONS} Ô)`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#94a3b8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.weaponsContainer = this.add.container(0, 0);
        this.renderEquippedWeapons();
    }

    renderEquippedWeapons() {
        this.weaponsContainer.removeAll(true);
        const slotY = 132;
        const slotWidth = 92;
        const slotHeight = 44;
        const totalSlots = GAME_CONFIG.MAX_WEAPONS;
        const spacing = 112;
        const startX = 400 - ((totalSlots - 1) * spacing) / 2;

        this.weaponsHeader.setText(`KHO VŨ KHÍ TRANG BỊ (${GlobalPlayerState.weapons.length} / ${GAME_CONFIG.MAX_WEAPONS} Ô)`);

        for (let i = 0; i < totalSlots; i++) {
            const slotX = startX + i * spacing;
            const wp = GlobalPlayerState.weapons[i];

            const box = this.add.graphics();
            box.fillStyle(0x1e293b, 0.9);
            box.fillRoundedRect(slotX - slotWidth / 2, slotY - slotHeight / 2, slotWidth, slotHeight, 8);
            box.lineStyle(2, wp ? 0x38bdf8 : 0x334155, 1);
            box.strokeRoundedRect(slotX - slotWidth / 2, slotY - slotHeight / 2, slotWidth, slotHeight, 8);
            this.weaponsContainer.add(box);

            if (wp) {
                let texKey = 'wp_pistol';
                if (wp.id === 'shotgun') texKey = 'wp_shotgun';
                else if (wp.id === 'smg') texKey = 'wp_smg';
                else if (wp.id === 'laser') texKey = 'wp_laser';
                else if (wp.id === 'rocket') texKey = 'wp_rocket';
                else if (wp.id === 'katana') texKey = 'wp_blade';

                const icon = this.add.sprite(slotX - 22, slotY, texKey).setScale(0.95);
                const nameStr = wp.name.split(' ')[0];
                const wpName = this.add.text(slotX + 12, slotY - 7, nameStr, {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '11px',
                    color: '#e2e8f0',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                // Nút Bán lại vũ khí hoàn tiền (60% giá)
                const refund = Math.max(10, Math.round((wp.price || 30) * 0.6));
                const sellBtn = this.add.text(slotX + 12, slotY + 8, `Bán 💰${refund}`, {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '10px',
                    color: '#fbbf24',
                    fontStyle: 'bold'
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });

                sellBtn.on('pointerdown', () => {
                    GlobalPlayerState.weapons.splice(i, 1);
                    GlobalPlayerState.gold += refund;
                    window.retroAudio.buy();
                    this.updateGoldDisplay();
                    this.renderEquippedWeapons();
                    this.renderShopUpgradeCards();
                });

                this.weaponsContainer.add([icon, wpName, sellBtn]);
            } else {
                const emptyTxt = this.add.text(slotX, slotY, '+ TRỐNG', {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '12px',
                    color: '#64748b'
                }).setOrigin(0.5);
                this.weaponsContainer.add(emptyTxt);
            }
        }
    }

    updateGoldDisplay() {
        this.goldDisplay.setText(`VÀNG HIỆN CÓ: 💰 ${GlobalPlayerState.gold}`);
        this.updateStatsFooter();
    }

    // Hiển thị 4 thẻ nâng cấp dài hạn & súng mới theo đúng 4 tiêu chí yêu cầu
    renderShopUpgradeCards() {
        this.shopItemsContainer.removeAll(true);
        const { width } = this.scale;

        const cardWidth = 180;
        const cardHeight = 220;
        const cardY = 280;
        const cardXPositions = [105, 301, 497, 693];

        const basePrice = this.currentGunOffer.price || 35;
        const currentGunsCount = GlobalPlayerState.weapons.length;
        const currentRound = GlobalPlayerState.currentWave;
        const gunPrice = Math.round(basePrice * Math.pow(1.5, currentGunsCount) + Math.min(60, (currentRound - 1) * 3));

        const cardsData = [
            // 1. TĂNG SÁT THƯƠNG VĨNH VIỄN (+25% giá mỗi lần mua)
            {
                id: 'dmg',
                title: '💥 Tăng Sát Thương',
                tag: '+10% Vĩnh Viễn',
                color: 0xef4444,
                desc: 'Tăng 10% sát thương cho tất cả các loại vũ khí.',
                currentVal: `Hiện tại: +${Math.round((GlobalPlayerState.damageMult - 1) * 100)}%`,
                price: GlobalPlayerState.upgradePrices.damage,
                canBuy: () => GlobalPlayerState.gold >= GlobalPlayerState.upgradePrices.damage,
                onBuy: () => {
                    const p = GlobalPlayerState.upgradePrices.damage;
                    GlobalPlayerState.gold -= p;
                    GlobalPlayerState.damageMult = (GlobalPlayerState.damageMult || 1) + 0.10;
                    GlobalPlayerState.upgradePrices.damage = Math.round(p * 1.25);
                }
            },
            // 2. TĂNG GIÁP / MÁU TỐI ĐA (+25% giá mỗi lần mua)
            {
                id: 'hp_armor',
                title: '❤️ Giáp & Máu Max',
                tag: '+25 HP & Hồi Đầy',
                color: 0x10b981,
                desc: '+25 Máu tối đa, +1 Giáp và hồi phục đầy bình máu.',
                currentVal: `Máu: ${Math.round(GlobalPlayerState.hp)}/${GlobalPlayerState.maxHp} | Giáp: ${GlobalPlayerState.armor}`,
                price: GlobalPlayerState.upgradePrices.hp,
                canBuy: () => GlobalPlayerState.gold >= GlobalPlayerState.upgradePrices.hp,
                onBuy: () => {
                    const p = GlobalPlayerState.upgradePrices.hp;
                    GlobalPlayerState.gold -= p;
                    GlobalPlayerState.maxHp += 25;
                    GlobalPlayerState.armor = (GlobalPlayerState.armor || 0) + 1;
                    GlobalPlayerState.hp = GlobalPlayerState.maxHp;
                    GlobalPlayerState.upgradePrices.hp = Math.round(p * 1.25);
                }
            },
            // 3. TĂNG TỐC ĐỘ DI CHUYỂN (+25% giá mỗi lần mua)
            {
                id: 'speed',
                title: '👟 Tốc Di Chuyển',
                tag: '+15% Tốc Chạy',
                color: 0x38bdf8,
                desc: 'Tăng 15% tốc độ di chuyển giúp né quái linh hoạt.',
                currentVal: `Hiện tại: +${Math.round((GlobalPlayerState.speedMult - 1) * 100)}%`,
                price: GlobalPlayerState.upgradePrices.speed,
                canBuy: () => GlobalPlayerState.gold >= GlobalPlayerState.upgradePrices.speed,
                onBuy: () => {
                    const p = GlobalPlayerState.upgradePrices.speed;
                    GlobalPlayerState.gold -= p;
                    GlobalPlayerState.speedMult = (GlobalPlayerState.speedMult || 1) + 0.15;
                    GlobalPlayerState.upgradePrices.speed = Math.round(p * 1.25);
                }
            },
            // 4. THÊM Ô TRANG BỊ / MUA SÚNG MỚI (GIÁ TĂNG LŨY TIẾN THEO SỐ SÚNG VÀ ROUND)
            {
                id: 'weapon',
                title: `🔫 ${this.currentGunOffer.name.split(' ')[0]}`,
                tag: `Súng ${GlobalPlayerState.weapons.length + 1} / ${GAME_CONFIG.MAX_WEAPONS}`,
                color: 0xfacc15,
                desc: this.currentGunOffer.description,
                currentVal: `Sát thương: ${this.currentGunOffer.baseDamage} | Tốc: ${((this.currentGunOffer.baseCooldown || 600) / 1000).toFixed(1)}s`,
                price: gunPrice,
                isWeaponSlot: true,
                canBuy: () => {
                    const hasSpace = GlobalPlayerState.weapons.length < GAME_CONFIG.MAX_WEAPONS;
                    const canAfford = GlobalPlayerState.gold >= gunPrice;
                    return hasSpace && canAfford;
                },
                onBuy: () => {
                    GlobalPlayerState.gold -= gunPrice;
                    GlobalPlayerState.weapons.push(JSON.parse(JSON.stringify(this.currentGunOffer)));
                    this.currentGunOffer = this.getRandomWeaponOffer();
                }
            }
        ];

        cardsData.forEach((cData, idx) => {
            const cardX = cardXPositions[idx];
            const card = this.add.container(cardX, cardY);

            const bgG = this.add.graphics();
            bgG.fillStyle(0x1e293b, 0.95);
            bgG.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
            bgG.lineStyle(2, cData.color, 1);
            bgG.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);

            const title = this.add.text(0, -cardHeight / 2 + 18, cData.title, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '15px',
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);

            const tag = this.add.text(0, -cardHeight / 2 + 38, `[${cData.tag}]`, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '11px',
                color: '#38bdf8',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const desc = this.add.text(0, -cardHeight / 2 + 75, cData.desc, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '11px',
                color: '#94a3b8',
                align: 'center',
                wordWrap: { width: cardWidth - 18 }
            }).setOrigin(0.5);

            const statVal = this.add.text(0, -cardHeight / 2 + 125, cData.currentVal, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '11px',
                color: '#facc15',
                align: 'center',
                wordWrap: { width: cardWidth - 16 }
            }).setOrigin(0.5);

            // Nút Mua (BUY BUTTON)
            const canAfford = cData.canBuy();
            const isFullWeapons = cData.isWeaponSlot && GlobalPlayerState.weapons.length >= GAME_CONFIG.MAX_WEAPONS;

            const buyBtn = this.add.container(0, cardHeight / 2 - 32);
            const btnW = 140;
            const btnH = 34;

            const buyG = this.add.graphics();
            const btnColor = isFullWeapons ? 0x475569 : (canAfford ? 0x10b981 : 0x334155);
            buyG.fillStyle(btnColor, 1);
            buyG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
            buyG.lineStyle(2, canAfford && !isFullWeapons ? 0x34d399 : 0x475569, 1);
            buyG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);

            let btnLabel = `MUA: 💰${cData.price}`;
            if (isFullWeapons) btnLabel = 'ĐẦY 6 Ô SÚNG';
            else if (!canAfford) btnLabel = `THIẾU VÀNG (💰${cData.price})`;

            const buyText = this.add.text(0, 0, btnLabel, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: isFullWeapons ? '11px' : '12px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            buyBtn.add([buyG, buyText]);
            buyBtn.setSize(btnW, btnH);

            if (canAfford && !isFullWeapons) {
                buyBtn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);
                buyBtn.input.cursor = 'pointer';

                buyBtn.on('pointerover', () => {
                    buyG.clear();
                    buyG.fillStyle(0x059669, 1);
                    buyG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
                    buyG.lineStyle(2, 0x6ee7b7, 1);
                    buyG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
                });

                buyBtn.on('pointerout', () => {
                    buyG.clear();
                    buyG.fillStyle(btnColor, 1);
                    buyG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
                    buyG.lineStyle(2, 0x34d399, 1);
                    buyG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
                });

                buyBtn.on('pointerdown', () => {
                    cData.onBuy();
                    window.retroAudio.buy();
                    this.updateGoldDisplay();
                    this.renderEquippedWeapons();
                    this.renderShopUpgradeCards();
                });
            }

            card.add([bgG, title, tag, desc, statVal, buyBtn]);
            this.shopItemsContainer.add(card);
        });
    }

    createRerollButton(width, height) {
        const btnY = 445;
        const rerollBtn = this.add.container(width / 2 - 150, btnY);
        const btnW = 220;
        const btnH = 44;

        const g = this.add.graphics();
        const canAfford = GlobalPlayerState.gold >= this.rerollCost;
        g.fillStyle(canAfford ? 0x334155 : 0x1e293b, 1);
        g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 22);
        g.lineStyle(2, canAfford ? 0x64748b : 0x334155, 1);
        g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 22);

        const txt = this.add.text(0, 0, `🎲 LÀM MỚI (💰${this.rerollCost})`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: canAfford ? '#ffffff' : '#64748b',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        rerollBtn.add([g, txt]);
        rerollBtn.setSize(btnW, btnH);

        if (canAfford) {
            rerollBtn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);
            rerollBtn.input.cursor = 'pointer';

            rerollBtn.on('pointerdown', () => {
                if (GlobalPlayerState.gold >= this.rerollCost) {
                    GlobalPlayerState.gold -= this.rerollCost;
                    this.rerollCost += 2;
                    this.currentGunOffer = this.getRandomWeaponOffer();
                    window.retroAudio.reroll();
                    this.updateGoldDisplay();
                    this.renderShopUpgradeCards();
                    this.createRerollButton(width, height);
                }
            });
        }
    }

    createNextRoundButton(width, height) {
        const btnY = 445;
        const nextBtn = this.add.container(width / 2 + 150, btnY);
        const btnW = 260;
        const btnH = 46;

        const g = this.add.graphics();
        g.fillStyle(0x0284c7, 1);
        g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 23);
        g.lineStyle(3, 0x38bdf8, 1);
        g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 23);

        const txt = this.add.text(0, 0, `TIẾP TỤC ⚔️ LEVEL ${GlobalPlayerState.currentWave + 1}`, {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        nextBtn.add([g, txt]);
        nextBtn.setSize(btnW, btnH);
        nextBtn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);
        nextBtn.input.cursor = 'pointer';

        nextBtn.on('pointerover', () => {
            g.clear();
            g.fillStyle(0x0ea5e9, 1);
            g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 23);
            g.lineStyle(3, 0xbae6fd, 1);
            g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 23);
        });

        nextBtn.on('pointerout', () => {
            g.clear();
            g.fillStyle(0x0284c7, 1);
            g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 23);
            g.lineStyle(3, 0x38bdf8, 1);
            g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 23);
        });

        nextBtn.on('pointerdown', () => {
            window.retroAudio.waveComplete();
            GlobalPlayerState.currentWave++;
            this.scene.start('GameScene');
        });
    }

    createStatsFooter(width, height) {
        this.statsFooterText = this.add.text(width / 2, 515, '', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            color: '#94a3b8'
        }).setOrigin(0.5);
        this.updateStatsFooter();
    }

    updateStatsFooter() {
        if (!this.statsFooterText) return;
        const hpStr = `${Math.round(GlobalPlayerState.hp)}/${GlobalPlayerState.maxHp}`;
        const dmgStr = `+${Math.round((GlobalPlayerState.damageMult - 1) * 100)}%`;
        const spdStr = `+${Math.round((GlobalPlayerState.speedMult - 1) * 100)}%`;
        const atkStr = `+${Math.round((1 - GlobalPlayerState.attackSpeedMult) * 100)}%`;
        const armStr = `${GlobalPlayerState.armor || 0}`;

        this.statsFooterText.setText(`❤️ Máu: ${hpStr}  |  🛡️ Giáp: ${armStr}  |  💥 Sát Thương: ${dmgStr}  |  ⚡ Tốc Bắn: ${atkStr}  |  👟 Tốc Chạy: ${spdStr}`);
    }
}

// ==============================================================
// [LOCKED MODULE - DO NOT MODIFY: VICTORY & GAME OVER SCENES]
// ==============================================================
// SCENE 5: VICTORY SCENE (CHIẾN THẮNG 10 WAVE)
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

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x064e3b, 0x064e3b, 0x022c22, 0x022c22, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, height * 0.16, '👑 CHIẾN THẮNG TUYỆT ĐỐI! 👑', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '30px',
            color: '#facc15',
            fontStyle: '900',
            stroke: '#78350f',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.24, `BẠN ĐÃ SỐNG SÓT QUA CẢ ${GAME_CONFIG.MAX_WAVES} LEVEL VÀ HẠ GỤC ĐẠI TRÙM CUỐI CÙNG!`, {
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

        this.add.text(width / 2, height * 0.38, `🏆 TỔNG ĐIỂM: ${GlobalPlayerState.score}`, {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '20px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.44, `👾 Quái đã diệt: ${GlobalPlayerState.enemiesKilled}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '16px',
            color: '#e2e8f0'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.50, `💰 Tổng vàng thu thập: ${GlobalPlayerState.gold}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '16px',
            color: '#fbbf24'
        }).setOrigin(0.5);

        // Lưu kỷ lục lên YouTube Cloud
        window.ytSDK.saveGameProgress(GlobalPlayerState.score, GAME_CONFIG.MAX_WAVES);

        // Nút Chơi Lại
        const replayBtn = this.add.container(width / 2, height * 0.72);
        const btnG = this.add.graphics();
        btnG.fillStyle(0x10b981, 1);
        btnG.fillRoundedRect(-140, -28, 280, 56, 28);
        const replayTxt = this.add.text(0, 0, '🔄 CHƠI LẠI TRẬN MỚI', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        replayBtn.add([btnG, replayTxt]);
        replayBtn.setSize(280, 56);
        replayBtn.setInteractive(new Phaser.Geom.Rectangle(-140, -28, 280, 56), Phaser.Geom.Rectangle.Contains);

        const replayAction = () => {
            GlobalPlayerState.reset();
            this.scene.start('GameScene');
        };
        replayBtn.on('pointerdown', replayAction);
        replayBtn.on('pointerup', replayAction);
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

        const bg = this.add.graphics();
        bg.fillGradientStyle(0x450a0a, 0x450a0a, 0x020617, 0x020617, 1);
        bg.fillRect(0, 0, width, height);

        this.add.text(width / 2, height * 0.16, '💀 BẠN ĐÃ HY SINH 💀', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '30px',
            color: '#ef4444',
            fontStyle: '900',
            stroke: '#7f1d1d',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Thống kê trận đấu
        const statsBox = this.add.graphics();
        statsBox.fillStyle(0x0f172a, 0.85);
        statsBox.fillRoundedRect(width / 2 - 180, height * 0.28, 360, 160, 14);
        statsBox.lineStyle(3, 0xef4444, 1);
        statsBox.strokeRoundedRect(width / 2 - 180, height * 0.28, 360, 160, 14);

        this.add.text(width / 2, height * 0.34, `LEVEL ĐẠT ĐƯỢC: ${GlobalPlayerState.currentWave} / ${GAME_CONFIG.MAX_WAVES}`, {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '16px',
            color: '#f87171',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.40, `🏆 Điểm Số: ${GlobalPlayerState.score}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '18px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.46, `👾 Quái Tiêu Diệt: ${GlobalPlayerState.enemiesKilled}`, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '15px',
            color: '#cbd5e1'
        }).setOrigin(0.5);

        // Nút Hồi sinh bằng Xem Quảng Cáo (Stub Rewarded Ad)
        const adBtn = this.add.container(width / 2, height * 0.64);
        const adG = this.add.graphics();
        adG.fillStyle(0xd97706, 1);
        adG.fillRoundedRect(-140, -24, 280, 48, 24);
        const adTxt = this.add.text(0, 0, '📺 XEM QC NHẬN 50 VÀNG', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        adBtn.add([adG, adTxt]);
        adBtn.setSize(280, 48);
        adBtn.setInteractive(new Phaser.Geom.Rectangle(-140, -24, 280, 48), Phaser.Geom.Rectangle.Contains);

        adBtn.on('pointerdown', () => {
            window.ytSDK.showRewardedAd(() => {
                alert('Bạn đã nhận được 50 Vàng thưởng!');
                GlobalPlayerState.gold += 50;
                adBtn.destroy();
            });
        });

        // Nút Thử Lại (RETRY BUTTON)
        const retryBtn = this.add.container(width / 2, height * 0.76);
        const btnG = this.add.graphics();
        btnG.fillStyle(0x0284c7, 1);
        btnG.fillRoundedRect(-140, -28, 280, 56, 28);
        const retryTxt = this.add.text(0, 0, '⚔️ THỬ LẠI TRẬN MỚI', {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        retryBtn.add([btnG, retryTxt]);
        retryBtn.setSize(280, 56);
        retryBtn.setInteractive(new Phaser.Geom.Rectangle(-140, -28, 280, 56), Phaser.Geom.Rectangle.Contains);

        const retryAction = () => {
            GlobalPlayerState.reset();
            this.scene.start('GameScene');
        };
        retryBtn.on('pointerdown', retryAction);
        retryBtn.on('pointerup', retryAction);
    }
}

// ==========================================
// KHỞI ĐỘNG CẤU HÌNH PHASER 3 GAME
// ==========================================
const phaserConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_CONFIG.CANVAS_WIDTH,
    height: GAME_CONFIG.CANVAS_HEIGHT,
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
        ShopScene,
        VictoryScene,
        GameOverScene
    ]
};

// Khởi chạy game khi window sẵn sàng
window.addEventListener('load', () => {
    window.game = new Phaser.Game(phaserConfig);
});
