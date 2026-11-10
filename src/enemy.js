/**
 * SURVIVOR PLAYABLES - MODULE QUÁI VẬT, SPAWNER & ANTI-CAMPING (ENEMY)
 * Quản lý hệ thống Bậc quái Sliding Tier, Spawner, di chuyển của quái, rơi ngọc EXP/Vàng,
 * và hệ thống trừng phạt đứng yên 10s kích hoạt Quái Vật Bạo Loạn (+200%).
 */

window.SurvivorGame = window.SurvivorGame || {};

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
        this.hp = 20;
        this.maxHp = 20;
        this.speed = 85;
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

        const playerGuns = (GlobalPlayerState && Array.isArray(GlobalPlayerState.weapons)) ? GlobalPlayerState.weapons : [];
        const gunCount = Math.max(1, Number(playerGuns.length) || 1);
        const safeTier = Math.max(1, Number(this.tierIndex) || 1);

        // Công thức máu của quái:
        let hp = Math.round(22 * Math.pow(1.32, safeTier - 1) * (1 + (gunCount - 1) * 0.45));

        // Buff máu nếu là Quái Bạo Loạn, Tinh Anh hoặc Trùm
        if (this.isBerserk) {
            hp = Math.round(hp * 3.0); // +200% Máu khi Bạo Loạn
        } else if (this.isElite) {
            hp = Math.round(hp * 4.5); // Mini-Elite
        } else if (this.isBoss) {
            hp = Math.round(hp * 12.0); // Trùm Boss
        }

        // Tốc độ di chuyển:
        const tierSpeedBonus = (safeTier >= 5) ? Math.min(50, (safeTier - 4) * 2.5) : 0;
        let speed = 105 + tierSpeedBonus;
        if (this.isBerserk) {
            speed = Math.round(speed * 2.2); // Tốc độ chạy nhanh khi Bạo Loạn
        } else if (this.isElite) {
            speed = 90; // Mini-Elite đi chậm
        } else if (this.isBoss) {
            speed = 85;
        }

        // Sát thương:
        let damage = Math.round(5 + (safeTier - 1) * 1.3 + (gunCount - 1) * 0.7);
        if (this.isBerserk) {
            damage = Math.round(damage * 2.0);
        }

        // Kháng đẩy lùi (Knockback Resistance) từ Tier 5 trở đi:
        if (this.isBoss) {
            this.knockbackResist = 1.0;
        } else if (this.isElite) {
            this.knockbackResist = 0.90;
        } else if (safeTier >= 5) {
            this.knockbackResist = Math.min(0.85, (safeTier - 4) * 0.08);
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
            const shapeMod = safeTier % 4;
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
            this.expValue = Math.min(8, 1 + Math.floor(safeTier / 4));
            this.goldValue = Math.min(5, 1 + Math.floor(safeTier / 6));
        }

        // Kích thước quái lớn hơn một chút theo Tier
        const scale = this.isBoss ? 1.3 : (this.isElite ? 1.15 : Math.min(1.5, 0.85 + (safeTier - 1) * 0.012));
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

        // Tiếng "Tạch" khi trúng đòn (có cooldown 45ms trong RetroAudio để không dồn tiếng)
        const sfx = (window.SurvivorGame && window.SurvivorGame.retroAudio) || window.retroAudio;
        if (sfx && typeof sfx.playEnemyHit === 'function') {
            try { sfx.playEnemyHit(); } catch (e) { /* bỏ qua lỗi âm thanh */ }
        }

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
        if (typeof this.scene.onEnemyKilled === 'function') {
            this.scene.onEnemyKilled(this);
        }
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
// HỆ THỐNG QUÁI VẬT, SPAWNER & ANTI-CAMPING
// ==========================================
const EnemySystem = class EnemySystem {
    constructor(scene, playerSystem) {
        this.scene = scene;
        this.playerSystem = playerSystem;
    }

    create() {}

    update(time, delta) {
        const safeDelta = (Number.isFinite(delta) && delta > 0) ? delta : 16.6;
        EnemySystem.updateAntiCamping(this.scene, time, safeDelta);
        this.scene.spawnInterval = EnemySystem.calculateSpawnInterval(this.scene);
        this.scene.spawnTimer = (Number(this.scene.spawnTimer) || 0) + safeDelta;
        if (this.scene.spawnTimer >= this.scene.spawnInterval) {
            this.scene.spawnTimer = 0;
            EnemySystem.spawnEnemyCluster(this.scene);
        }
        EnemySystem.updateEnemies(this.scene, safeDelta);
        EnemySystem.updateGemAttraction(this.scene, safeDelta);
    }

    // Instance proxy methods
    getActiveEnemyCount() { return EnemySystem.getActiveEnemyCount(this.scene); }
    spawnEnemyCluster() { return EnemySystem.spawnEnemyCluster(this.scene); }
    spawnEnemy(x, y, tier, options) { return EnemySystem.spawnEnemy(this.scene, x, y, tier, options); }
    spawnPhase3Special() { return EnemySystem.spawnPhase3Special(this.scene); }
    updateEnemies(delta) { return EnemySystem.updateEnemies(this.scene, delta); }
    fireEnemyBullet(x, y, angle) { return EnemySystem.fireEnemyBullet(this.scene, x, y, angle); }
    updateGemAttraction(delta) { return EnemySystem.updateGemAttraction(this.scene, delta); }
    onEnemyKilled(enemy) { return EnemySystem.onEnemyKilled(this.scene, enemy); }
    updateAntiCamping(time, delta) { return EnemySystem.updateAntiCamping(this.scene, time, delta); }
    triggerBerserkMode() { return EnemySystem.triggerBerserkMode(this.scene); }
    endBerserkMode() { return EnemySystem.endBerserkMode(this.scene); }
    calculateSpawnInterval() { return EnemySystem.calculateSpawnInterval(this.scene); }

    // Tính toán nhịp sinh quái theo thời gian và trạng thái bạo loạn
    static calculateSpawnInterval(scene) {
        if (!scene) return 800;
        let interval = 800;
        if (scene.isBerserkMode) {
            interval = 280; // Bạo loạn: tối thiểu >= 250ms
        } else if (scene.isClimaxMode) {
            interval = 350;
        } else {
            const elapsed = scene.elapsedTime || 0;
            if (elapsed < 45) interval = 900;       // Pha 1: 900ms
            else if (elapsed < 90) interval = 800;  // Pha 2: 800ms
            else if (elapsed < 135) interval = 700; // Pha 3: 700ms
            else if (elapsed < 165) interval = 600; // Pha 4: 600ms
            else interval = 450;                    // Pha 5 Cao trào: 450ms
        }
        return Math.max(250, Number(interval) || 800);
    }

    // Đếm số lượng quái vật đang sống
    static getActiveEnemyCount(scene) {
        let count = 0;
        const pool = scene.enemies || scene.enemyPool;
        if (!pool) return 0;
        const children = pool.getChildren();
        for (let i = 0; i < children.length; i++) {
            if (children[i].alive && children[i].active) {
                count++;
            }
        }
        return count;
    }

    // Sinh cụm nhỏ chỉ từ 1 đến 2 con quái ở rìa màn hình theo từng nhịp thời gian
    static spawnEnemyCluster(scene) {
        const activeCount = EnemySystem.getActiveEnemyCount(scene);
        const maxCap = (Number.isFinite(scene.maxActiveEnemies) && scene.maxActiveEnemies > 0)
            ? scene.maxActiveEnemies
            : 6;

        // Tuyệt đối không dùng vòng lặp while hay for đẻ 20-50 con cùng 1 frame
        // Mỗi nhịp chỉ sinh từ 1 đến 2 con quái ở rìa màn hình
        const spawnCount = scene.isBerserkMode ? 2 : (activeCount < maxCap * 0.35 ? 2 : 1);

        for (let i = 0; i < spawnCount; i++) {
            // Khi không bạo loạn: tuân thủ maxActiveEnemies
            if (!scene.isBerserkMode && EnemySystem.getActiveEnemyCount(scene) >= maxCap) {
                break;
            }
            EnemySystem.spawnEnemy(scene);
        }
    }

    // Sinh 1 con quái vật từ 4 cạnh/góc ngẫu nhiên có kiểm tra an toàn toàn bộ thuộc tính số
    static spawnEnemy(scene, x, y, tier, options = {}) {
        const currentLevel = GlobalPlayerState.currentWave || 1;
        const cam = scene.cameras.main;
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
            if (scene.isBerserkMode) {
                chosenTier = SlidingTierManager.getMaxTier(currentLevel);
            } else {
                chosenTier = SlidingTierManager.rollTier(currentLevel);
            }
        }

        const pool = scene.enemies || scene.enemyPool;
        const enemy = pool ? pool.get() : null;
        if (enemy) {
            enemy.spawnTier(sx, sy, chosenTier, currentLevel, {
                isBerserk: scene.isBerserkMode,
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

    // Xuất hiện 1 con Mini-Elite (hoặc Boss nếu chia hết cho 10) đúng giây thứ 90
    static spawnPhase3Special(scene) {
        const curWave = GlobalPlayerState.currentWave;
        const isBossWave = (curWave % 10 === 0);
        const maxTier = SlidingTierManager.getMaxTier(curWave);
        const tier = isBossWave ? (maxTier + 2) : (maxTier + 1);

        const angle = Math.random() * Math.PI * 2;
        const dist = 380;
        let sx = scene.player.x + Math.cos(angle) * dist;
        let sy = scene.player.y + Math.sin(angle) * dist;
        sx = Phaser.Math.Clamp(sx, 50, GAME_CONFIG.ARENA_WIDTH - 50);
        sy = Phaser.Math.Clamp(sy, 50, GAME_CONFIG.ARENA_HEIGHT - 50);

        const pool = scene.enemies || scene.enemyPool;
        const enemy = pool ? pool.get() : null;
        if (enemy) {
            enemy.spawnTier(sx, sy, tier, curWave, {
                isBoss: isBossWave,
                isElite: !isBossWave
            });
            scene.cameras.main.shake(350, 0.025);
            window.retroAudio.playTone(180, 'sawtooth', 0.25, 100, 0.5);
            const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
            const notice = isBossWave
                ? t('enemy.boss_spawn', { level: curWave, tier })
                : t('enemy.elite_spawn', { tier });
            scene.showBannerNotice(notice, isBossWave ? '#ef4444' : '#facc15');
        }
    }

    // Cập nhật vị trí & di chuyển của Quái vật (Enemy Movement)
    static updateEnemies(scene, delta) {
        if (!scene.player || !scene.player.active) return;
        if (scene.isWaveOver || !scene.isGameRunning || scene.isIntermission || scene.isRoundPaused || scene.isRoundActive === false) {
            return;
        }

        const px = scene.player.x;
        const py = scene.player.y;
        const enemiesGroup = scene.enemies || scene.enemyPool;
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
                        scene.physics.velocityFromRotation(angle + Math.PI, speed * 0.75, enemy.body.velocity);
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
                        scene.physics.moveToObject(enemy, scene.player, speed);
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
                    EnemySystem.fireEnemyBullet(scene, enemy.x, enemy.y, angle);
                }
            } else if (enemy.enemyType === 'boss') {
                // Boss di chuyển ổn định và bắn đạn theo chu kỳ
                if (enemy.body) {
                    scene.physics.moveToObject(enemy, scene.player, speed);
                } else {
                    const moveDist = (speed * safeDelta) / 1000;
                    enemy.x += Math.cos(angle) * moveDist;
                    enemy.y += Math.sin(angle) * moveDist;
                }

                enemy.shootTimer = (Number(enemy.shootTimer) || 0) - safeDelta;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = 1400;
                    EnemySystem.fireEnemyBullet(scene, enemy.x, enemy.y, angle);
                }
            } else {
                // Toàn bộ quái còn lại (Swarmer, Dasher, Tank, Elite, Berserk):
                // Di chuyển dồn dập về phía người chơi bằng Arcade Physics (hoặc direct coordinate nếu không có body)
                if (enemy.body) {
                    scene.physics.moveToObject(enemy, scene.player, speed);
                } else {
                    const moveDist = (speed * safeDelta) / 1000;
                    enemy.x += Math.cos(angle) * moveDist;
                    enemy.y += Math.sin(angle) * moveDist;
                }
            }
        }
    }

    // Quái bắn đạn tím
    static fireEnemyBullet(scene, x, y, angle) {
        if (!scene.enemyBulletPool) return;
        const b = scene.enemyBulletPool.get();
        if (b) {
            b.fire(x, y, angle, 220, 10, 450, 1, 0, false, 0, 'bullet_enemy');
        }
    }

    // Xử lý nam châm hút ngọc (EXP / Gold)
    static updateGemAttraction(scene, delta) {
        if (!scene.gemPool || !scene.player) return;
        const px = scene.player.x;
        const py = scene.player.y;
        const radius = GlobalPlayerState.pickupRadius || 100;

        scene.gemPool.getChildren().forEach(gem => {
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

    // Gọi an toàn 1 hàm âm thanh của RetroAudio
    static playSfx(method, ...args) {
        const audio = (window.SurvivorGame && window.SurvivorGame.retroAudio) || window.retroAudio;
        if (audio && typeof audio[method] === 'function') {
            try { audio[method](...args); } catch (e) { /* bỏ qua lỗi âm thanh */ }
        }
    }

    // Xử lý sự kiện khi tiêu diệt 1 quái vật
    static onEnemyKilled(scene, enemy) {
        GlobalPlayerState.enemiesKilled++;
        GlobalPlayerState.score += (enemy.isBoss ? 500 : (enemy.isElite ? 250 : 25));

        // Âm thanh "Bụp/Pop" khi quái vỡ vụn
        EnemySystem.playSfx('playEnemyDeath');

        // Hiệu ứng hạt văng tung tóe
        if (scene.particles) {
            const particleCount = enemy.isBoss ? 50 : (enemy.isElite ? 35 : 12);
            scene.particles.emitParticleAt(enemy.x, enemy.y, particleCount);
        }

        // Xử lý rớt Ngọc EXP & Tiền Vàng
        if (enemy.isElite) {
            // Mini-Elite: Rơi gấp 5 lần vàng & EXP
            for (let i = 0; i < 5; i++) {
                const ox = Phaser.Math.Between(-35, 35);
                const oy = Phaser.Math.Between(-35, 35);
                const expGem = scene.gemPool.get();
                if (expGem) expGem.spawn(enemy.x + ox, enemy.y + oy, 'exp', 3);
            }
            for (let i = 0; i < 5; i++) {
                const ox = Phaser.Math.Between(-30, 30);
                const oy = Phaser.Math.Between(-30, 30);
                const goldGem = scene.gemPool.get();
                if (goldGem) goldGem.spawn(enemy.x + ox, enemy.y + oy, 'gold', 2);
            }
            const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
            scene.showBannerNotice(t('enemy.elite_slain'), '#facc15');
        } else if (enemy.isBoss) {
            // Trùm Boss mỗi 10 Level
            for (let i = 0; i < 15; i++) {
                const expGem = scene.gemPool.get();
                if (expGem) expGem.spawn(enemy.x + Phaser.Math.Between(-50, 50), enemy.y + Phaser.Math.Between(-50, 50), 'exp', 4);
            }
            for (let i = 0; i < 10; i++) {
                const goldGem = scene.gemPool.get();
                if (goldGem) goldGem.spawn(enemy.x + Phaser.Math.Between(-45, 45), enemy.y + Phaser.Math.Between(-45, 45), 'gold', 3);
            }
            const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
            scene.showBannerNotice(t('enemy.boss_slain'), '#ef4444');
        } else {
            // Quái thường
            const expGem = scene.gemPool.get();
            if (expGem) {
                expGem.spawn(enemy.x, enemy.y, 'exp', enemy.expValue || 1);
            }
            // Tỉ lệ rớt thêm Vàng (cân đối kinh tế game)
            if (Math.random() < 0.40) {
                const goldGem = scene.gemPool.get();
                if (goldGem) {
                    goldGem.spawn(enemy.x + Phaser.Math.Between(-12, 12), enemy.y + Phaser.Math.Between(-12, 12), 'gold', enemy.goldValue || 1);
                }
            }
        }
    }

    // Hệ thống Chống đứng yên (Anti-Camping / 10s Idle Punishment)
    static updateAntiCamping(scene, time, delta) {
        if (!scene.player) return;
        const px = scene.player.x;
        const py = scene.player.y;

        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);

        if (scene.isBerserkMode) {
            // Khi đang trong trạng thái Bạo Loạn: Bắt buộc di chuyển thoát xa > 280px tính từ vị trí kích hoạt
            const distEscaped = Phaser.Math.Distance.Between(px, py, scene.berserkOrigin.x, scene.berserkOrigin.y);
            if (scene.berserkBanner) {
                scene.berserkBanner.setText(t('enemy.berserk_active', { dist: Math.round(distEscaped) }));
                scene.berserkBanner.setVisible(true);
            }

            // Còi báo động nhấp nháy âm thanh
            if (!scene.lastSirenTime || time - scene.lastSirenTime > 650) {
                scene.lastSirenTime = time;
                window.retroAudio.playTone(680, 'sawtooth', 0.16, 260, 0.45);
            }

            if (distEscaped > 280) {
                EnemySystem.endBerserkMode(scene);
            }
        } else {
            const distFromAnchor = Phaser.Math.Distance.Between(px, py, scene.lastMovePosition.x, scene.lastMovePosition.y);
            if (distFromAnchor < 45) {
                // Đứng yên hoặc chỉ loanh quanh bán kính < 45px
                scene.idleTimer += delta / 1000;

                // Ở giây thứ 7: Cảnh báo nhấp nháy
                if (scene.idleTimer >= 7) {
                    const secLeft = Math.max(1, Math.ceil(10 - scene.idleTimer));
                    if (scene.idleWarnText) {
                        scene.idleWarnText.setText(t('enemy.idle_warn', { sec: secLeft }));
                        scene.idleWarnText.setVisible(true);
                        scene.idleWarnText.setAlpha(0.6 + 0.4 * Math.sin(time * 0.015));
                    }

                    // Tiếng bíp cảnh báo
                    if (!scene.lastWarnBeepTime || time - scene.lastWarnBeepTime > 550) {
                        scene.lastWarnBeepTime = time;
                        window.retroAudio.playTone(460, 'sine', 0.08, 420, 0.3);
                    }
                } else {
                    if (scene.idleWarnText) scene.idleWarnText.setVisible(false);
                }

                // Khi đạt đủ 10 giây: KÍCH HOẠT BẠO LOẠN!
                if (scene.idleTimer >= 10) {
                    EnemySystem.triggerBerserkMode(scene);
                }
            } else {
                // Người chơi di chuyển thoát ra ngoài 45px: cập nhật vị trí mới & reset
                scene.lastMovePosition = { x: px, y: py };
                scene.idleTimer = 0;
                if (scene.idleWarnText) scene.idleWarnText.setVisible(false);
            }
        }
    }

    // Kích hoạt trạng thái Quái vật bạo loạn (Berserk Stampede) khi đứng yên 10s
    static triggerBerserkMode(scene) {
        if (scene.isBerserkMode) return;
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        scene.isBerserkMode = true;
        scene.idleTimer = 10;
        scene.berserkOrigin = { x: scene.player.x, y: scene.player.y };
        if (scene.idleWarnText) scene.idleWarnText.setVisible(false);

        // Hiệu ứng rung chấn mạnh & báo động
        scene.cameras.main.shake(500, 0.035);
        scene.cameras.main.flash(350, 255, 30, 30);
        window.retroAudio.playTone(750, 'sawtooth', 0.4, 200, 0.8);

        if (scene.berserkBanner) scene.berserkBanner.setVisible(true);
        scene.showBannerNotice(t('enemy.berserk_start'), '#ef4444');
    }

    // Tắt trạng thái bạo loạn khi người chơi đã di chuyển > 280px
    static endBerserkMode(scene) {
        const t = (window.SurvivorGame && window.SurvivorGame.t) || window.t || ((k) => k);
        scene.isBerserkMode = false;
        scene.idleTimer = 0;
        scene.lastMovePosition = { x: scene.player.x, y: scene.player.y };
        if (scene.berserkBanner) scene.berserkBanner.setVisible(false);
        if (scene.idleWarnText) scene.idleWarnText.setVisible(false);

        window.retroAudio.playTone(480, 'sine', 0.25, 880, 0.35);
        scene.showBannerNotice(t('enemy.berserk_end'), '#22c55e');
    }
}

// ==========================================
// EXPORTS & GLOBAL ALIASES
// ==========================================
window.SurvivorGame.SlidingTierManager = SlidingTierManager;
window.SurvivorGame.Enemy = Enemy;
window.SurvivorGame.Gem = Gem;
window.SurvivorGame.EnemySystem = EnemySystem;

window.SlidingTierManager = SlidingTierManager;
window.Enemy = Enemy;
window.Gem = Gem;
