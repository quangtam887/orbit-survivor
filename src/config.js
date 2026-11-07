/**
 * SURVIVOR PLAYABLES - MODULE CẤU HÌNH THÔNG SỐ (CONFIG)
 * Quản lý toàn bộ hằng số cân bằng game, vũ khí, thẻ nâng cấp, shop và người chơi
 */

window.SurvivorGame = window.SurvivorGame || {};

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
        title: '❤️ Tăng Máu Tối Đa (+Max HP)',
        desc: '+25 Máu tối đa và cộng luôn +25 Máu hiện tại để chống chịu quái cấp cao.',
        rarity: 'Common',
        color: 0x10b981,
        apply: (player) => {
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + 25);
        }
    },
    {
        id: 'hp_regen',
        title: '🌿 Giáp & Hồi Máu/Giây (HP Regen)',
        desc: '+2 Máu tự động hồi mỗi giây và +1 Giáp ngay trong lúc chiến đấu.',
        rarity: 'Rare',
        color: 0x34d399,
        apply: (player) => {
            player.hpRegen = (player.hpRegen || 0) + 2;
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
        name: 'Tăng Máu Tối Đa & Hồi Máu/Giây',
        desc: '+25 Máu tối đa (+25 HP hiện tại), +1.5 Hồi máu/giây và +1 Giáp.',
        price: 30,
        type: 'hp_armor',
        apply: (player) => {
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + 25);
            player.hpRegen = (player.hpRegen || 0) + 1.5;
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

// ==========================================
// EXPORTS & GLOBAL ALIASES
// ==========================================
window.SurvivorGame.CONFIG = GAME_CONFIG;
window.SurvivorGame.GAME_CONFIG = GAME_CONFIG;
window.SurvivorGame.REWARD_AD_IDS = REWARD_AD_IDS;
window.SurvivorGame.WEAPON_TYPES = WEAPON_TYPES;
window.SurvivorGame.LEVEL_UP_CARDS = LEVEL_UP_CARDS;
window.SurvivorGame.SHOP_STAT_ITEMS = SHOP_STAT_ITEMS;
window.SurvivorGame.GlobalPlayerState = GlobalPlayerState;

// Backward-compatible global aliases
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
