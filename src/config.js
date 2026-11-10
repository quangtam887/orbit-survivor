/**
 * SURVIVOR PLAYABLES - MODULE CẤU HÌNH THÔNG SỐ (CONFIG)
 * Quản lý toàn bộ hằng số cân bằng game, vũ khí, thẻ nâng cấp, shop và người chơi
 */

window.SurvivorGame = window.SurvivorGame || {};

// ==========================================
// HỆ THỐNG ĐA NGÔN NGỮ CHUẨN YOUTUBE PLAYABLES (EN MẶC ĐỊNH, VI PHỤ)
// Chỉ sử dụng ytgame.system.getLanguage() theo quy định SDK
// ==========================================
const I18N = {
    currentLang: 'en',

    dictionary: {
        en: {
            // BootScene
            'boot.init': 'INITIALIZING GAME...',
            'boot.loading': 'LOADING DATA...',

            // MenuScene
            'menu.subtitle': 'YOUTUBE PLAYABLES EDITION • 3-MINUTE SURVIVAL',
            'menu.record': '🏆 HIGH SCORE: {score}  |  🌊 MAX LEVEL: {level} / {max}',
            'menu.play_btn': '⚔️ PLAY NOW',
            'menu.guide_controls': '💻 WASD / Arrow Keys  |  📱 Touch & Drag Virtual Joystick',
            'menu.guide_gameplay': '🎯 Auto-aim & fire at nearest enemies • 3 mins per wave • Shop after wave',

            // Weapons
            'wp.pistol.name': 'Pistol',
            'wp.pistol.short': 'Pistol',
            'wp.pistol.desc': 'Balanced starter weapon with high accuracy and steady damage.',
            'wp.shotgun.name': 'Shotgun',
            'wp.shotgun.short': 'Shotgun',
            'wp.shotgun.desc': 'Fires a 5-pellet spread with strong close-range knockback.',
            'wp.smg.name': 'SMG',
            'wp.smg.short': 'SMG',
            'wp.smg.desc': 'Ultra-fast fire rate that suppresses large enemy swarms.',
            'wp.laser.name': 'Plasma Laser',
            'wp.laser.short': 'Laser',
            'wp.laser.desc': 'Energy beam that pierces up to 3 enemies in a straight line.',
            'wp.rocket.name': 'Grenade Launcher',
            'wp.rocket.short': 'Rocket',
            'wp.rocket.desc': 'Launches explosive shells that deal AoE damage to nearby enemies.',
            'wp.katana.name': 'Energy Katana',
            'wp.katana.short': 'Katana',
            'wp.katana.desc': 'Sweeping melee slash that cleaves surrounding enemies with high damage.',

            // Level-up / Wave reward skill modal & cards
            'modal.title': '⭐ WAVE REWARD: CHOOSE A SKILL ⭐',
            'modal.subtitle': 'You have {count} pending skill pick(s)!',
            'modal.select_btn': 'SELECT SKILL',
            'card.speed_up.title': '👟 Move Speed Up',
            'card.speed_up.desc': '+15% Movement speed to dodge enemies smoothly.',
            'card.attack_speed.title': '⚡ Attack Speed Up',
            'card.attack_speed.desc': '+20% Fire rate for all equipped weapons.',
            'card.flat_damage.title': '💥 Base Damage Up',
            'card.flat_damage.desc': '+3 Flat damage added to every projectile.',
            'card.percent_damage.title': '🔥 Mighty Power',
            'card.percent_damage.desc': '+15% Total damage dealt by all weapons.',
            'card.max_hp.title': '❤️ Max HP & Armor',
            'card.max_hp.desc': '+25 Max HP (+25 current HP) and +1 Armor for durability.',
            'card.range_up.title': '🎯 Attack Range Up',
            'card.range_up.desc': '+25% Target detection and firing range.',
            'card.crit_chance.title': '🎲 Critical Strike',
            'card.crit_chance.desc': '+12% Critical hit chance for 2.0x damage.',
            'card.magnet_up.title': '🧲 Gem Magnet',
            'card.magnet_up.desc': '+40% Pickup radius for EXP & Gold gems.',
            'card.armor_up.title': '🛡️ Reinforced Armor',
            'card.armor_up.desc': '+3 Armor (Reduces incoming damage by 12%).',

            // Shop stat items
            'shop_item.shop_damage.name': 'Permanent Damage Up',
            'shop_item.shop_damage.desc': '+10% Damage output for all weapons.',
            'shop_item.shop_max_hp_armor.name': '❤️ Max HP & Armor',
            'shop_item.shop_max_hp_armor.desc': '+25 Max HP (+25 current HP) and +1 Armor.',
            'shop_item.shop_speed.name': 'Move Speed Up',
            'shop_item.shop_speed.desc': '+15% Movement speed for agile dodging.',
            'shop_item.shop_atk_speed.name': 'Rapid Fire Module',
            'shop_item.shop_atk_speed.desc': '+15% Attack speed for all weapons.',
            'shop_item.shop_crit.name': 'Critical Scope',
            'shop_item.shop_crit.desc': '+10% Critical hit chance for 2.0x damage.',
            'shop_item.shop_magnet.name': 'Magnetic Attractor',
            'shop_item.shop_magnet.desc': '+50 Pickup radius for EXP & Gold gems.',

            // GameScene HUD & Combat Notices
            'hud.level_title': 'LEVEL {level} / {max}',
            'hud.enemies': '👾 Enemies: {count} / {max}',
            'hud.enemies_tier': '👾 Enemies: {count} / {max} | Tier: T{minT}({minL}) - T{maxT}({maxL})',
            'hud.berserk_enemies': '🔥 BERSERK: {count} enemies! (Tier {maxT} {maxL})',
            'hud.player_level': '⭐ LV.{level}',
            'hud.pending_cards': '🎁 Cards: {count}',
            'hud.level_up_float': '⭐ LEVEL UP! (+{count} CARD)',
            'hud.climax_banner': '⚡ CLIMAX: FINAL 15 SECONDS OF SURVIVAL! ⚡',
            'hud.wave_complete_banner': 'WAVE {level} CLEARED!\n✨ 100% HP RESTORED! ✨',
            'enemy.boss_spawn': '☠️ LEVEL {level} BOSS (TIER {tier}) APPEARED! ☠️',
            'enemy.elite_spawn': '⚠️ MINI-ELITE TIER {tier} (5X GOLD & EXP) APPEARED! ⚠️',
            'enemy.elite_slain': '⭐ MINI-ELITE SLAIN! +5X GOLD & EXP! ⭐',
            'enemy.boss_slain': '👑 OVERLORD BOSS DEFEATED! 👑',
            'enemy.idle_warn': '⚠️ WARNING: KEEP MOVING!\nEnemies go berserk in {sec}s...',
            'enemy.berserk_active': '🚨 BERSERK STAMPEDE (+200%)! MOVE NOW!\n(Escaped: {dist}/280px)',
            'enemy.berserk_start': '🚨 BERSERK STAMPEDE (+200%)! MOVE NOW! 🚨',
            'enemy.berserk_end': '✅ ESCAPED BERSERK ZONE! ENEMIES CALMED DOWN',

            // ShopScene
            'shop.title': '🛒 SHOP - LEVEL {level} / {max}',
            'shop.gold': 'GOLD: 💰 {gold}',
            'shop.round_gold': '(Gold earned last wave: +💰{gold})',
            'shop.heal_notice': '✨ WAVE CLEARED! 100% HP RESTORED!',
            'shop.weapons_header': 'EQUIPPED WEAPONS ({count}/{max})',
            'shop.empty_slot': '+ EMPTY',
            'shop.sell_btn': 'Sell 💰{price}',
            'shop.card.dmg.title': '💥 Damage Up',
            'shop.card.dmg.tag': '+10% Permanent',
            'shop.card.dmg.desc': 'Increases damage of all weapons by 10%.',
            'shop.card.dmg.val': 'Current: +{val}%',
            'shop.card.hp.title': '❤️ Max HP & Armor',
            'shop.card.hp.tag': '+25 Max HP & +1 Armor',
            'shop.card.hp.desc': '+25 Max HP (+25 current HP) and +1 Armor.',
            'shop.card.hp.val': 'Max HP: {hp} | Armor: {armor}',
            'shop.card.speed.title': '👟 Move Speed',
            'shop.card.speed.tag': '+15% Move Spd',
            'shop.card.speed.desc': 'Increases movement speed by 15% to dodge enemies.',
            'shop.card.speed.val': 'Current: +{val}%',
            'shop.card.weapon.tag': 'Weapon {cur} / {max}',
            'shop.card.weapon.val': 'DMG: {dmg} | CD: {cd}s',
            'shop.buy_btn': 'BUY: 💰{price}',
            'shop.full_weapons': 'FULL (6/6)',
            'shop.no_gold': 'NEED GOLD (💰{price})',
            'shop.reroll_btn': '🎲 REFRESH (💰{cost})',
            'shop.free_reroll_btn': '🎬 FREE REROLL',
            'shop.watch_ad_gold_btn': '🎬 WATCH AD +100 GOLD',
            'shop.continue_btn': 'CONTINUE ⚔️ LEVEL {next}',
            'shop.ad_loading': '⏳ LOADING AD...',
            'shop.ad_failed': '❌ AD FAILED - TRY AGAIN',
            'shop.toast.full_weapons': '⚠️ Weapon inventory is full (6/6)!',
            'shop.toast.no_gold': '⚠️ Not enough gold!',
            'shop.toast.no_gold_reroll': '⚠️ Not enough gold to refresh!',
            'shop.toast.free_reroll_ok': '🎉 Free Reroll Successful!',
            'shop.toast.bonus_gold_ok': '💰 Received +100 Gold!',
            'shop.stats_footer': '❤️ HP: {hp}/{maxHp}  |  🛡️ Armor: {armor}  |  💥 Damage: {dmg}  |  ⚡ Atk Spd: {atk}  |  👟 Move Spd: {move}',

            // VictoryScene & GameOverScene
            'victory.title': '👑 ULTIMATE VICTORY! 👑',
            'victory.subtitle': 'YOU SURVIVED ALL {max} LEVELS AND DEFEATED THE FINAL OVERLORD!',
            'victory.score': '🏆 SCORE: {score}   |   ⭐ BEST: {best}',
            'victory.kills': '👾 Enemies Defeated: {kills}',
            'victory.gold': '💰 Total Gold: {gold}',
            'victory.replay_btn': '🔄 PLAY AGAIN',
            'gameover.title': '💀 GAME OVER 💀',
            'gameover.level': 'LEVEL REACHED: {level} / {max}',
            'gameover.score': '🏆 Score: {score}   |   ⭐ High Score: {best}',
            'gameover.kills': '👾 Enemies Defeated: {kills}',
            'gameover.gold': '💰 Current Gold: {gold}',
            'gameover.revive_btn': '🎬 REVIVE 100% HP (LEVEL {level})',
            'gameover.watch_ad_gold': '🎬 WATCH AD +100 GOLD',
            'gameover.gold_claimed': '🎉 +100 GOLD CLAIMED!',
            'gameover.retry_btn': '⚔️ TRY AGAIN'
        },

        vi: {
            // BootScene
            'boot.init': 'KHỞI TẠO TỰA GAME...',
            'boot.loading': 'ĐANG TẢI DỮ LIỆU...',

            // MenuScene
            'menu.subtitle': 'YOUTUBE PLAYABLES EDITION • 3 PHÚT SINH TỒN',
            'menu.record': '🏆 KỶ LỤC: {score}  |  🌊 LEVEL CAO NHẤT: {level} / {max}',
            'menu.play_btn': '⚔️ BẮT ĐẦU CHƠI',
            'menu.guide_controls': '💻 Phím WASD / Mũi tên  |  📱 Chạm kéo Joystick cảm ứng',
            'menu.guide_gameplay': '🎯 Tự động ngắm & bắn quái gần nhất • 3 phút mỗi vòng • Shop sau trận',

            // Weapons
            'wp.pistol.name': 'Súng Lục (Pistol)',
            'wp.pistol.short': 'Pistol',
            'wp.pistol.desc': 'Vũ khí cơ bản cân bằng, độ chính xác cao và sát thương ổn định.',
            'wp.shotgun.name': 'Súng Shotgun',
            'wp.shotgun.short': 'Shotgun',
            'wp.shotgun.desc': 'Bắn chùm 5 viên đạn tản rộng, đẩy lùi quái cực mạnh ở cự ly gần.',
            'wp.smg.name': 'Tiểu Liên SMG',
            'wp.smg.short': 'SMG',
            'wp.smg.desc': 'Tốc độ xả đạn cực nhanh, áp chế đàn quái đông đảo.',
            'wp.laser.name': 'Súng Plasma Laser',
            'wp.laser.short': 'Laser',
            'wp.laser.desc': 'Tia năng lượng xuyên phá tối đa 3 kẻ địch trên một đường thẳng.',
            'wp.rocket.name': 'Súng Phóng Lựu Nảy',
            'wp.rocket.short': 'Rocket',
            'wp.rocket.desc': 'Bắn lựu đạn nảy nổ diện rộng, dọn sạch quái vật xung quanh mục tiêu.',
            'wp.katana.name': 'Kiếm Năng Lượng',
            'wp.katana.short': 'Katana',
            'wp.katana.desc': 'Xoay tròn chém càn quét mọi kẻ địch xung quanh với sát thương cao.',

            // Level-up / Wave reward skill modal & cards
            'modal.title': '⭐ TỔNG KẾT VÒNG: CHỌN KỸ NĂNG ⭐',
            'modal.subtitle': 'Bạn còn {count} lượt chọn thẻ kỹ năng tích lũy!',
            'modal.select_btn': 'CHỌN KỸ NĂNG',
            'card.speed_up.title': '👟 Tăng Tốc Độ Chạy',
            'card.speed_up.desc': '+15% Tốc độ di chuyển giúp né quái mượt mà hơn.',
            'card.attack_speed.title': '⚡ Tăng Tốc Bắn',
            'card.attack_speed.desc': '+20% Tốc độ xả đạn cho tất cả 6 vũ khí.',
            'card.flat_damage.title': '💥 Tăng Sát Thương Gốc',
            'card.flat_damage.desc': '+3 Sát thương cộng dồn cho mỗi viên đạn bắn ra.',
            'card.percent_damage.title': '🔥 Sức Mạnh Cơ Bắp',
            'card.percent_damage.desc': '+15% Tổng sát thương của người chơi.',
            'card.max_hp.title': '❤️ Tăng Máu & Giáp',
            'card.max_hp.desc': '+25 Máu tối đa (+25 Máu hiện tại) và +1 Giáp để chống chịu quái cấp cao.',
            'card.range_up.title': '🎯 Tăng Tầm Bắn',
            'card.range_up.desc': '+25% Tầm bắn phát hiện mục tiêu.',
            'card.crit_chance.title': '🎲 Đòn Chí Mạng',
            'card.crit_chance.desc': '+12% Tỉ lệ bạo kích nhân 2.0x sát thương.',
            'card.magnet_up.title': '🧲 Nam Châm Hút Ngọc',
            'card.magnet_up.desc': '+40% Bán kính tự động hút hạt EXP & Tiền Vàng.',
            'card.armor_up.title': '🛡️ Giáp Cường Hóa',
            'card.armor_up.desc': '+3 Giáp bảo hộ (Giảm 12% sát thương nhận vào).',

            // Shop stat items
            'shop_item.shop_damage.name': 'Tăng Sát Thương Vĩnh Viễn',
            'shop_item.shop_damage.desc': '+10% Toàn bộ sát thương đầu ra của tất cả vũ khí.',
            'shop_item.shop_max_hp_armor.name': '❤️ Tăng Máu & Giáp',
            'shop_item.shop_max_hp_armor.desc': '+25 Máu tối đa (+25 HP hiện tại) và +1 Giáp bảo vệ.',
            'shop_item.shop_speed.name': 'Tăng Tốc Độ Di Chuyển',
            'shop_item.shop_speed.desc': '+15% Tốc độ di chuyển giúp né tránh linh hoạt hơn.',
            'shop_item.shop_atk_speed.name': 'Mô-đun Tăng Tốc Bắn',
            'shop_item.shop_atk_speed.desc': '+15% Tốc độ bắn toàn bộ vũ khí.',
            'shop_item.shop_crit.name': 'Kính Ngắm Bạo Kích',
            'shop_item.shop_crit.desc': '+10% Tỉ lệ đòn chí mạng nhân đôi sát thương.',
            'shop_item.shop_magnet.name': 'Bộ Thu Hút Từ Trường',
            'shop_item.shop_magnet.desc': '+50 Bán kính nam châm nhặt ngọc & vàng.',

            // GameScene HUD & Combat Notices
            'hud.level_title': 'LEVEL {level} / {max}',
            'hud.enemies': '👾 Quái: {count} / {max}',
            'hud.enemies_tier': '👾 Quái: {count} / {max} | Bậc: T{minT}({minL}) - T{maxT}({maxL})',
            'hud.berserk_enemies': '🔥 BẠO LOẠN: {count} quái! (Tier {maxT} {maxL})',
            'hud.player_level': '⭐ CẤP {level}',
            'hud.pending_cards': '🎁 Thẻ chờ: {count}',
            'hud.level_up_float': '⭐ LEVEL UP! (+{count} THẺ CHỜ)',
            'hud.climax_banner': '⚡ CAO TRÀO: 15 GIÂY SINH TỒN CUỐI CÙNG! ⚡',
            'hud.wave_complete_banner': 'HOÀN THÀNH VÒNG {level}!\n✨ ĐÃ HỒI PHỤC 100% MÁU! ✨',
            'enemy.boss_spawn': '☠️ TRÙM BOSS LEVEL {level} (TIER {tier}) XUẤT HIỆN! ☠️',
            'enemy.elite_spawn': '⚠️ MINI-ELITE TIER {tier} (VÀNG & EXP X5) XUẤT HIỆN! ⚠️',
            'enemy.elite_slain': '⭐ TIÊU DIỆT MINI-ELITE! +VÀNG & EXP X5! ⭐',
            'enemy.boss_slain': '👑 ĐẠI THẮNG TRÙM BOSS OVERLORD! 👑',
            'enemy.idle_warn': '⚠️ CẢNH BÁO: HÃY DI CHUYỂN!\nQuái vật sắp nổi loạn sau {sec} giây...',
            'enemy.berserk_active': '🚨 QUÁI VẬT BẠO LOẠN (+200%)! DI CHUYỂN NGAY!\n(Đã thoát: {dist}/280px)',
            'enemy.berserk_start': '🚨 QUÁI VẬT BẠO LOẠN (+200%)! DI CHUYỂN NGAY! 🚨',
            'enemy.berserk_end': '✅ ĐÃ THOÁT KHỎI KHU VỰC BẠO LOẠN! QUÁI HẠ NHIỆT',

            // ShopScene
            'shop.title': '🛒 CỬA HÀNG LEVEL {level} / {max}',
            'shop.gold': 'VÀNG HIỆN CÓ: 💰 {gold}',
            'shop.round_gold': '(Vàng nhặt được trong vòng vừa qua: +💰{gold})',
            'shop.heal_notice': '✨ CHIẾN THẮNG VÒNG! ĐÃ HỒI PHỤC 100% MÁU!',
            'shop.weapons_header': 'KHO VŨ KHÍ TRANG BỊ ({count}/{max} Ô)',
            'shop.empty_slot': '+ TRỐNG',
            'shop.sell_btn': 'Bán 💰{price}',
            'shop.card.dmg.title': '💥 Tăng Sát Thương',
            'shop.card.dmg.tag': '+10% Vĩnh Viễn',
            'shop.card.dmg.desc': 'Tăng 10% sát thương cho tất cả các loại vũ khí.',
            'shop.card.dmg.val': 'Hiện tại: +{val}%',
            'shop.card.hp.title': '❤️ Tăng Máu & Giáp',
            'shop.card.hp.tag': '+25 Max HP & +1 Giáp',
            'shop.card.hp.desc': '+25 Máu tối đa (+25 HP hiện tại) và +1 Giáp bảo vệ.',
            'shop.card.hp.val': 'Max HP: {hp} | Giáp: {armor}',
            'shop.card.speed.title': '👟 Tốc Di Chuyển',
            'shop.card.speed.tag': '+15% Tốc Chạy',
            'shop.card.speed.desc': 'Tăng 15% tốc độ di chuyển giúp né quái linh hoạt.',
            'shop.card.speed.val': 'Hiện tại: +{val}%',
            'shop.card.weapon.tag': 'Súng {cur} / {max}',
            'shop.card.weapon.val': 'Sát thương: {dmg} | Tốc: {cd}s',
            'shop.buy_btn': 'MUA: 💰{price}',
            'shop.full_weapons': 'ĐẦY 6 Ô SÚNG',
            'shop.no_gold': 'THIẾU VÀNG (💰{price})',
            'shop.reroll_btn': '🎲 LÀM MỚI (💰{cost})',
            'shop.free_reroll_btn': '🎬 REROLL MIỄN PHÍ',
            'shop.watch_ad_gold_btn': '🎬 XEM QC NHẬN +100 VÀNG',
            'shop.continue_btn': 'TIẾP TỤC ⚔️ LEVEL {next}',
            'shop.ad_loading': '⏳ ĐANG TẢI QC...',
            'shop.ad_failed': '❌ QC THẤT BẠI - THỬ LẠI',
            'shop.toast.full_weapons': '⚠️ Kho vũ khí đã đầy 6/6 ô!',
            'shop.toast.no_gold': '⚠️ Chưa đủ vàng để nâng cấp!',
            'shop.toast.no_gold_reroll': '⚠️ Chưa đủ vàng để làm mới!',
            'shop.toast.free_reroll_ok': '🎉 Reroll Miễn Phí Thành Công!',
            'shop.toast.bonus_gold_ok': '💰 Đã Nhận +100 Vàng!',
            'shop.stats_footer': '❤️ Máu: {hp}/{maxHp}  |  🛡️ Giáp: {armor}  |  💥 Sát Thương: {dmg}  |  ⚡ Tốc Bắn: {atk}  |  👟 Tốc Chạy: {move}',

            // VictoryScene & GameOverScene
            'victory.title': '👑 CHIẾN THẮNG TUYỆT ĐỐI! 👑',
            'victory.subtitle': 'BẠN ĐÃ SỐNG SÓT QUA CẢ {max} LEVEL VÀ HẠ GỤC ĐẠI TRÙM CUỐI CÙNG!',
            'victory.score': '🏆 TỔNG ĐIỂM: {score}   |   ⭐ KỶ LỤC: {best}',
            'victory.kills': '👾 Quái đã diệt: {kills}',
            'victory.gold': '💰 Tổng vàng thu thập: {gold}',
            'victory.replay_btn': '🔄 CHƠI LẠI TRẬN MỚI',
            'gameover.title': '💀 BẠN ĐÃ HY SINH 💀',
            'gameover.level': 'LEVEL ĐẠT ĐƯỢC: {level} / {max}',
            'gameover.score': '🏆 Điểm Số: {score}   |   ⭐ Kỷ Lục: {best}',
            'gameover.kills': '👾 Quái Tiêu Diệt: {kills}',
            'gameover.gold': '💰 Vàng Hiện Có: {gold}',
            'gameover.revive_btn': '🎬 HỒI SINH 100% HP (VÒNG {level})',
            'gameover.watch_ad_gold': '🎬 XEM QC NHẬN +100 VÀNG',
            'gameover.gold_claimed': '🎉 ĐÃ NHẬN +100 VÀNG THÀNH CÔNG!',
            'gameover.retry_btn': '⚔️ THỬ LẠI TRẬN MỚI'
        }
    },

    setLanguage(langCode) {
        if (langCode && typeof langCode === 'string' && langCode.toLowerCase().startsWith('vi')) {
            this.currentLang = 'vi';
        } else {
            this.currentLang = 'en';
        }
        this.syncLocalizedDefinitions();
        return this.currentLang;
    },

    t(key, params = {}) {
        const langDict = this.dictionary[this.currentLang] || this.dictionary.en;
        let str = (langDict && langDict[key] !== undefined)
            ? langDict[key]
            : (this.dictionary.en[key] !== undefined ? this.dictionary.en[key] : key);
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(k => {
                str = str.split(`{${k}}`).join(String(params[k]));
            });
        }
        return str;
    },

    syncLocalizedDefinitions() {
        if (typeof WEAPON_TYPES !== 'undefined') {
            Object.values(WEAPON_TYPES).forEach(wp => {
                if (wp && wp.id) {
                    wp.name = this.t(`wp.${wp.id}.name`);
                    wp.shortName = this.t(`wp.${wp.id}.short`);
                    wp.description = this.t(`wp.${wp.id}.desc`);
                }
            });
        }
        if (typeof LEVEL_UP_CARDS !== 'undefined' && Array.isArray(LEVEL_UP_CARDS)) {
            LEVEL_UP_CARDS.forEach(card => {
                if (card && card.id) {
                    card.title = this.t(`card.${card.id}.title`);
                    card.desc = this.t(`card.${card.id}.desc`);
                }
            });
        }
        if (typeof SHOP_STAT_ITEMS !== 'undefined' && Array.isArray(SHOP_STAT_ITEMS)) {
            SHOP_STAT_ITEMS.forEach(item => {
                if (item && item.id) {
                    item.name = this.t(`shop_item.${item.id}.name`);
                    item.desc = this.t(`shop_item.${item.id}.desc`);
                }
            });
        }
        if (typeof GlobalPlayerState !== 'undefined' && Array.isArray(GlobalPlayerState.weapons)) {
            GlobalPlayerState.weapons.forEach(wp => {
                if (wp && wp.id) {
                    wp.name = this.t(`wp.${wp.id}.name`);
                    wp.shortName = this.t(`wp.${wp.id}.short`);
                    wp.description = this.t(`wp.${wp.id}.desc`);
                }
            });
        }
    }
};

