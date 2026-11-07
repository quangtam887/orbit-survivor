/**
 * SURVIVOR PLAYABLES - MODULE NHÂN VẬT, ĐIỀU KHIỂN & VŨ KHÍ (PLAYER)
 * Quản lý nhân vật, hệ thống phím WASD + Virtual Joystick, súng xoay quanh thân,
 * tự động ngắm bắn quái gần nhất và hệ thống đạn (Bullets Pool).
 */

window.SurvivorGame = window.SurvivorGame || {};

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
// HỆ THỐNG ĐIỀU KHIỂN & VŨ KHÍ CỦA NGƯỜI CHƠI
// ==========================================
const PlayerSystem = class PlayerSystem {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        PlayerSystem.setupControls(this.scene);
        PlayerSystem.setupVirtualJoystick(this.scene);
        PlayerSystem.rebuildWeaponOrbitals(this.scene);
    }

    update(time, delta) {
        PlayerSystem.updateMovement(this.scene, delta);
        PlayerSystem.updateOrbitingWeapons(this.scene, delta);
    }

    // Instance proxy methods
    setupControls() { return PlayerSystem.setupControls(this.scene); }
    setupVirtualJoystick() { return PlayerSystem.setupVirtualJoystick(this.scene); }
    updateMovement(delta) { return PlayerSystem.updateMovement(this.scene, delta); }
    updatePlayerMovement(delta) { return PlayerSystem.updateMovement(this.scene, delta); }
    rebuildWeaponOrbitals() { return PlayerSystem.rebuildWeaponOrbitals(this.scene); }
    updateOrbitingWeapons(delta) { return PlayerSystem.updateOrbitingWeapons(this.scene, delta); }
    fireWeapon(item, wx, wy, aimAngle, target) { return PlayerSystem.fireWeapon(this.scene, item, wx, wy, aimAngle, target); }
    performMeleeSlash(x, y, angle, range, dmg, knockback, isCrit) { return PlayerSystem.performMeleeSlash(this.scene, x, y, angle, range, dmg, knockback, isCrit); }
    createExplosionAoE(x, y, radius, damage) { return PlayerSystem.createExplosionAoE(this.scene, x, y, radius, damage); }
    createExplosion(x, y, radius, damage) { return PlayerSystem.createExplosion(this.scene, x, y, radius, damage); }

    // Thiết lập bàn phím WASD và 4 phím mũi tên
    static setupControls(scene) {
        if (!scene || !scene.input || !scene.input.keyboard) return;
        try {
            scene.cursors = scene.input.keyboard.createCursorKeys();
            scene.wasd = scene.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });
        } catch (err) {
            console.warn("PlayerSystem.setupControls warning:", err);
        }
    }

    // Thiết lập Virtual Joystick cho điện thoại & màn hình cảm ứng
    static setupVirtualJoystick(scene) {
        const { height } = scene.scale;
        const defaultX = 100;
        const defaultY = height - 100;

        scene.joystickBase = scene.add.image(defaultX, defaultY, 'joystick_base')
            .setScrollFactor(0)
            .setDepth(100)
            .setAlpha(0.45);

        scene.joystickKnob = scene.add.image(defaultX, defaultY, 'joystick_knob')
            .setScrollFactor(0)
            .setDepth(101)
            .setAlpha(0.75);

        scene.isDraggingJoystick = false;

        scene.input.on('pointerdown', (pointer) => {
            // Chỉ kích hoạt joystick khi đang trong trận đấu thực sự (không phải intermission hay modal)
            if (!scene.isGameRunning || scene.isWaveOver || scene.isIntermission || scene.isRoundPaused) return;
            // Nếu người chơi chạm vào nửa dưới màn hình
            if (pointer.y > height * 0.35) {
                scene.isDraggingJoystick = true;
                scene.joystickBase.setPosition(pointer.x, pointer.y).setAlpha(0.75);
                scene.joystickKnob.setPosition(pointer.x, pointer.y).setAlpha(0.95);
            }
        });

        scene.input.on('pointermove', (pointer) => {
            if (!scene.isDraggingJoystick || !scene.isGameRunning || scene.isIntermission) return;
            const maxRadius = 50;
            const dx = pointer.x - scene.joystickBase.x;
            const dy = pointer.y - scene.joystickBase.y;
            const dist = Math.hypot(dx, dy);

            if (dist === 0) {
                scene.joystickVector = { x: 0, y: 0 };
                return;
            }

            const clampedDist = Math.min(dist, maxRadius);
            const angle = Math.atan2(dy, dx);
            scene.joystickKnob.x = scene.joystickBase.x + Math.cos(angle) * clampedDist;
            scene.joystickKnob.y = scene.joystickBase.y + Math.sin(angle) * clampedDist;

            // Vector chuẩn hóa từ -1 đến 1
            scene.joystickVector = {
                x: (Math.cos(angle) * clampedDist) / maxRadius,
                y: (Math.sin(angle) * clampedDist) / maxRadius
            };
        });

        const resetJoystick = () => {
            scene.isDraggingJoystick = false;
            scene.joystickVector = { x: 0, y: 0 };
            scene.joystickBase.setPosition(defaultX, defaultY).setAlpha(0.45);
            scene.joystickKnob.setPosition(defaultX, defaultY).setAlpha(0.75);
        };

        scene.input.on('pointerup', resetJoystick);
        scene.input.on('pointerupoutside', resetJoystick);
    }

    // Cập nhật di chuyển người chơi (WASD / Mũi tên song song với Joystick)
    static updateMovement(scene, delta) {
        if (!scene.player || !scene.player.body) return;

        let moveX = 0;
        let moveY = 0;

        // Phím Bàn Phím (WASD & 4 phím mũi tên)
        if (scene.cursors && scene.wasd) {
            if (scene.cursors.left.isDown || scene.wasd.left.isDown) moveX -= 1;
            if (scene.cursors.right.isDown || scene.wasd.right.isDown) moveX += 1;
            if (scene.cursors.up.isDown || scene.wasd.up.isDown) moveY -= 1;
            if (scene.cursors.down.isDown || scene.wasd.down.isDown) moveY += 1;
        }

        // Joystick ảo (Cảm ứng / Mobile)
        if (scene.joystickVector && (scene.joystickVector.x !== 0 || scene.joystickVector.y !== 0)) {
            moveX += scene.joystickVector.x;
            moveY += scene.joystickVector.y;
        }

        const totalSpeed = GlobalPlayerState.speed * (GlobalPlayerState.speedMult || 1);

        if (moveX !== 0 || moveY !== 0) {
            const mag = Math.hypot(moveX, moveY);
            const normX = moveX / mag;
            const normY = moveY / mag;
            scene.player.body.setVelocity(normX * totalSpeed, normY * totalSpeed);

            // Chân thực: Hướng xoay người chơi nhìn theo chiều di chuyển
            scene.player.setRotation(Math.atan2(normY, normX));
        } else {
            scene.player.body.setVelocity(0, 0);
        }
    }

    // Alias cho updateMovement
    static updatePlayerMovement(scene, delta) {
        return PlayerSystem.updateMovement(scene, delta);
    }

    // Tái cấu trúc các vũ khí xoay quanh người chơi (Orbiting Weapons)
    static rebuildWeaponOrbitals(scene) {
        if (!scene.weaponSprites) scene.weaponSprites = [];
        scene.weaponSprites.forEach(w => {
            if (w.sprite) w.sprite.destroy();
        });
        scene.weaponSprites = [];

        const weapons = (GlobalPlayerState.weapons && GlobalPlayerState.weapons.length > 0)
            ? GlobalPlayerState.weapons
            : (window.GAME_DATA.WEAPON_TYPES ? [JSON.parse(JSON.stringify(window.GAME_DATA.WEAPON_TYPES.PISTOL))] : []);

        const count = weapons.length;
        for (let i = 0; i < count; i++) {
            const wpData = weapons[i];
            let texKey = 'wp_pistol';
            if (wpData.id === 'shotgun') texKey = 'wp_shotgun';
            else if (wpData.id === 'smg') texKey = 'wp_smg';
            else if (wpData.id === 'laser') texKey = 'wp_laser';
            else if (wpData.id === 'rocket') texKey = 'wp_rocket';
            else if (wpData.id === 'katana') texKey = 'wp_blade';

            const sprite = scene.add.sprite(scene.player.x, scene.player.y, texKey).setDepth(22);
            scene.weaponSprites.push({
                data: wpData,
                sprite: sprite,
                index: i,
                total: count,
                cooldownRemaining: 0
            });
        }
    }

    // Cập nhật vị trí & Tự động ngắm bắn cho các vũ khí xoay quanh
    static updateOrbitingWeapons(scene, delta) {
        if (!scene.weaponSprites || !scene.player) return;
        const orbitRadius = 42;
        const now = scene.time.now;

        // Tìm quái vật gần người chơi nhất trong toàn bộ bán kính
        let nearestEnemy = null;
        let shortestDist = Infinity;

        const pool = scene.enemies || scene.enemyPool;
        if (pool) {
            pool.getChildren().forEach(enemy => {
                if (enemy.alive) {
                    const d = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, enemy.x, enemy.y);
                    if (d < shortestDist) {
                        shortestDist = d;
                        nearestEnemy = enemy;
                    }
                }
            });
        }

        // Xoay nhẹ halo vũ khí liên tục
        const haloAngleOffset = (now * 0.0015);

        scene.weaponSprites.forEach(item => {
            const wp = item.data;
            const baseAngle = haloAngleOffset + (item.index * Math.PI * 2) / item.total;
            const wx = scene.player.x + Math.cos(baseAngle) * orbitRadius;
            const wy = scene.player.y + Math.sin(baseAngle) * orbitRadius;
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
                    PlayerSystem.fireWeapon(scene, item, wx, wy, aimAngle, nearestEnemy);
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
    static fireWeapon(scene, item, wx, wy, aimAngle, target) {
        const wp = item.data;

        // Tính sát thương (kèm flat damage, % damage, và chí mạng)
        let dmg = (wp.baseDamage + (GlobalPlayerState.flatDamage || 0)) * (GlobalPlayerState.damageMult || 1);
        let isCrit = Math.random() < (GlobalPlayerState.critChance || 0.05);
        if (isCrit) {
            dmg *= (GlobalPlayerState.critMult || 2.0);
        }
        dmg = Math.round(dmg);

        // Hiệu ứng giật nảy súng khi bắn (Recoil Tween)
        scene.tweens.add({
            targets: item.sprite,
            scaleX: 0.8,
            scaleY: 1.3,
            duration: 80,
            yoyo: true
        });

        // Âm thanh khai hỏa phát cùng khoảnh khắc tạo đạn & recoil (Katana phát trong performMeleeSlash)
        if (wp.id !== 'katana') {
            PlayerSystem.playSfx('playWeaponFire', wp.id || wp.type);
        }

        // Xử lý từng loại vũ khí
        if (wp.id === 'pistol') {
            const b = scene.bulletPool.get();
            if (b) {
                b.fire(wx, wy, aimAngle, wp.bulletSpeed, dmg, wp.range, wp.pierce, wp.knockback, false, 0, 'bullet_normal');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'shotgun') {
            const pellets = wp.pellets || 5;
            const spread = wp.spreadAngle || 0.45;
            for (let i = 0; i < pellets; i++) {
                const offset = (i - (pellets - 1) / 2) * (spread / (pellets - 1));
                const b = scene.bulletPool.get();
                if (b) {
                    b.fire(wx, wy, aimAngle + offset, wp.bulletSpeed + Phaser.Math.Between(-30, 30), dmg, wp.range, 1, wp.knockback, false, 0, 'bullet_normal');
                    b.isCrit = isCrit;
                }
            }
        } else if (wp.id === 'smg') {
            const b = scene.bulletPool.get();
            if (b) {
                const spread = (Math.random() - 0.5) * 0.15;
                b.fire(wx, wy, aimAngle + spread, wp.bulletSpeed, dmg, wp.range, 1, wp.knockback, false, 0, 'bullet_normal');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'laser') {
            const b = scene.bulletPool.get();
            if (b) {
                b.fire(wx, wy, aimAngle, wp.bulletSpeed, dmg, wp.range, wp.pierce, wp.knockback, false, 0, 'bullet_normal');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'rocket') {
            const b = scene.bulletPool.get();
            if (b) {
                b.fire(wx, wy, aimAngle, wp.bulletSpeed, dmg, wp.range, 1, wp.knockback, true, wp.explosionRadius, 'bullet_rocket');
                b.isCrit = isCrit;
            }
        } else if (wp.id === 'katana') {
            // Đòn chém vòng cung cận chiến
            PlayerSystem.performMeleeSlash(scene, wx, wy, aimAngle, wp.range, dmg, wp.knockback, isCrit);
        }
    }

    // Đòn chém kiếm cận chiến quét quái
    static performMeleeSlash(scene, x, y, angle, range, dmg, knockback, isCrit) {
        // Tạo hiệu ứng hình cung chém
        const slashG = scene.add.graphics().setDepth(25);
        slashG.lineStyle(5, 0x10b981, 1);
        slashG.beginPath();
        slashG.arc(x, y, range, angle - 0.8, angle + 0.8, false);
        slashG.strokePath();

        // Tiếng "Xoẹt!" phát đúng lúc vệt chém xuất hiện trên màn hình
        PlayerSystem.playSfx('playWeaponFire', 'katana');

        scene.tweens.add({
            targets: slashG,
            alpha: 0,
            duration: 160,
            onComplete: () => slashG.destroy()
        });

        // Gây sát thương toàn bộ quái trong vùng chém
        const pool = scene.enemies || scene.enemyPool;
        if (pool) {
            pool.getChildren().forEach(enemy => {
                if (enemy.alive) {
                    const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                    if (d <= range + 20) {
                        const eAngle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                        const diff = Math.abs(Phaser.Math.Angle.Wrap(eAngle - angle));
                        if (diff <= 1.0) {
                            enemy.takeDamage(dmg, angle, knockback);
                            scene.showDamageText(enemy.x, enemy.y, dmg, isCrit);
                            // Tiếng trúng đòn đã được phát trong Enemy.takeDamage()
                        }
                    }
                }
            });
        }
    }

    // Nổ diện rộng AoE (Rocket)
    static createExplosionAoE(scene, x, y, radius, damage) {
        // Tiếng nổ "BÙM" phát cùng lúc vòng sóng nổ AoE xuất hiện
        PlayerSystem.playSfx('playExplosion');

        const wave = scene.add.sprite(x, y, 'shockwave').setDepth(24);
        wave.setScale(0.2);
        scene.tweens.add({
            targets: wave,
            scaleX: radius / 30,
            scaleY: radius / 30,
            alpha: 0,
            duration: 250,
            onComplete: () => wave.destroy()
        });

        const pool = scene.enemies || scene.enemyPool;
        if (pool) {
            pool.getChildren().forEach(enemy => {
                if (enemy.alive) {
                    const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                    if (d <= radius) {
                        const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                        enemy.takeDamage(Math.round(damage * 0.8), angle, 120);
                    }
                }
            });
        }
    }

    // Gọi an toàn 1 hàm âm thanh của RetroAudio (không crash nếu chưa có audio)
    static playSfx(method, ...args) {
        const audio = (window.SurvivorGame && window.SurvivorGame.retroAudio) || window.retroAudio;
        if (audio && typeof audio[method] === 'function') {
            try { audio[method](...args); } catch (e) { /* bỏ qua lỗi âm thanh */ }
        }
    }

    // Alias cho createExplosionAoE
    static createExplosion(scene, x, y, radius, damage) {
        return PlayerSystem.createExplosionAoE(scene, x, y, radius, damage);
    }
}

// ==========================================
// EXPORTS & GLOBAL ALIASES
// ==========================================
window.SurvivorGame.Bullet = Bullet;
window.SurvivorGame.PlayerSystem = PlayerSystem;
window.Bullet = Bullet;
