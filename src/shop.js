/**
 * SURVIVOR PLAYABLES - MODULE POPUP KỸ NĂNG & CỬA HÀNG (SHOP)
 * Quản lý giao diện Popup chọn 1 trong 3 thẻ kỹ năng cuối mỗi round (100% hitbox)
 * và Scene Cửa Hàng mua vũ khí/nâng cấp chỉ số vĩnh viễn giữa các Wave.
 */

window.SurvivorGame = window.SurvivorGame || {};

// ==============================================================
// [LOCKED MODULE - DO NOT MODIFY: SKILL PICK POPUP & HITBOX]
// ==============================================================
const SkillModalSystem = {
    // Dọn dẹp hoàn toàn modal overlay khỏi DOM và vô hiệu hóa tương tác
    cleanModal() {
        const oldDomModal = document.getElementById('skill-modal-overlay');
        if (oldDomModal) {
            oldDomModal.classList.remove('active');
            oldDomModal.classList.add('hidden');
            oldDomModal.style.setProperty('display', 'none', 'important');
            oldDomModal.style.setProperty('pointer-events', 'none', 'important');
            oldDomModal.remove();
        }
    },

    // Alias mở modal chọn kỹ năng
    show(scene) {
        return this.startIntermissionSkillPicks(scene);
    },

    // MÀN HÌNH TỔNG KẾT VÒNG ĐẤU: Lần lượt chọn 1 trong 3 thẻ kỹ năng
    // SỬA TRIỆT ĐỂ: Dùng isRoundPaused = true và HTML/CSS Overlay nằm trên Canvas đảm bảo Hitbox & Click 100% không bao giờ trượt
    startIntermissionSkillPicks(scene) {
        scene.isRoundPaused = true;
        scene.isIntermission = true;
        scene.isGameRunning = false;
        scene.isRoundActive = false;
        if (scene.player && scene.player.body) {
            scene.player.body.setVelocity(0, 0);
        }

        // Vô hiệu hóa và ẩn vùng chạm Virtual Joystick để không che mất sự kiện click chuột/chạm
        if (scene.joystickBase) scene.joystickBase.setVisible(false);
        if (scene.joystickKnob) scene.joystickKnob.setVisible(false);

        // Xóa modal cũ nếu có
        this.cleanModal();

        if (scene.currentSkillModal) {
            scene.currentSkillModal.destroy();
            scene.currentSkillModal = null;
        }

        if (scene.pendingSkillPicks <= 0) {
            scene.proceedToShopOrVictory();
            return;
        }

        // Lấy ngẫu nhiên 3 thẻ từ LEVEL_UP_CARDS
        const cardsSource = window.SurvivorGame.LEVEL_UP_CARDS || (window.GAME_DATA && window.GAME_DATA.LEVEL_UP_CARDS) || [];
        const allCards = [...cardsSource];
        Phaser.Utils.Array.Shuffle(allCards);
        const offeredCards = allCards.slice(0, 3);

        const container = document.getElementById('game-container') || document.body;

        const overlay = document.createElement('div');
        overlay.id = 'skill-modal-overlay';
        overlay.className = 'active';
        overlay.style.cssText = 'display: flex !important; pointer-events: auto !important;';

        const colorToHex = (c) => {
            if (typeof c === 'number') {
                return '#' + c.toString(16).padStart(6, '0');
            }
            return c || '#38bdf8';
        };

        const tr = (key, params) => (window.SurvivorGame && window.SurvivorGame.t) ? window.SurvivorGame.t(key, params) : key;

        let cardsHtml = '';
        offeredCards.forEach((card, idx) => {
            const borderColor = colorToHex(card.color);
            const cardTitle = card.id ? tr(`card.${card.id}.title`) : card.title;
            const cardDesc = card.id ? tr(`card.${card.id}.desc`) : card.desc;
            const iconText = cardTitle.slice(0, 2);
            const rarityColor = card.rarity === 'Epic' ? '#f472b6' : (card.rarity === 'Rare' ? '#fde047' : '#7dd3fc');

            cardsHtml += `
                <div class="skill-card" data-index="${idx}" style="border-color: ${borderColor};">
                    <div class="skill-icon-circle" style="border-color: ${borderColor}; color: ${borderColor};">
                        ${iconText}
                    </div>
                    <div class="skill-card-title">${cardTitle}</div>
                    <div class="skill-card-rarity" style="color: ${rarityColor};">[${card.rarity}]</div>
                    <div class="skill-card-desc">${cardDesc}</div>
                    <button class="select-skill-btn" data-index="${idx}">${tr('modal.select_btn')}</button>
                </div>
            `;
        });

        overlay.innerHTML = `
            <div class="skill-modal-header">
                <div class="skill-modal-title">${tr('modal.title')}</div>
                <div class="skill-modal-subtitle">${tr('modal.subtitle', { count: scene.pendingSkillPicks })}</div>
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
            scene.pendingSkillPicks--;
            GlobalPlayerState.pendingSkillPicks = scene.pendingSkillPicks;

            scene.updateHpBar();
            scene.updateExpBar();
            scene.rebuildWeaponOrbitals();
            if (scene.pendingBadge) {
                scene.pendingBadge.setText(tr('hud.pending_cards', { count: scene.pendingSkillPicks }));
                scene.pendingBadge.setVisible(scene.pendingSkillPicks > 0);
            }

            // 3. Xóa bỏ hoàn toàn Popup kỹ năng khỏi màn hình
            SkillModalSystem.cleanModal();

            // 4. Nếu còn lượt chọn tiếp tục mở lượt kế tiếp, ngược lại chuyển sang Cửa hàng (Shop)
            if (scene.pendingSkillPicks > 0) {
                scene.startIntermissionSkillPicks();
            } else {
                scene.proceedToShopOrVictory();
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
};

// ==============================================================
// [LOCKED MODULE - DO NOT MODIFY: SHOP SYSTEM]
// ==============================================================
// HELPER CHUẨN HÓA HITBOX 100% DIỆN TÍCH Ô & HIỆU ỨNG THU PHÓNG
// ==============================================================
function disableChildrenInput(container) {
    if (!container || !Array.isArray(container.list)) return;
    container.list.forEach(child => {
        if (!child) return;
        if (typeof child.disableInteractive === 'function') {
            child.disableInteractive();
        }
        if (child.input) {
            child.input.enabled = false;
        }
        if (Array.isArray(child.list)) {
            disableChildrenInput(child);
        }
    });
}

function createContainerHitArea(scene, container, width, height) {
    // Vô hiệu hóa tương tác chuột trên toàn bộ phần tử đồ họa/văn bản trang trí con
    disableChildrenInput(container);
    if (typeof container.setSize === 'function') {
        container.setSize(width, height);
    }

    let hitArea = null;
    if (scene && scene.add && typeof scene.add.rectangle === 'function') {
        hitArea = scene.add.rectangle(0, 0, width, height, 0xffffff, 0.001);
        if (typeof hitArea.setOrigin === 'function') {
            hitArea.setOrigin(0.5);
        }
        if (typeof hitArea.setInteractive === 'function') {
            hitArea.setInteractive({ useHandCursor: true });
        }
        if (hitArea.input) {
            hitArea.input.cursor = 'pointer';
        }
        container.add(hitArea);
    } else {
        // Fallback cho môi trường unit test mock tối giản
        if (typeof container.setInteractive === 'function') {
            container.setInteractive({ useHandCursor: true });
        }
        if (container.input) {
            container.input.cursor = 'pointer';
        }
        hitArea = container;
    }

    container.hitAreaZone = hitArea;
    return hitArea;
}

function attachInteractiveCardEffects(scene, container, hitZone, onClickCallback, options = {}) {
    const targetZone = hitZone || container;
    if (!targetZone) return;

    if (typeof targetZone.setInteractive === 'function' && !targetZone.input) {
        targetZone.setInteractive({ useHandCursor: true });
    }
    if (targetZone.input) {
        targetZone.input.cursor = 'pointer';
    }

    const hoverScale = options.hoverScale || 0.96;
    const pressScale = options.pressScale || 0.91;

    targetZone.on('pointerover', () => {
        if (targetZone.input) targetZone.input.cursor = 'pointer';
        if (scene && scene.input && typeof scene.input.setDefaultCursor === 'function') {
            scene.input.setDefaultCursor('pointer');
        }
        if (scene && scene.tweens) {
            if (typeof scene.tweens.killTweensOf === 'function') {
                scene.tweens.killTweensOf(container);
            }
            scene.tweens.add({
                targets: container,
                scaleX: hoverScale,
                scaleY: hoverScale,
                duration: 100,
                ease: 'Quad.easeOut'
            });
        }
        if (typeof options.onOver === 'function') {
            options.onOver();
        }
    });

    targetZone.on('pointerout', () => {
        if (scene && scene.input && typeof scene.input.setDefaultCursor === 'function') {
            scene.input.setDefaultCursor('default');
        }
        if (scene && scene.tweens) {
            if (typeof scene.tweens.killTweensOf === 'function') {
                scene.tweens.killTweensOf(container);
            }
            scene.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Quad.easeOut'
            });
        }
        if (typeof options.onOut === 'function') {
            options.onOut();
        }
    });

    targetZone.on('pointerdown', () => {
        if (scene && scene.tweens) {
            if (typeof scene.tweens.killTweensOf === 'function') {
                scene.tweens.killTweensOf(container);
            }
            scene.tweens.add({
                targets: container,
                scaleX: pressScale,
                scaleY: pressScale,
                duration: 70,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        }
        if (window.retroAudio && typeof window.retroAudio.uiClick === 'function') {
            window.retroAudio.uiClick();
        }
        if (typeof onClickCallback === 'function') {
            onClickCallback();
        }
    });
}

// ==========================================
// SCENE 4: SHOP SCENE (CỬA HÀNG GIỮA CÁC WAVE)
// ==========================================
class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    createHitArea(container, width, height) {
        return createContainerHitArea(this, container, width, height);
    }

    attachInteractiveCardEffects(container, hitZone, onClickCallback, options = {}) {
        return attachInteractiveCardEffects(this, container, hitZone, onClickCallback, options);
    }

    create() {
        if (window.ytSDK) window.ytSDK.bindScene(this);
        const { width, height } = this.scale;
        this.rerollCost = 5;

        // Tự động hồi phục 100% máu về mức tối đa khi chiến thắng vòng đấu
        GlobalPlayerState.hp = GlobalPlayerState.maxHp;

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
        this.titleText = this.add.text(width / 2, 22, t('shop.title', { level: GlobalPlayerState.currentWave, max: GAME_CONFIG.MAX_WAVES }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '20px',
            color: '#38bdf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Tiền vàng hiện có & tiền vàng nhặt được trong vòng
        this.goldDisplay = this.add.text(width / 2, 46, t('shop.gold', { gold: GlobalPlayerState.gold }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '18px',
            color: '#facc15',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const roundGoldEarned = GlobalPlayerState.roundGold || 0;
        this.roundGoldText = this.add.text(width / 2, 65, t('shop.round_gold', { gold: roundGoldEarned }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            color: '#38bdf8'
        }).setOrigin(0.5);

        // Thông báo tích cực đã hồi phục 100% máu sau khi chiến thắng vòng
        this.healNoticeText = this.add.text(width / 2, 83, t('shop.heal_notice'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#34d399',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Khung hiển thị 6 vũ khí đang trang bị
        this.createEquippedWeaponsPanel(width, height);

        // Khung 4 thẻ nâng cấp dài hạn & súng mới
        this.shopItemsContainer = this.add.container(0, 0);
        this.renderShopUpgradeCards();

        // Hệ thống nút thao tác Cửa hàng & Quảng cáo kiếm tiền (Monetization Ads)
        this.createShopActionButtons(width, height);

        // Bảng tóm tắt chỉ số ở đáy màn hình
        this.createStatsFooter(width, height);
    }

    getRandomWeaponOffer() {
        const weaponTypes = window.SurvivorGame.WEAPON_TYPES || (window.GAME_DATA && window.GAME_DATA.WEAPON_TYPES) || {};
        const weapons = Object.values(weaponTypes);
        return Phaser.Utils.Array.GetRandom(weapons);
    }

    createEquippedWeaponsPanel(width, height) {
        this.weaponsHeader = this.add.text(width / 2, 102, t('shop.weapons_header', { count: GlobalPlayerState.weapons.length, max: GAME_CONFIG.MAX_WEAPONS }), {
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
        const slotY = 135;
        const slotWidth = 92;
        const slotHeight = 44;
        const totalSlots = GAME_CONFIG.MAX_WEAPONS;
        const spacing = 112;
        const startX = 400 - ((totalSlots - 1) * spacing) / 2;

        this.weaponsHeader.setText(t('shop.weapons_header', { count: GlobalPlayerState.weapons.length, max: GAME_CONFIG.MAX_WEAPONS }));

        for (let i = 0; i < totalSlots; i++) {
            const slotX = startX + i * spacing;
            const wp = GlobalPlayerState.weapons[i];

            const slotContainer = this.add.container(slotX, slotY);

            const box = this.add.graphics();
            const drawSlotBox = (isHover = false) => {
                box.clear();
                box.fillStyle(isHover ? 0x334155 : 0x1e293b, 0.95);
                box.fillRoundedRect(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight, 8);
                box.lineStyle(2, wp ? (isHover ? 0xfbbf24 : 0x38bdf8) : 0x334155, 1);
                box.strokeRoundedRect(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight, 8);
            };
            drawSlotBox(false);
            slotContainer.add(box);

            if (wp) {
                let texKey = 'wp_pistol';
                if (wp.id === 'shotgun') texKey = 'wp_shotgun';
                else if (wp.id === 'smg') texKey = 'wp_smg';
                else if (wp.id === 'laser') texKey = 'wp_laser';
                else if (wp.id === 'rocket') texKey = 'wp_rocket';
                else if (wp.id === 'katana') texKey = 'wp_blade';

                const icon = this.add.sprite(-22, 0, texKey).setScale(0.95);
                const nameStr = wp.id ? t(`wp.${wp.id}.short`) : wp.name.split(' ')[0];
                const wpName = this.add.text(12, -7, nameStr, {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '11px',
                    color: '#e2e8f0',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                // Nhãn Bán lại vũ khí hoàn tiền (60% giá) - toàn bộ ô 92x44 đều nhận click
                const refund = Math.max(10, Math.round((wp.price || 30) * 0.6));
                const sellBtn = this.add.text(12, 8, t('shop.sell_btn', { price: refund }), {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '10px',
                    color: '#fbbf24',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                slotContainer.add([icon, wpName, sellBtn]);

                const hitArea = this.createHitArea(slotContainer, slotWidth, slotHeight);
                this.attachInteractiveCardEffects(slotContainer, hitArea, () => {
                    GlobalPlayerState.weapons.splice(i, 1);
                    GlobalPlayerState.gold += refund;
                    window.retroAudio.buy();
                    this.updateGoldDisplay();
                    this.renderEquippedWeapons();
                    this.renderShopUpgradeCards();
                }, {
                    onOver: () => drawSlotBox(true),
                    onOut: () => drawSlotBox(false)
                });
            } else {
                const emptyTxt = this.add.text(0, 0, t('shop.empty_slot'), {
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '12px',
                    color: '#64748b'
                }).setOrigin(0.5);
                slotContainer.add(emptyTxt);
                disableChildrenInput(slotContainer);
            }

            this.weaponsContainer.add(slotContainer);
        }
    }

    updateGoldDisplay() {
        this.goldDisplay.setText(t('shop.gold', { gold: GlobalPlayerState.gold }));
        this.updateStatsFooter();
        if (this.rerollBtnContainer) {
            this.createRerollButton(this.scale.width, this.scale.height);
        }
    }

    // Hiển thị 4 thẻ nâng cấp dài hạn & súng mới (Hitbox 100% toàn bộ diện tích thẻ)
    renderShopUpgradeCards() {
        this.shopItemsContainer.removeAll(true);

        const cardWidth = 180;
        const cardHeight = 220;
        const cardY = 280;
        const cardXPositions = [105, 301, 497, 693];

        const basePrice = this.currentGunOffer.price || 35;
        const currentGunsCount = GlobalPlayerState.weapons.length;
        const currentRound = GlobalPlayerState.currentWave;
        const gunPrice = Math.round(basePrice * Math.pow(1.5, currentGunsCount) + Math.min(60, (currentRound - 1) * 3));

        const gunId = this.currentGunOffer.id;
        const gunTitle = gunId ? t(`wp.${gunId}.short`) : this.currentGunOffer.name.split(' ')[0];
        const gunDesc = gunId ? t(`wp.${gunId}.desc`) : this.currentGunOffer.description;

        const cardsData = [
            // 1. TĂNG SÁT THƯƠNG VĨNH VIỄN (+25% giá mỗi lần mua)
            {
                id: 'dmg',
                title: t('shop.card.dmg.title'),
                tag: t('shop.card.dmg.tag'),
                color: 0xef4444,
                desc: t('shop.card.dmg.desc'),
                currentVal: t('shop.card.dmg.val', { val: Math.round((GlobalPlayerState.damageMult - 1) * 100) }),
                price: GlobalPlayerState.upgradePrices.damage,
                canBuy: () => GlobalPlayerState.gold >= GlobalPlayerState.upgradePrices.damage,
                onBuy: () => {
                    const p = GlobalPlayerState.upgradePrices.damage;
                    GlobalPlayerState.gold -= p;
                    GlobalPlayerState.damageMult = (GlobalPlayerState.damageMult || 1) + 0.10;
                    GlobalPlayerState.upgradePrices.damage = Math.round(p * 1.25);
                }
            },
            // 2. TĂNG MÁU TỐI ĐA & GIÁP (+25% giá mỗi lần mua)
            {
                id: 'hp_armor',
                title: t('shop.card.hp.title'),
                tag: t('shop.card.hp.tag'),
                color: 0x10b981,
                desc: t('shop.card.hp.desc'),
                currentVal: t('shop.card.hp.val', { hp: GlobalPlayerState.maxHp, armor: GlobalPlayerState.armor || 0 }),
                price: GlobalPlayerState.upgradePrices.hp,
                canBuy: () => GlobalPlayerState.gold >= GlobalPlayerState.upgradePrices.hp,
                onBuy: () => {
                    const p = GlobalPlayerState.upgradePrices.hp;
                    GlobalPlayerState.gold -= p;
                    GlobalPlayerState.maxHp += 25;
                    GlobalPlayerState.hp = Math.min(GlobalPlayerState.maxHp, GlobalPlayerState.hp + 25);
                    GlobalPlayerState.armor = (GlobalPlayerState.armor || 0) + 1;
                    GlobalPlayerState.upgradePrices.hp = Math.round(p * 1.25);
                }
            },
            // 3. TĂNG TỐC ĐỘ DI CHUYỂN (+25% giá mỗi lần mua)
            {
                id: 'speed',
                title: t('shop.card.speed.title'),
                tag: t('shop.card.speed.tag'),
                color: 0x38bdf8,
                desc: t('shop.card.speed.desc'),
                currentVal: t('shop.card.speed.val', { val: Math.round((GlobalPlayerState.speedMult - 1) * 100) }),
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
                title: `🔫 ${gunTitle}`,
                tag: t('shop.card.weapon.tag', { cur: GlobalPlayerState.weapons.length + 1, max: GAME_CONFIG.MAX_WEAPONS }),
                color: 0xfacc15,
                desc: gunDesc,
                currentVal: t('shop.card.weapon.val', { dmg: this.currentGunOffer.baseDamage, cd: ((this.currentGunOffer.baseCooldown || 600) / 1000).toFixed(1) }),
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

            const canAfford = cData.canBuy();
            const isFullWeapons = cData.isWeaponSlot && GlobalPlayerState.weapons.length >= GAME_CONFIG.MAX_WEAPONS;

            const bgG = this.add.graphics();
            const drawCardBg = (isHover = false) => {
                bgG.clear();
                bgG.fillStyle(isHover ? 0x26354d : 0x1e293b, 0.96);
                bgG.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
                bgG.lineStyle(isHover ? 3 : 2, cData.color, isHover ? 1 : 0.85);
                bgG.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
            };
            drawCardBg(false);

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

            // Nút Mua (BUY BUTTON) trang trí đồng bộ bên trong thẻ
            const buyBtn = this.add.container(0, cardHeight / 2 - 32);
            const btnW = 140;
            const btnH = 34;

            const buyG = this.add.graphics();
            const btnColor = isFullWeapons ? 0x475569 : (canAfford ? 0x10b981 : 0x334155);
            const drawBuyBtn = (isHover = false) => {
                buyG.clear();
                const fillCol = (canAfford && !isFullWeapons && isHover) ? 0x059669 : btnColor;
                const strokeCol = (canAfford && !isFullWeapons) ? (isHover ? 0x6ee7b7 : 0x34d399) : 0x475569;
                buyG.fillStyle(fillCol, 1);
                buyG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
                buyG.lineStyle(2, strokeCol, 1);
                buyG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 17);
            };
            drawBuyBtn(false);

            let btnLabel = t('shop.buy_btn', { price: cData.price });
            if (isFullWeapons) btnLabel = t('shop.full_weapons');
            else if (!canAfford) btnLabel = t('shop.no_gold', { price: cData.price });

            const buyText = this.add.text(0, 0, btnLabel, {
                fontFamily: 'Outfit, sans-serif',
                fontSize: isFullWeapons ? '11px' : '12px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            buyBtn.add([buyG, buyText]);
            card.add([bgG, title, tag, desc, statVal, buyBtn]);

            // Lớp phủ Hitbox 100% diện tích toàn bộ thẻ lớn (180x220) ở lớp trên cùng
            const hitArea = this.createHitArea(card, cardWidth, cardHeight);

            this.attachInteractiveCardEffects(card, hitArea, () => {
                if (canAfford && !isFullWeapons) {
                    this._lastPurchasedCardIdx = idx;
                    cData.onBuy();
                    window.retroAudio.buy();
                    this.updateGoldDisplay();
                    this.renderEquippedWeapons();
                    this.renderShopUpgradeCards();
                } else if (isFullWeapons) {
                    this.showToast(t('shop.toast.full_weapons'), '#f87171');
                } else {
                    this.showToast(t('shop.toast.no_gold'), '#f87171');
                }
            }, {
                onOver: () => {
                    drawCardBg(true);
                    drawBuyBtn(true);
                },
                onOut: () => {
                    drawCardBg(false);
                    drawBuyBtn(false);
                }
            });

            // Hoàn tất hiệu ứng nảy lại mượt mà sau khi thẻ vừa được mua & vẽ lại
            if (this._lastPurchasedCardIdx === idx) {
                this._lastPurchasedCardIdx = -1;
                if (typeof card.setScale === 'function') {
                    card.setScale(0.91);
                }
                if (this.tweens) {
                    this.tweens.add({
                        targets: card,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 110,
                        ease: 'Quad.easeOut'
                    });
                }
            }

            this.shopItemsContainer.add(card);
        });
    }

    // Hệ thống nút điều khiển Shop & Quảng cáo kiếm tiền (Rewarded & Interstitial)
    createShopActionButtons(width, height) {
        this.createRerollButton(width, height);
        this.createFreeRerollAdButton(width, height);
        this.createBonusGoldAdButton(width, height);
        this.createNextRoundButton(width, height);
    }

    // 1. Nút Làm mới súng bằng vàng
    createRerollButton(width, height) {
        if (this.rerollBtnContainer) {
            this.rerollBtnContainer.destroy();
            this.rerollBtnContainer = null;
        }

        const btnY = 428;
        const rerollBtn = this.add.container(width / 2 - 150, btnY);
        this.rerollBtnContainer = rerollBtn;

        const btnW = 250;
        const btnH = 38;

        const g = this.add.graphics();
        const canAfford = GlobalPlayerState.gold >= this.rerollCost;
        const drawRerollBg = (isHover = false) => {
            g.clear();
            g.fillStyle(canAfford ? (isHover ? 0x475569 : 0x334155) : 0x1e293b, 1);
            g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 19);
            g.lineStyle(2, canAfford ? (isHover ? 0x94a3b8 : 0x64748b) : 0x334155, 1);
            g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 19);
        };
        drawRerollBg(false);

        const txt = this.add.text(0, 0, t('shop.reroll_btn', { cost: this.rerollCost }), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: canAfford ? '#ffffff' : '#64748b',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        rerollBtn.add([g, txt]);
        const hitArea = this.createHitArea(rerollBtn, btnW, btnH);

        this.attachInteractiveCardEffects(rerollBtn, hitArea, () => {
            if (GlobalPlayerState.gold >= this.rerollCost) {
                this._justRerolled = true;
                GlobalPlayerState.gold -= this.rerollCost;
                this.rerollCost += 2;
                this.currentGunOffer = this.getRandomWeaponOffer();
                window.retroAudio.reroll();
                this.updateGoldDisplay();
                this.renderShopUpgradeCards();
                this.createRerollButton(width, height);
            } else {
                this.showToast(t('shop.toast.no_gold_reroll'), '#f87171');
            }
        }, {
            onOver: () => drawRerollBg(true),
            onOut: () => drawRerollBg(false)
        });

        if (this._justRerolled) {
            this._justRerolled = false;
            if (typeof rerollBtn.setScale === 'function') {
                rerollBtn.setScale(0.91);
            }
            if (this.tweens) {
                this.tweens.add({
                    targets: rerollBtn,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 110,
                    ease: 'Quad.easeOut'
                });
            }
        }
    }

    // 2. Nút Xem QC nhận Reroll miễn phí (REWARD_AD_IDS.FREE_REROLL)
    createFreeRerollAdButton(width, height) {
        const btnY = 428;
        const adBtn = this.add.container(width / 2 + 150, btnY);
        const btnW = 250;
        const btnH = 38;

        const g = this.add.graphics();
        const drawAdBg = (isHover = false) => {
            g.clear();
            g.fillStyle(isHover ? 0x4f46e5 : 0x4338ca, 1);
            g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 19);
            g.lineStyle(2, isHover ? 0xa5b4fc : 0x818cf8, 1);
            g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 19);
        };
        drawAdBg(false);

        const txt = this.add.text(0, 0, t('shop.free_reroll_btn'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        adBtn.add([g, txt]);
        const hitArea = this.createHitArea(adBtn, btnW, btnH);

        this.attachInteractiveCardEffects(adBtn, hitArea, () => {
            const rewardId = window.SurvivorGame.REWARD_AD_IDS ? window.SurvivorGame.REWARD_AD_IDS.FREE_REROLL : 'orbit-reward-free-reroll';
            txt.setText(t('shop.ad_loading'));
            window.ytSDK.showRewardedAd(() => {
                txt.setText(t('shop.free_reroll_btn'));
                this.currentGunOffer = this.getRandomWeaponOffer();
                window.retroAudio.reroll();
                this.renderShopUpgradeCards();
                this.showToast(t('shop.toast.free_reroll_ok'), '#a78bfa');
            }, () => {
                txt.setText(t('shop.ad_failed'));
            }, rewardId);
        }, {
            onOver: () => drawAdBg(true),
            onOut: () => drawAdBg(false)
        });
    }

    // 3. Nút Xem QC nhận 100 Vàng (REWARD_AD_IDS.BONUS_GOLD)
    createBonusGoldAdButton(width, height) {
        const btnY = 476;
        const goldBtn = this.add.container(width / 2 - 150, btnY);
        const btnW = 250;
        const btnH = 42;

        const g = this.add.graphics();
        const drawGoldBg = (isHover = false) => {
            g.clear();
            g.fillStyle(isHover ? 0xea580c : 0xd97706, 1);
            g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 21);
            g.lineStyle(2, isHover ? 0xfde047 : 0xfbbf24, 1);
            g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 21);
        };
        drawGoldBg(false);

        const txt = this.add.text(0, 0, t('shop.watch_ad_gold_btn'), {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        goldBtn.add([g, txt]);
        const hitArea = this.createHitArea(goldBtn, btnW, btnH);

        this.attachInteractiveCardEffects(goldBtn, hitArea, () => {
            const rewardId = window.SurvivorGame.REWARD_AD_IDS ? window.SurvivorGame.REWARD_AD_IDS.BONUS_GOLD : 'orbit-reward-100-gold';
            txt.setText(t('shop.ad_loading'));
            window.ytSDK.showRewardedAd(() => {
                txt.setText(t('shop.watch_ad_gold_btn'));
                GlobalPlayerState.gold += 100;
                window.retroAudio.buy();
                this.updateGoldDisplay();
                this.renderShopUpgradeCards();
                this.showToast(t('shop.toast.bonus_gold_ok'), '#facc15');
            }, () => {
                txt.setText(t('shop.ad_failed'));
            }, rewardId);
        }, {
            onOver: () => drawGoldBg(true),
            onOut: () => drawGoldBg(false)
        });
    }

    // 4. Nút Tiếp tục vòng đấu tiếp theo (Kèm Interstitial Ad chuyển cảnh)
    createNextRoundButton(width, height) {
        const btnY = 476;
        const nextBtn = this.add.container(width / 2 + 150, btnY);
        const btnW = 250;
        const btnH = 42;

        const g = this.add.graphics();
        const drawNextBg = (isHover = false) => {
            g.clear();
            g.fillStyle(isHover ? 0x0ea5e9 : 0x0284c7, 1);
            g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 21);
            g.lineStyle(2, isHover ? 0xbae6fd : 0x38bdf8, 1);
            g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 21);
        };
        drawNextBg(false);

        const txt = this.add.text(0, 0, t('shop.continue_btn', { next: GlobalPlayerState.currentWave + 1 }), {
            fontFamily: 'Orbitron, Outfit, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        nextBtn.add([g, txt]);
        const hitArea = this.createHitArea(nextBtn, btnW, btnH);

        this.attachInteractiveCardEffects(nextBtn, hitArea, () => {
            window.retroAudio.waveComplete();
            GlobalPlayerState.hp = GlobalPlayerState.maxHp;
            GlobalPlayerState.currentWave++;
            // Lưu tiến trình và đồng bộ sendScore / saveData khi qua vòng
            if (window.ytSDK && typeof window.ytSDK.saveGameProgress === 'function') {
                window.ytSDK.saveGameProgress(GlobalPlayerState.currentScore, GlobalPlayerState.currentWave);
            }
            // Chạy Interstitial Ad chuyển cảnh giữa các Level
            window.ytSDK.showInterstitialAd(() => {
                this.scene.start('GameScene');
            });
        }, {
            onOver: () => drawNextBg(true),
            onOut: () => drawNextBg(false)
        });
    }

    // Hiển thị thông báo Toast nổi mượt mà
    showToast(msg, color = '#ffffff') {
        const { width } = this.scale;
        const toast = this.add.text(width / 2, 400, msg, {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '15px',
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: toast,
            y: 365,
            alpha: 0,
            duration: 1300,
            ease: 'Cubic.easeOut',
            onComplete: () => toast.destroy()
        });
    }

    createStatsFooter(width, height) {
        this.statsFooterText = this.add.text(width / 2, 528, '', {
            fontFamily: 'Outfit, sans-serif',
            fontSize: '12px',
            color: '#94a3b8'
        }).setOrigin(0.5);
        this.updateStatsFooter();
    }

    updateStatsFooter() {
        if (!this.statsFooterText) return;
        const hpStr = `${Math.round(GlobalPlayerState.hp)}`;
        const dmgStr = `+${Math.round((GlobalPlayerState.damageMult - 1) * 100)}%`;
        const spdStr = `+${Math.round((GlobalPlayerState.speedMult - 1) * 100)}%`;
        const atkStr = `+${Math.round((1 - GlobalPlayerState.attackSpeedMult) * 100)}%`;
        const armStr = `${GlobalPlayerState.armor || 0}`;

        this.statsFooterText.setText(t('shop.stats_footer', {
            hp: hpStr,
            maxHp: GlobalPlayerState.maxHp,
            armor: armStr,
            dmg: dmgStr,
            atk: atkStr,
            move: spdStr
        }));
    }
}

// ==========================================
// EXPORTS & GLOBAL ALIASES
// ==========================================
window.SurvivorGame.createContainerHitArea = createContainerHitArea;
window.SurvivorGame.attachInteractiveCardEffects = attachInteractiveCardEffects;
window.SurvivorGame.SkillModalSystem = SkillModalSystem;
window.SurvivorGame.ShopScene = ShopScene;
window.ShopScene = ShopScene;