const t = (key, params) => I18N.t(key, params);

// ==========================================
// CẤU HÌNH TRÒ CHƠI TOÀN CỤC & REWARD AD IDS
// ==========================================
const REWARD_AD_IDS = {
    BONUS_GOLD: 'orbit-reward-100-gold',
    FREE_REROLL: 'orbit-reward-free-reroll',
    REVIVE_PLAYER: 'orbit-reward-revive-full-hp'
};

const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    ARENA_WIDTH: 1800,
    ARENA_HEIGHT: 1800,
    WAVE_DURATION: 180, // 3 phút (180 giây) mỗi round đấu
    MAX_WAVES: 100,     // Lộ trình 100 Level chuẩn
    MAX_WEAPONS: 6,
    REWARD_AD_IDS: REWARD_AD_IDS
};

// ==========================================
// DANH SÁCH VŨ KHÍ & THÔNG SỐ (WEAPON TYPES)
// ==========================================
const WEAPON_TYPES = {
    PISTOL: {
        id: 'pistol',
        name: 'Súng Lục (Pistol)',
        description: 'Vũ khí cơ bản cân bằng, độ chính xác cao và sát thương ổn định.',
        baseCooldown: 550, // 0.55s delay (~1.8 viên/giây)
        baseDamage: 15,    // Sát thương 15 (1 viên hạ quái 15 HP ở Lv1)
        bulletSpeed: 650,  // Đạn bay nhanh và chính xác
        range: 380,
        knockback: 50,
        pierce: 1,
        color: 0x00f3ff,
        bulletColor: 0x67e8f9,
        bulletSize: 5,
        price: 25,
        iconShape: 'gun'
    },
    SHOTGUN: {
        id: 'shotgun',
        name: 'Súng Shotgun',
        description: 'Bắn chùm 5 viên đạn tản rộng, đẩy lùi quái cực mạnh ở cự ly gần.',
        baseCooldown: 1500, // 1.5s cooldown
        baseDamage: 9, // per pellet x 5
        pellets: 5,
        spreadAngle: 0.45, // radians (~26 độ)
        bulletSpeed: 440, // Giảm nhẹ tốc độ bay
        range: 280,
        knockback: 110,
        pierce: 1,
        color: 0xf97316,
        bulletColor: 0xfdba74,
        bulletSize: 4.5,
        price: 35,
        iconShape: 'shotgun'
    },
    SMG: {
        id: 'smg',
        name: 'Tiểu Liên SMG',
        description: 'Tốc độ xả đạn cực nhanh, áp chế đàn quái đông đảo.',
        baseCooldown: 170,
        baseDamage: 6,
        bulletSpeed: 700,
        range: 330,
        knockback: 20,
        pierce: 1,
        color: 0xfacc15,
        bulletColor: 0xfef08a,
        bulletSize: 4,
        price: 40,
        iconShape: 'smg'
    },
    LASER: {
        id: 'laser',
        name: 'Súng Plasma Laser',
        description: 'Tia năng lượng xuyên phá tối đa 3 kẻ địch trên một đường thẳng.',
        baseCooldown: 1100,
        baseDamage: 28,
        bulletSpeed: 850,
        range: 440,
        knockback: 65,
        pierce: 3,
        color: 0xd946ef,
        bulletColor: 0xf0abfc,
        bulletSize: 6,
        price: 50,
        iconShape: 'laser'
    },
    ROCKET: {
        id: 'rocket',
        name: 'Súng Phóng Lựu Nảy',
        description: 'Bắn lựu đạn nảy nổ diện rộng, dọn sạch quái vật xung quanh mục tiêu.',
        baseCooldown: 1800,
        baseDamage: 50,
        bulletSpeed: 450,
        range: 420,
        knockback: 140,
        pierce: 1,
        isExplosive: true,
        explosionRadius: 90,
        color: 0xef4444,
        bulletColor: 0xf87171,
        bulletSize: 8,
        price: 45,
        iconShape: 'rocket'
    },
    KATANA: {
        id: 'katana',
        name: 'Kiếm Năng Lượng',
        description: 'Xoay tròn chém càn quét mọi kẻ địch xung quanh với sát thương cao.',
        baseCooldown: 850,
        baseDamage: 26,
        range: 170,
        knockback: 130,
        isMelee: true,
        arcAngle: Math.PI * 0.9,
        color: 0x10b981,
        price: 45,
        iconShape: 'blade'
    }
};

// ==========================================
// DANH SÁCH THẺ NÂNG CẤP KỸ NĂNG (LEVEL UP CARDS)
// ==========================================
const LEVEL_UP_CARDS = [
    {
        id: 'speed_up',
        title: '👟 Tăng Tốc Độ Chạy',
        desc: '+15% Tốc độ di chuyển giúp né quái mượt mà hơn.',
        rarity: 'Common',
        color: 0x3b82f6,
        apply: (player) => {
            player.speedMult = (player.speedMult || 1) + 0.15;
        }
    },
    {
        id: 'attack_speed',
        title: '⚡ Tăng Tốc Bắn',
        desc: '+20% Tốc độ xả đạn cho tất cả 6 vũ khí.',
        rarity: 'Rare',
        color: 0xfacc15,
        apply: (player) => {
            player.attackSpeedMult = (player.attackSpeedMult || 1) * 0.82; // giảm cooldown
        }
    },
    {
        id: 'flat_damage',
        title: '💥 Tăng Sát Thương Gốc',
        desc: '+3 Sát thương cộng dồn cho mỗi viên đạn bắn ra.',
        rarity: 'Rare',
        color: 0xef4444,
        apply: (player) => {
            player.flatDamage = (player.flatDamage || 0) + 3;
        }
    },
    {
        id: 'percent_damage',
        title: '🔥 Sức Mạnh Cơ Bắp',
        desc: '+15% Tổng sát thương của người chơi.',
        rarity: 'Rare',
        color: 0xf97316,
        apply: (player) => {
            player.damageMult = (player.damageMult || 1) + 0.15;
        }
    },
    {
        id: 'max_hp',
        title: '❤️ Tăng Máu & Giáp',
        desc: '+25 Máu tối đa (+25 Máu hiện tại) và +1 Giáp để chống chịu quái cấp cao.',
        rarity: 'Common',
        color: 0x10b981,
        apply: (player) => {
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + 25);
            player.armor = (player.armor || 0) + 1;
        }
    },
    {
        id: 'range_up',
        title: '🎯 Tăng Tầm Bắn',
        desc: '+25% Tầm bắn phát hiện mục tiêu.',
        rarity: 'Common',
        color: 0x8b5cf6,
        apply: (player) => {
            player.rangeMult = (player.rangeMult || 1) + 0.25;
        }
    },
    {
        id: 'crit_chance',
        title: '🎲 Đòn Chí Mạng',
        desc: '+12% Tỉ lệ bạo kích nhân 2.0x sát thương.',
        rarity: 'Epic',
        color: 0xec4899,
        apply: (player) => {
            player.critChance = Math.min(0.85, (player.critChance || 0.05) + 0.12);
        }
    },
    {
        id: 'magnet_up',
        title: '🧲 Nam Châm Hút Ngọc',
        desc: '+40% Bán kính tự động hút hạt EXP & Tiền Vàng.',
        rarity: 'Common',
        color: 0x06b6d4,
        apply: (player) => {
            player.pickupRadius = (player.pickupRadius || 90) + 40;
        }
    },
    {
        id: 'armor_up',
        title: '🛡️ Giáp Cường Hóa',
        desc: '+3 Giáp bảo hộ (Giảm 12% sát thương nhận vào).',
        rarity: 'Rare',
        color: 0x64748b,
        apply: (player) => {
            player.armor = (player.armor || 0) + 3;
        }
    }
];

// ==========================================
// DANH SÁCH VẬT PHẨM MUA NÂNG CHỈ SỐ TRONG SHOP
// ==========================================
const SHOP_STAT_ITEMS = [
    {
        id: 'shop_damage',
        name: 'Tăng Sát Thương Vĩnh Viễn',
        desc: '+10% Toàn bộ sát thương đầu ra của tất cả vũ khí.',
        price: 25,
        type: 'damage',
        apply: (player) => {
            player.damageMult = (player.damageMult || 1) + 0.10;
        }
    },
    {
        id: 'shop_max_hp_armor',
        name: '❤️ Tăng Máu & Giáp',
        desc: '+25 Máu tối đa (+25 HP hiện tại) và +1 Giáp bảo vệ.',
        price: 30,
        type: 'hp_armor',
        apply: (player) => {
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + 25);
            player.armor = (player.armor || 0) + 1;
        }
    },
    {
        id: 'shop_speed',
        name: 'Tăng Tốc Độ Di Chuyển',
        desc: '+15% Tốc độ di chuyển giúp né tránh linh hoạt hơn.',
        price: 20,
        type: 'speed',
        apply: (player) => {
            player.speedMult = (player.speedMult || 1) + 0.15;
        }
    },
    {
        id: 'shop_atk_speed',
        name: 'Mô-đun Tăng Tốc Bắn',
        desc: '+15% Tốc độ bắn toàn bộ vũ khí.',
        price: 35,
        type: 'atk_speed',
        apply: (player) => {
            player.attackSpeedMult = (player.attackSpeedMult || 1) * 0.85;
        }
    },
    {
        id: 'shop_crit',
        name: 'Kính Ngắm Bạo Kích',
        desc: '+10% Tỉ lệ đòn chí mạng nhân đôi sát thương.',
        price: 25,
        type: 'crit',
        apply: (player) => {
            player.critChance = Math.min(0.85, (player.critChance || 0.05) + 0.10);
        }
    },
    {
        id: 'shop_magnet',
        name: 'Bộ Thu Hút Từ Trường',
        desc: '+50 Bán kính nam châm nhặt ngọc & vàng.',
        price: 20,
        type: 'magnet',
        apply: (player) => {
            player.pickupRadius = (player.pickupRadius || 90) + 50;
        }
    }
];

// ==========================================
// STATE NGƯỜI CHƠI TOÀN CỤC (GLOBAL PLAYER STATE)
// ==========================================
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
    currentScore: 0,
    highScore: 0,
    _score: 0,

    sanitizeScore(val) {
        const num = Math.floor(Number(val) || 0);
        return Math.min(Math.max(0, num), Number.MAX_SAFE_INTEGER);
    },

    // Getter và Setter cho score đảm bảo tương thích 100% với code hiện có
    // đồng thời luôn đồng bộ chuẩn hóa currentScore và highScore
    get score() {
        return this.currentScore;
    },
    set score(val) {
        const sanitized = this.sanitizeScore(val);
        this.currentScore = sanitized;
        this._score = sanitized;
        if (sanitized > this.highScore) {
            this.highScore = sanitized;
        }
    },

    enemiesKilled: 0,
    currentWave: 1,
    weapons: [
        JSON.parse(JSON.stringify(WEAPON_TYPES.PISTOL))
    ],
    upgradePrices: {
        damage: 25,
        hp: 30,
        speed: 20
    },

    reset() {
        this.maxHp = 100;
        this.hp = 100;
        this.hpRegen = 0;
        this.speed = 180;
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
        this.currentScore = 0;
        this._score = 0;
        // KHÔNG reset highScore: Giữ nguyên điểm số kỷ lục cao nhất của người chơi
        this.enemiesKilled = 0;
        this.currentWave = 1;
        this.weapons = [
            JSON.parse(JSON.stringify(WEAPON_TYPES.PISTOL))
        ];
        this.upgradePrices = {
            damage: 25,
            hp: 30,
            speed: 20
        };
    }
};

// Đồng bộ mặc định sang Tiếng Anh ('en') khi khởi tạo
I18N.setLanguage('en');

// ==========================================
// EXPORTS & GLOBAL ALIASES
// ==========================================
window.SurvivorGame.I18N = I18N;
window.SurvivorGame.t = t;
window.SurvivorGame.CONFIG = GAME_CONFIG;
window.SurvivorGame.GAME_CONFIG = GAME_CONFIG;
window.SurvivorGame.REWARD_AD_IDS = REWARD_AD_IDS;
window.SurvivorGame.WEAPON_TYPES = WEAPON_TYPES;
window.SurvivorGame.LEVEL_UP_CARDS = LEVEL_UP_CARDS;
window.SurvivorGame.SHOP_STAT_ITEMS = SHOP_STAT_ITEMS;
window.SurvivorGame.GlobalPlayerState = GlobalPlayerState;

// Backward-compatible global aliases
window.I18N = I18N;
window.t = t;
window.GAME_CONFIG = GAME_CONFIG;
window.REWARD_AD_IDS = REWARD_AD_IDS;
window.GlobalPlayerState = GlobalPlayerState;
window.WEAPON_TYPES = WEAPON_TYPES;
window.LEVEL_UP_CARDS = LEVEL_UP_CARDS;
window.SHOP_STAT_ITEMS = SHOP_STAT_ITEMS;
window.GAME_DATA = {
    WEAPON_TYPES,
    LEVEL_UP_CARDS,
    SHOP_STAT_ITEMS,
    REWARD_AD_IDS
};
