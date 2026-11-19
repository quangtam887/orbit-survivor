/**
 * ORBIT SURVIVOR — THREE.JS 2.5D/3D PREMIUM RENDERER
 * Procedural PBR models, Orbital Combat Deck world kit, IBL + shadows,
 * selective bloom/vignette post-processing, pooled 3D VFX, and QA hooks.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Scale conversion: 1 Three.js world unit = 25 Phaser pixels
// Arena 1800x1800 px -> 72x72 Three.js units, centered at (0, 0, 0)
const PX_TO_3D = 1 / 25;
const ARENA_PX = 1800;
const ARENA_3D = ARENA_PX * PX_TO_3D; // 72
const HALF_ARENA = ARENA_3D * 0.5;     // 36

function pxToX(px) { return (px - ARENA_PX * 0.5) * PX_TO_3D; }
function pxToZ(py) { return (py - ARENA_PX * 0.5) * PX_TO_3D; }

// ==========================================
// 1. PROCEDURAL CANVAS PBR TEXTURES
// ==========================================
function createDeckTextures() {
    const size = 512;

    // Albedo / Color Map
    const cCanvas = document.createElement('canvas');
    cCanvas.width = cCanvas.height = size;
    const ctx = cCanvas.getContext('2d');

    // Base metallic slate deck
    ctx.fillStyle = '#1b2638';
    ctx.fillRect(0, 0, size, size);

    // Subtle brushed metal grain
    for (let i = 0; i < 1400; i++) {
        const x = (i * 73) % size;
        const y = (i * 137) % size;
        const w = 12 + (i % 28);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(148, 178, 214, 0.035)' : 'rgba(6, 10, 18, 0.05)';
        ctx.fillRect(x, y, w, 2);
    }

    // Sub-tile armored plating (4x4 grid per repeat)
    const step = size / 4;
    for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
            const x = gx * step;
            const y = gy * step;
            // Alternate slight value shift for rich panel variation
            ctx.fillStyle = (gx + gy) % 2 === 0 ? 'rgba(38, 53, 77, 0.42)' : 'rgba(20, 30, 46, 0.45)';
            ctx.fillRect(x + 4, y + 4, step - 8, step - 8);

            // Chamfered inner highlight
            ctx.strokeStyle = 'rgba(120, 165, 215, 0.16)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 6, y + 6, step - 12, step - 12);

            // Recessed dark seam
            ctx.strokeStyle = '#090e17';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1.5, y + 1.5, step - 3, step - 3);

            // Corner bolts
            ctx.fillStyle = '#526a8a';
            const bOff = 12;
            [[x + bOff, y + bOff], [x + step - bOff, y + bOff], [x + bOff, y + step - bOff], [x + step - bOff, y + step - bOff]].forEach(([bx, by]) => {
                ctx.beginPath();
                ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Occasional floor grate / vent motif
            if ((gx === 1 && gy === 1) || (gx === 3 && gy === 3)) {
                ctx.fillStyle = '#0b1220';
                ctx.fillRect(x + 24, y + 36, step - 48, step - 72);
                ctx.fillStyle = '#2c425f';
                for (let s = 0; s < 5; s++) {
                    ctx.fillRect(x + 28, y + 40 + s * 10, step - 56, 4);
                }
                // Subtle cyan under-vent accent
                ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
                ctx.fillRect(x + 28, y + 44, step - 56, 2);
            }

            // Tactical micro-stripe on one tile
            if (gx === 2 && gy === 0) {
                ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
                ctx.fillRect(x + 14, y + step - 18, step - 28, 4);
            }
        }
    }

    // Major seam crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(size, 0);
    ctx.moveTo(0, 0); ctx.lineTo(0, size);
    ctx.stroke();

    // Roughness & Bump Map
    const rCanvas = document.createElement('canvas');
    rCanvas.width = rCanvas.height = size;
    const rctx = rCanvas.getContext('2d');
    rctx.fillStyle = '#999999'; // mid-rough painted deck
    rctx.fillRect(0, 0, size, size);
    for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
            const x = gx * step;
            const y = gy * step;
            rctx.fillStyle = (gx + gy) % 2 === 0 ? '#787878' : '#a8a8a8';
            rctx.fillRect(x + 6, y + 6, step - 12, step - 12);
            rctx.strokeStyle = '#dddddd'; // rough dark seams
            rctx.lineWidth = 4;
            rctx.strokeRect(x + 2, y + 2, step - 4, step - 4);
        }
    }

    const map = new THREE.CanvasTexture(cCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(9, 9);
    map.anisotropy = 4;

    const roughMap = new THREE.CanvasTexture(rCanvas);
    roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
    roughMap.repeat.set(9, 9);
    roughMap.anisotropy = 4;

    return { map, roughMap };
}

function createHazardStripeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#181f2c';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#e11d48';
    for (let x = -64; x < 320; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 64);
        ctx.lineTo(x + 16, 64);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x + 24, 0);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 52, 256, 12);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 1);
    return tex;
}

function createReactorPadTexture() {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Outer tactical ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 232, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed inner ring
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 5;
    ctx.setLineDash([28, 16]);
    ctx.beginPath();
    ctx.arc(cx, cy, 192, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 directional ticks
    ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i * Math.PI) / 2);
        ctx.fillRect(-10, -246, 20, 28);
        ctx.fillRect(-4, -172, 8, 36);
        ctx.restore();
    }

    // Center glowing core circle
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 110);
    grad.addColorStop(0, 'rgba(34, 211, 238, 0.42)');
    grad.addColorStop(0.55, 'rgba(14, 165, 233, 0.14)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    // Octagon inner trim
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const r = 82;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createContactShadowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    g.addColorStop(0, 'rgba(2, 6, 15, 0.78)');
    g.addColorStop(0.55, 'rgba(2, 6, 15, 0.35)');
    g.addColorStop(1, 'rgba(2, 6, 15, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

// ==========================================
// 2. SHARED MATERIAL LIBRARY (PBR ROLES)
// ==========================================
function createMaterialLibrary() {
    const deckTex = createDeckTextures();
    const hazardTex = createHazardStripeTexture();
    const reactorTex = createReactorPadTexture();
    const shadowTex = createContactShadowTexture();

    // Fresnel rim helper for hero visor & shields
    function addFresnelRim(mat, colorHex, power = 2.6, strength = 1.4, cacheKey = 'fresnel-rim') {
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uRimColor = { value: new THREE.Color(colorHex) };
            shader.uniforms.uRimPower = { value: power };
            shader.uniforms.uRimStrength = { value: strength };
            shader.fragmentShader =
                'uniform vec3 uRimColor;\nuniform float uRimPower;\nuniform float uRimStrength;\n' +
                shader.fragmentShader.replace(
                    '#include <emissivemap_fragment>',
                    `#include <emissivemap_fragment>
                     float fres = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), uRimPower);
                     totalEmissiveRadiance += uRimColor * fres * uRimStrength;`
                );
        };
        mat.customProgramCacheKey = () => cacheKey;
        return mat;
    }

    const heroVisor = addFresnelRim(
        new THREE.MeshPhysicalMaterial({
            color: 0x0ea5e9,
            emissive: 0x06b6d4,
            emissiveIntensity: 0.9,
            metalness: 0.1,
            roughness: 0.08,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.4
        }),
        0x67e8f9, 2.2, 1.5, 'hero-visor-fresnel'
    );

    return {
        textures: { deckMap: deckTex.map, deckRough: deckTex.roughMap, hazardTex, reactorTex, shadowTex },

        // World & Arena
        deckFloor: new THREE.MeshStandardMaterial({
            map: deckTex.map,
            roughnessMap: deckTex.roughMap,
            bumpMap: deckTex.roughMap,
            bumpScale: 0.08,
            metalness: 0.42,
            roughness: 0.68,
            envMapIntensity: 0.85
        }),
        reactorDecal: new THREE.MeshBasicMaterial({
            map: reactorTex,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        }),
        contactShadow: new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            depthWrite: false
        }),
        wallBase: new THREE.MeshStandardMaterial({
            color: 0x263245,
            metalness: 0.75,
            roughness: 0.38,
            envMapIntensity: 1.0
        }),
        wallHazard: new THREE.MeshStandardMaterial({
            map: hazardTex,
            metalness: 0.35,
            roughness: 0.55,
            envMapIntensity: 0.7
        }),
        steelDark: new THREE.MeshStandardMaterial({
            color: 0x151e2d,
            metalness: 0.82,
            roughness: 0.42,
            envMapIntensity: 0.9
        }),
        steelMid: new THREE.MeshStandardMaterial({
            color: 0x5c6e87,
            metalness: 0.88,
            roughness: 0.32,
            envMapIntensity: 1.15
        }),
        farTower: new THREE.MeshStandardMaterial({
            color: 0x121b2b,
            metalness: 0.5,
            roughness: 0.72,
            envMapIntensity: 0.5
        }),
        fenceLaser: new THREE.MeshStandardMaterial({
            color: 0x101010,
            emissive: 0xf43f5e,
            emissiveIntensity: 2.2,
            roughness: 0.3,
            transparent: true,
            opacity: 0.82
        }),
        beaconCyan: new THREE.MeshStandardMaterial({
            color: 0x101010,
            emissive: 0x22d3ee,
            emissiveIntensity: 2.4,
            roughness: 0.25
        }),
        beaconAmber: new THREE.MeshStandardMaterial({
            color: 0x101010,
            emissive: 0xf59e0b,
            emissiveIntensity: 2.2,
            roughness: 0.25
        }),

        // Hero Vanguard Roles (balanced albedo so sculpted armor/visor/trim read crisply without bloom blowout)
        heroArmor: new THREE.MeshPhysicalMaterial({
            color: 0x6b93bd,
            metalness: 0.42,
            roughness: 0.36,
            clearcoat: 0.65,
            clearcoatRoughness: 0.18,
            envMapIntensity: 0.9
        }),
        heroSecondary: new THREE.MeshStandardMaterial({
            color: 0x16263d,
            metalness: 0.72,
            roughness: 0.4,
            envMapIntensity: 0.9
        }),
        heroAccent: new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.3,
            roughness: 0.38,
            envMapIntensity: 0.85
        }),
        heroVisor,
        heroCore: new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            emissive: 0x22d3ee,
            emissiveIntensity: 2.2,
            roughness: 0.2
        }),
        heroThruster: new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }),
        heroHurt: new THREE.MeshStandardMaterial({
            color: 0xff2222,
            emissive: 0xff0000,
            emissiveIntensity: 2.8,
            roughness: 0.3
        }),

        // Weapon Roles
        wpGunmetal: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.32, envMapIntensity: 1.1 }),
        wpChrome: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.25 }),
        wpCyanGlow: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0x38bdf8, emissiveIntensity: 2.4, roughness: 0.2 }),
        wpOrangeGlow: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xf97316, emissiveIntensity: 2.2, roughness: 0.2 }),
        wpYellowGlow: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xfacc15, emissiveIntensity: 2.1, roughness: 0.2 }),
        wpRedTip: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.4, metalness: 0.3, roughness: 0.3 }),
        wpEmeraldBlade: new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x10b981, emissiveIntensity: 2.5, metalness: 0.4, roughness: 0.15 }),

        // Enemy Roles (Base dark armored shells + distinct emissive/carapace families)
        enemyCarapaceDark: new THREE.MeshStandardMaterial({ color: 0x1f2433, metalness: 0.72, roughness: 0.38, envMapIntensity: 0.95 }),
        enemySwarmerBody: new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.35, roughness: 0.42, envMapIntensity: 0.85 }),
        enemyDasherBody: new THREE.MeshPhysicalMaterial({ color: 0xea580c, metalness: 0.25, roughness: 0.32, clearcoat: 0.8, envMapIntensity: 1.0 }),
        enemyTankBody: new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.82, roughness: 0.45, envMapIntensity: 0.95 }),
        enemySpitterBody: new THREE.MeshStandardMaterial({ color: 0x6b21a8, metalness: 0.4, roughness: 0.35, envMapIntensity: 0.9 }),
        enemyEliteGold: new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.22, clearcoat: 0.9, envMapIntensity: 1.25 }),
        enemyBossArmor: new THREE.MeshPhysicalMaterial({ color: 0x7f1d1d, metalness: 0.65, roughness: 0.28, clearcoat: 0.85, envMapIntensity: 1.1 }),
        enemyEyeRed: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xff2a55, emissiveIntensity: 2.5, roughness: 0.2 }),
        enemyEyeOrange: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xfb923c, emissiveIntensity: 2.4, roughness: 0.2 }),
        enemyEyePurple: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xd946ef, emissiveIntensity: 2.6, roughness: 0.2 }),
        enemyEyeGold: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xfef08a, emissiveIntensity: 2.8, roughness: 0.2 }),
        enemyHitFlash: new THREE.MeshBasicMaterial({ color: 0xffffff }),
        enemyBerserkGlow: new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xff1100, emissiveIntensity: 2.6, roughness: 0.3 }),

        // Rewards
        gemExp: new THREE.MeshPhysicalMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 1.6,
            metalness: 0.15,
            roughness: 0.12,
            clearcoat: 1.0,
            envMapIntensity: 1.3
        }),
        gemGold: new THREE.MeshPhysicalMaterial({
            color: 0xfbbf24,
            emissive: 0xd97706,
            emissiveIntensity: 1.35,
            metalness: 0.92,
            roughness: 0.16,
            clearcoat: 0.9,
            envMapIntensity: 1.4
        }),

        // Projectiles & VFX
        bulletNormal: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0x38bdf8, emissiveIntensity: 2.8, roughness: 0.2 }),
        bulletCrit: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xfacc15, emissiveIntensity: 3.0, roughness: 0.2 }),
        bulletRocket: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0xf97316, emissiveIntensity: 1.8, metalness: 0.6, roughness: 0.3 }),
        bulletEnemy: new THREE.MeshStandardMaterial({ color: 0x101010, emissive: 0xe879f9, emissiveIntensity: 2.8, roughness: 0.2 })
    };
}

// ==========================================
// 3. PROCEDURAL 3D MODEL FACTORIES
// ==========================================
function buildHeroMech(mats) {
    const root = new THREE.Group();
    root.name = 'heroVanguard';

    // Contact shadow & tactical locator ring
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), mats.contactShadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const ringGeo = new THREE.RingGeometry(1.12, 1.24, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.04;
    root.add(groundRing);

    // Body rig container (bobs & tilts with velocity)
    const bodyRig = new THREE.Group();
    bodyRig.name = 'bodyRig';
    root.add(bodyRig);

    // Pelvis / Waist core
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.34, 8), mats.heroSecondary);
    pelvis.position.y = 0.72;
    pelvis.castShadow = true;
    bodyRig.add(pelvis);

    // Articulated Left & Right Legs
    function makeLeg(side) {
        const hip = new THREE.Group();
        hip.position.set(0, 0.66, side * 0.32);
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.26), mats.heroSecondary);
        thigh.position.set(0.02, -0.18, 0);
        thigh.castShadow = true;
        hip.add(thigh);
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.28), mats.heroArmor);
        shin.position.set(-0.02, -0.44, 0);
        shin.castShadow = true;
        hip.add(shin);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.32), mats.steelDark);
        boot.position.set(0.08, -0.6, 0);
        boot.castShadow = true;
        hip.add(boot);
        return hip;
    }
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);
    bodyRig.add(leftLeg, rightLeg);

    // Armored Torso (Extruded bevel chestplate)
    const chestShape = new THREE.Shape();
    chestShape.moveTo(-0.52, -0.42);
    chestShape.lineTo(0.52, -0.42);
    chestShape.lineTo(0.64, 0.15);
    chestShape.lineTo(0.42, 0.52);
    chestShape.lineTo(-0.42, 0.52);
    chestShape.lineTo(-0.64, 0.15);
    chestShape.closePath();
    const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
        depth: 0.72,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 2
    });
    chestGeo.center();
    const torso = new THREE.Mesh(chestGeo, mats.heroArmor);
    torso.rotation.y = Math.PI / 2;
    torso.position.set(0.04, 1.3, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyRig.add(torso);

    // Chest Arc Reactor Core (front faces +X)
    const coreFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 6), mats.steelDark);
    coreFrame.rotation.z = Math.PI / 2;
    coreFrame.position.set(0.42, 1.32, 0);
    bodyRig.add(coreFrame);

    const coreGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 6), mats.heroCore);
    coreGlow.rotation.z = Math.PI / 2;
    coreGlow.position.set(0.44, 1.32, 0);
    bodyRig.add(coreGlow);

    // Twin Shoulder Pauldrons with amber accents
    [-1, 1].forEach((side) => {
        const pauldron = new THREE.Group();
        pauldron.position.set(0, 1.56, side * 0.72);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.42), mats.heroArmor);
        cap.rotation.x = side * 0.22;
        cap.castShadow = true;
        pauldron.add(cap);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.1, 0.44), mats.heroAccent);
        stripe.position.y = 0.08;
        stripe.rotation.x = side * 0.22;
        pauldron.add(stripe);
        bodyRig.add(pauldron);
    });

    // Head / Helmet with sculpted visor
    const headGroup = new THREE.Group();
    headGroup.position.set(0.06, 1.98, 0);
    const helmet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), mats.heroArmor);
    helmet.scale.set(1.12, 0.94, 0.96);
    helmet.castShadow = true;
    headGroup.add(helmet);

    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.36, 0.24, 14, 1, false, -Math.PI * 0.42, Math.PI * 0.84), mats.heroVisor);
    visor.rotation.y = Math.PI / 2;
    visor.position.set(0.12, 0.02, 0);
    headGroup.add(visor);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.1), mats.heroAccent);
    crest.position.set(-0.04, 0.38, 0);
    headGroup.add(crest);
    bodyRig.add(headGroup);

    // Dorsal Jump-Jet Pack + Twin Plasma Thrusters
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.78), mats.heroSecondary);
    pack.position.set(-0.48, 1.36, 0);
    pack.castShadow = true;
    bodyRig.add(pack);

    const flames = [];
    [-0.24, 0.24].forEach((zOff) => {
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.24, 10), mats.steelDark);
        nozzle.rotation.z = 0.35;
        nozzle.position.set(-0.68, 1.05, zOff);
        bodyRig.add(nozzle);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 8), mats.heroThruster);
        flame.rotation.z = Math.PI + 0.35;
        flame.position.set(-0.84, 0.72, zOff);
        bodyRig.add(flame);
        flames.push(flame);
    });

    // Holographic Weapon Orbit Ring
    const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(42 * PX_TO_3D, 0.03, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 })
    );
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.position.y = 1.28;
    root.add(orbitRing);

    root.userData = { bodyRig, leftLeg, rightLeg, flames, groundRing, orbitRing, torso, hurtTimer: 0 };
    return root;
}

function buildWeaponMesh(weaponId, mats) {
    const g = new THREE.Group();
    if (weaponId === 'shotgun') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.26), mats.wpGunmetal);
        const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.85, 8), mats.wpChrome);
        barrel1.rotation.z = Math.PI / 2; barrel1.position.set(0.42, 0.05, -0.07);
        const barrel2 = barrel1.clone(); barrel2.position.z = 0.07;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.3), mats.wpOrangeGlow);
        guard.position.set(0.18, -0.06, 0);
        g.add(body, barrel1, barrel2, guard);
    } else if (weaponId === 'smg') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 0.2), mats.wpGunmetal);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.14), mats.steelDark);
        mag.position.set(0.1, -0.22, 0); mag.rotation.z = 0.18;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 8), mats.wpChrome);
        barrel.rotation.z = Math.PI / 2; barrel.position.set(0.54, 0.04, 0);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.22), mats.wpYellowGlow);
        trim.position.set(0.05, 0.09, 0);
        g.add(body, mag, barrel, trim);
    } else if (weaponId === 'laser') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.24), mats.heroSecondary);
        const prong1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.07), mats.wpChrome);
        prong1.position.set(0.58, 0.08, 0);
        const prong2 = prong1.clone(); prong2.position.y = -0.08;
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.1), mats.wpCyanGlow);
        core.position.set(0.42, 0, 0);
        g.add(body, prong1, prong2, core);
    } else if (weaponId === 'rocket') {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.15, 10), mats.wpGunmetal);
        tube.rotation.z = Math.PI / 2;
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), mats.heroAccent);
        collar.rotation.z = Math.PI / 2; collar.position.x = 0.28;
        const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 8), mats.wpRedTip);
        warhead.rotation.z = -Math.PI / 2; warhead.position.x = 0.68;
        g.add(tube, collar, warhead);
    } else if (weaponId === 'katana') {
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), mats.steelDark);
        hilt.rotation.z = Math.PI / 2; hilt.position.x = -0.32;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.14), mats.heroAccent);
        guard.position.x = -0.1;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.14), mats.wpEmeraldBlade);
        blade.position.x = 0.52;
        g.add(hilt, guard, blade);
    } else {
        // Pistol (default)
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.18), mats.wpGunmetal);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), mats.wpChrome);
        barrel.rotation.z = Math.PI / 2; barrel.position.set(0.36, 0.03, 0);
        const coil = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.2), mats.wpCyanGlow);
        coil.position.set(0.06, 0.07, 0);
        g.add(slide, barrel, coil);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
}

function buildEnemyMesh(type, mats) {
    const root = new THREE.Group();
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(type === 'boss' ? 5.2 : (type === 'elite' ? 3.4 : 2.1), type === 'boss' ? 5.2 : (type === 'elite' ? 3.4 : 2.1)),
        mats.contactShadow
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const body = new THREE.Group();
    root.add(body);
    let accentMeshes = [];
    let spinner = null;

    if (type === 'dasher') {
        // Swept-wing razor interceptor
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.45, 4), mats.enemyDasherBody);
        nose.rotation.z = -Math.PI / 2;
        nose.position.set(0.15, 0.85, 0);
        const wings = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 1.75), mats.enemyCarapaceDark);
        wings.position.set(-0.22, 0.82, 0);
        const wingTrim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.78), mats.enemyEyeOrange);
        wingTrim.position.set(-0.08, 0.83, 0);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), mats.enemyEyeOrange);
        core.position.set(-0.52, 0.85, 0);
        body.add(nose, wings, wingTrim, core);
        accentMeshes.push(nose);
    } else if (type === 'tank') {
        // Heavy hex juggernaut
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.92, 1.15, 6), mats.enemyTankBody);
        hull.position.y = 0.72;
        const shieldL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.82, 0.28), mats.enemyCarapaceDark);
        shieldL.position.set(0.15, 0.85, -0.82);
        const shieldR = shieldL.clone(); shieldR.position.z = 0.82;
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.92), mats.enemyEyeRed);
        visor.position.set(0.72, 0.92, 0);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.65, 0.34, 6), mats.enemyCarapaceDark);
        cap.position.y = 1.42;
        body.add(hull, shieldL, shieldR, visor, cap);
        accentMeshes.push(hull);
    } else if (type === 'spitter') {
        // Hovering plasma mortar spire with rotating rings
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 5), mats.enemySpitterBody);
        spire.position.y = 0.98;
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), mats.enemyEyePurple);
        orb.position.y = 1.82;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 20), mats.enemyEyePurple);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 1.15;
        spinner = ring;
        body.add(spire, orb, ring);
        accentMeshes.push(spire);
    } else if (type === 'elite') {
        // Towering Command Sentinel
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.65, 8), mats.enemyCarapaceDark);
        hull.position.y = 1.05;
        const paulL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.45), mats.enemyEliteGold);
        paulL.position.set(0, 1.55, -1.05);
        const paulR = paulL.clone(); paulR.position.z = 1.05;
        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.09, 8, 16), mats.enemyEyeGold);
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 2.15;
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 1.0), mats.enemyEyeGold);
        eye.position.set(0.78, 1.38, 0);
        const aura = new THREE.Mesh(
            new THREE.RingGeometry(1.45, 1.65, 24),
            new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false })
        );
        aura.rotation.x = -Math.PI / 2; aura.position.y = 0.05;
        spinner = crown;
        body.add(hull, paulL, paulR, crown, eye);
        root.add(aura);
        accentMeshes.push(hull);
    } else if (type === 'boss') {
        // Massive Orbital Dreadnought (tiered armored chassis, flank shields, twin cannons, glowing core)
        const lowerHull = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.15, 1.35, 8), mats.enemyCarapaceDark);
        lowerHull.position.y = 0.85;
        const upperTurret = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.55, 1.15, 8), mats.enemyBossArmor);
        upperTurret.position.y = 2.0;
        const crestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 1.5), mats.enemyCarapaceDark);
        crestPlate.position.y = 2.68;
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), mats.enemyEyeRed);
        core.position.set(1.25, 1.65, 0);
        // Heavy Flank Reactive Shield Plates + Twin Siege Cannons
        [-1, 1].forEach((side) => {
            const flank = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.45, 0.45), mats.enemyCarapaceDark);
            flank.position.set(0.1, 1.45, side * 1.95);
            const trim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.48), mats.enemyEliteGold);
            trim.position.set(0.1, 2.02, side * 1.95);
            const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.7, 8), mats.steelMid);
            cannon.rotation.z = Math.PI / 2;
            cannon.position.set(1.35, 1.55, side * 1.45);
            body.add(flank, trim, cannon);
        });
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2 + Math.PI / 4;
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 5), mats.enemyEliteGold);
            horn.position.set(Math.cos(a) * 1.15, 3.05, Math.sin(a) * 1.15);
            body.add(horn);
        }
        const halo = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.09, 8, 32), mats.enemyEyeRed);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 1.95;
        const dangerRing = new THREE.Mesh(
            new THREE.RingGeometry(2.65, 2.95, 36),
            new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.72, depthWrite: false })
        );
        dangerRing.rotation.x = -Math.PI / 2; dangerRing.position.y = 0.05;
        spinner = halo;
        body.add(lowerHull, upperTurret, crestPlate, core, halo);
        root.add(dangerRing);
        accentMeshes.push(upperTurret);
    } else {
        // Swarmer: angular arachnid hunter drone
        const carapace = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), mats.enemySwarmerBody);
        carapace.scale.set(1.25, 0.72, 1.0);
        carapace.position.y = 0.65;
        const mandL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.62, 4), mats.steelMid);
        mandL.rotation.z = -Math.PI / 2; mandL.position.set(0.72, 0.56, -0.26);
        const mandR = mandL.clone(); mandR.position.z = 0.26;
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.52), mats.enemyEyeRed);
        eye.position.set(0.55, 0.74, 0);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.12), mats.enemyCarapaceDark);
        fin.position.set(-0.35, 0.92, 0);
        body.add(carapace, mandL, mandR, eye, fin);
        accentMeshes.push(carapace);
    }

    body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.userData = { type, body, spinner, accentMeshes, lastHp: -1, flashTimer: 0 };
    return root;
}

function buildGemMesh(isGold, mats) {
    const g = new THREE.Group();
    if (isGold) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 6), mats.gemGold);
        coin.rotation.x = Math.PI / 2;
        coin.position.y = 0.55;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.42, 0.5, 16),
            new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;
        g.add(coin, ring);
        g.userData = { crystal: coin };
    } else {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mats.gemExp);
        shard.scale.set(0.85, 1.45, 0.85);
        shard.position.y = 0.55;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.34, 0.42, 16),
            new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;
        g.add(shard, ring);
        g.userData = { crystal: shard };
    }
    return g;
}

// ==========================================
// 4. ORBITAL COMBAT DECK WORLD KIT
// ==========================================
function buildOrbitalWorld(scene, mats) {
    const worldGroup = new THREE.Group();
    worldGroup.name = 'orbitalWorld';

    // Gradient Deep-Space Sky Dome with luminous cyan horizon & planet limb
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(260, 32, 16),
        new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: {
                uTop: { value: new THREE.Color(0x040915) },
                uHorizon: { value: new THREE.Color(0x0f2744) },
                uSunColor: { value: new THREE.Color(0x38bdf8) },
                uSunDir: { value: new THREE.Vector3(-0.45, 0.22, -0.85).normalize() }
            },
            vertexShader: `varying vec3 vDir;
                void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `varying vec3 vDir;
                uniform vec3 uTop, uHorizon, uSunColor, uSunDir;
                void main() {
                    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
                    vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
                    float d = clamp(dot(normalize(vDir), normalize(uSunDir)), 0.0, 1.0);
                    col += uSunColor * (pow(d, 120.0) * 0.8 + pow(d, 6.0) * 0.25);
                    gl_FragColor = vec4(col, 1.0);
                }`
        })
    );
    sky.frustumCulled = false;
    worldGroup.add(sky);

    // Play Layer: Main Armored Combat Deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(ARENA_3D + 2.4, 1.6, ARENA_3D + 2.4), mats.deckFloor);
    deck.position.y = -0.8;
    deck.receiveShadow = true;
    worldGroup.add(deck);

    // Center Reactor Medallion Decal
    const centerDecal = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mats.reactorDecal);
    centerDecal.rotation.x = -Math.PI / 2;
    centerDecal.position.y = 0.01;
    worldGroup.add(centerDecal);

    // 4 Quadrant Tactical Waypoint Pads
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([qx, qz]) => {
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), mats.reactorDecal);
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(qx, 0.01, qz);
        worldGroup.add(pad);
    });

    // Near Layer: Perimeter Containment Walls + Hazard Stripes + Glowing Laser Fence
    const wallH = 1.45;
    const wallT = 1.1;
    const wallLen = ARENA_3D + wallT * 2;
    const wallSpecs = [
        { x: 0, z: -HALF_ARENA - wallT * 0.5, w: wallLen, d: wallT },
        { x: 0, z: HALF_ARENA + wallT * 0.5, w: wallLen, d: wallT },
        { x: -HALF_ARENA - wallT * 0.5, z: 0, w: wallT, d: wallLen },
        { x: HALF_ARENA + wallT * 0.5, z: 0, w: wallT, d: wallLen }
    ];
    wallSpecs.forEach((ws) => {
        const base = new THREE.Mesh(new THREE.BoxGeometry(ws.w, wallH, ws.d), mats.wallBase);
        base.position.set(ws.x, wallH * 0.5, ws.z);
        base.castShadow = true;
        base.receiveShadow = true;
        worldGroup.add(base);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(ws.w + 0.06, 0.36, ws.d + 0.06), mats.wallHazard);
        stripe.position.set(ws.x, wallH * 0.65, ws.z);
        worldGroup.add(stripe);

        const laser = new THREE.Mesh(new THREE.BoxGeometry(ws.w > ws.d ? ws.w : 0.14, 0.14, ws.d > ws.w ? ws.d : 0.14), mats.fenceLaser);
        laser.position.set(ws.x, wallH + 0.55, ws.z);
        worldGroup.add(laser);
    });

    // Instanced Perimeter Pylons (36 pylons in 1 draw call!)
    const pylonGeo = new THREE.BoxGeometry(0.95, 2.7, 0.95);
    const pylonPositions = [];
    const pylonCountPerSide = 9;
    for (let i = 0; i <= pylonCountPerSide; i++) {
        const t = -HALF_ARENA + (i / pylonCountPerSide) * ARENA_3D;
        pylonPositions.push([t, -HALF_ARENA - 0.6], [t, HALF_ARENA + 0.6]);
        if (i > 0 && i < pylonCountPerSide) {
            pylonPositions.push([-HALF_ARENA - 0.6, t], [HALF_ARENA + 0.6, t]);
        }
    }
    const pylonInst = new THREE.InstancedMesh(pylonGeo, mats.steelDark, pylonPositions.length);
    const capGeo = new THREE.BoxGeometry(0.55, 0.25, 0.55);
    const capInst = new THREE.InstancedMesh(capGeo, mats.beaconCyan, pylonPositions.length);
    const dummy = new THREE.Object3D();
    pylonPositions.forEach(([px, pz], idx) => {
        dummy.position.set(px, 1.35, pz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pylonInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(px, 2.8, pz);
        dummy.updateMatrix();
        capInst.setMatrixAt(idx, dummy.matrix);
    });
    pylonInst.castShadow = true;
    pylonInst.receiveShadow = true;
    worldGroup.add(pylonInst, capInst);

    // 4 Corner Orbital Radar / Comm Towers (Landmark silhouettes)
    const radarDishes = [];
    [[-HALF_ARENA - 3.2, -HALF_ARENA - 3.2], [HALF_ARENA + 3.2, -HALF_ARENA - 3.2], [-HALF_ARENA - 3.2, HALF_ARENA + 3.2], [HALF_ARENA + 3.2, HALF_ARENA + 3.2]].forEach(([tx, tz]) => {
        const tower = new THREE.Group();
        tower.position.set(tx, 0, tz);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.8, 12, 6), mats.steelDark);
        mast.position.y = 4.5;
        mast.castShadow = true;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 8, 16), mats.beaconAmber);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 9.5;
        const dish = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 12, 1, true), mats.steelMid);
        dish.rotation.z = Math.PI * 0.35;
        dish.position.set(0, 11.2, 0);
        radarDishes.push(dish);
        tower.add(mast, ring, dish);
        worldGroup.add(tower);
    });

    // Far Layer: Instanced Orbital Shipyard Superstructure Towers around the Abyss (1 draw call!)
    const farCount = 44;
    const farGeo = new THREE.BoxGeometry(1, 1, 1);
    const farInst = new THREE.InstancedMesh(farGeo, mats.farTower, farCount);
    const beaconGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8);
    const farBeaconInst = new THREE.InstancedMesh(beaconGeo, mats.beaconCyan, farCount);
    for (let i = 0; i < farCount; i++) {
        const angle = (i / farCount) * Math.PI * 2;
        const radius = HALF_ARENA + 14 + (i % 4) * 9;
        const h = 14 + ((i * 19) % 28);
        const w = 3.5 + ((i * 7) % 5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        dummy.position.set(x, h * 0.5 - 18, z);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.set(w, h, w * 0.85);
        dummy.updateMatrix();
        farInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, h - 17.6, z);
        dummy.scale.set(w * 0.55, 0.6, w * 0.55);
        dummy.updateMatrix();
        farBeaconInst.setMatrixAt(i, dummy.matrix);
    }
    worldGroup.add(farInst, farBeaconInst);

    // Giant Tilted Orbital Station Ring framing the distant abyss
    const orbitalRing = new THREE.Mesh(
        new THREE.TorusGeometry(92, 0.9, 10, 80),
        new THREE.MeshStandardMaterial({ color: 0x1e3a5f, emissive: 0x0ea5e9, emissiveIntensity: 0.45, metalness: 0.8, roughness: 0.35 })
    );
    orbitalRing.rotation.x = Math.PI * 0.46;
    orbitalRing.rotation.y = 0.18;
    orbitalRing.position.y = -12;
    worldGroup.add(orbitalRing);

    // Motion Layer: Instanced Drifting Space-Dust / Star Motes
    const dustCount = 120;
    const dustGeo = new THREE.OctahedronGeometry(0.14, 0);
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.55 });
    const dustInst = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
    const dustSeeds = [];
    for (let i = 0; i < dustCount; i++) {
        const sx = ((i * 97) % 140) - 70;
        const sy = 1.5 + ((i * 31) % 14);
        const sz = ((i * 53) % 140) - 70;
        dustSeeds.push({ x: sx, y: sy, z: sz, speed: 0.4 + (i % 5) * 0.2 });
        dummy.position.set(sx, sy, sz);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dustInst.setMatrixAt(i, dummy.matrix);
    }
    worldGroup.add(dustInst);

    scene.add(worldGroup);
    return { worldGroup, radarDishes, orbitalRing, dustInst, dustSeeds };
}

// ==========================================
// 5. POOLED 3D EVENT VFX SYSTEM
// ==========================================
class ThreeVfxSystem {
    constructor(scene) {
        this.scene = scene;
        this.maxParticles = 260;
        this.particles = [];
        this.pGeo = new THREE.OctahedronGeometry(0.18, 0);
        this.pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.pInst = new THREE.InstancedMesh(this.pGeo, this.pMat, this.maxParticles);
        this.pInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.pInst.frustumCulled = false;
        this.dummy = new THREE.Object3D();
        const defaultColor = new THREE.Color(0x38bdf8);
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({ active: false, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, scale: 1 });
            this.dummy.position.set(0, -99, 0);
            this.dummy.scale.set(0.001, 0.001, 0.001);
            this.dummy.updateMatrix();
            this.pInst.setMatrixAt(i, this.dummy.matrix);
            this.pInst.setColorAt(i, defaultColor);
        }
        scene.add(this.pInst);

        // Expanding shockwaves & slash arcs (small pooled list)
        this.rings = [];
        this.ringGeo = new THREE.RingGeometry(0.7, 1.0, 28);
    }

    spawnBurst(x3, y3, z3, count, colorHex, speed = 8) {
        const col = new THREE.Color(colorHex);
        let spawned = 0;
        for (let i = 0; i < this.maxParticles && spawned < count; i++) {
            const p = this.particles[i];
            if (!p.active) {
                const a = Math.random() * Math.PI * 2;
                const sp = speed * (0.45 + Math.random() * 0.85);
                p.active = true;
                p.x = x3; p.y = y3; p.z = z3;
                p.vx = Math.cos(a) * sp;
                p.vy = 2.5 + Math.random() * 5.5;
                p.vz = Math.sin(a) * sp;
                p.life = 0;
                p.maxLife = 0.28 + Math.random() * 0.25;
                p.scale = 0.65 + Math.random() * 0.85;
                this.pInst.setColorAt(i, col);
                spawned++;
            }
        }
        if (spawned > 0 && this.pInst.instanceColor) {
            this.pInst.instanceColor.needsUpdate = true;
        }
    }

    spawnShockwave(x3, z3, maxRadius, colorHex = 0xf97316, duration = 0.32) {
        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(this.ringGeo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x3, 0.25, z3);
        mesh.scale.set(0.2, 0.2, 0.2);
        this.scene.add(mesh);
        this.rings.push({ mesh, life: 0, duration, maxRadius });
    }

    spawnSlashArc(x3, z3, angle, range3, colorHex = 0x10b981) {
        const geo = new THREE.RingGeometry(Math.max(0.4, range3 - 0.85), range3, 18, 1, -0.85, 1.7);
        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = -angle;
        mesh.position.set(x3, 1.15, z3);
        this.scene.add(mesh);
        this.rings.push({ mesh, life: 0, duration: 0.18, maxRadius: 1.15, isSlash: true });
    }

    update(dt) {
        let dirty = false;
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) {
                p.active = false;
                this.dummy.position.set(0, -99, 0);
                this.dummy.scale.set(0.001, 0.001, 0.001);
                this.dummy.updateMatrix();
                this.pInst.setMatrixAt(i, this.dummy.matrix);
                dirty = true;
                continue;
            }
            p.vy -= 18 * dt;
            p.x += p.vx * dt;
            p.y = Math.max(0.08, p.y + p.vy * dt);
            p.z += p.vz * dt;
            const t = 1 - p.life / p.maxLife;
            const s = p.scale * t;
            this.dummy.position.set(p.x, p.y, p.z);
            this.dummy.rotation.set(p.life * 8, p.life * 6, 0);
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();
            this.pInst.setMatrixAt(i, this.dummy.matrix);
            dirty = true;
        }
        if (dirty) this.pInst.instanceMatrix.needsUpdate = true;

        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.life += dt;
            const t = r.life / r.duration;
            if (t >= 1) {
                this.scene.remove(r.mesh);
                if (r.isSlash) r.mesh.geometry.dispose();
                r.mesh.material.dispose();
                this.rings.splice(i, 1);
            } else {
                const s = r.isSlash ? (1 + t * 0.15) : (0.25 + t * r.maxRadius);
                r.mesh.scale.set(s, s, 1);
                r.mesh.material.opacity = (1 - t) * 0.92;
            }
        }
    }
}

// ==========================================
// 6. MAIN THREE.JS RENDERER ORCHESTRATOR
// ==========================================
class OrbitThreeRenderer {
    constructor() {
        this.active = false;
        this.pausedForScreenshot = false;
        this.mode = 'menu'; // 'menu' | 'gameplay' | 'overlay'
        this.time = 0;
        this.shakeIntensity = 0;
        this.fps = 60;
        this._frameCount = 0;
        this._fpsTimer = 0;

        this.enemyMeshes = new Map();
        this.bulletMeshes = new Map();
        this.gemMeshes = new Map();
        this.weaponMeshes = [];

        this.init();
    }

    init() {
        const container = document.getElementById('game-container');
        if (!container) return;

        const isMobile = window.innerWidth <= 640 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
        this.isMobile = isMobile;

        // WebGL2 Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: !isMobile,
            powerPreference: 'high-performance',
            alpha: false
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const canvas = this.renderer.domElement;
        canvas.id = 'three-canvas';
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.zIndex = '1';
        canvas.style.pointerEvents = 'none';
        // Insert FIRST so document.querySelector('canvas') finds our Three.js WebGL2 canvas
        container.insertBefore(canvas, container.firstChild);

        // Scene & Depth Fog
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060d1c);
        this.scene.fog = new THREE.FogExp2(0x081326, 0.0082);

        // Neutral Studio IBL Environment Map (no external HDR)
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.85;
        pmrem.dispose();

        // Tilted Perspective Camera
        this.camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.5, 420);
        this.camera.position.set(0, 22, 18);
        this.camera.lookAt(0, 0.8, 0);
        this.camTarget = new THREE.Vector3(0, 0.8, 0);

        // Lighting Stack: Key (shadow) + Hemisphere Fill + Rim Accent + Hero Practical Light
        this.hemiLight = new THREE.HemisphereLight(0x8ec5fc, 0x0f172a, 0.85);
        this.scene.add(this.hemiLight);

        this.keyLight = new THREE.DirectionalLight(0xfff4e0, 1.85);
        this.keyLight.position.set(18, 34, 16);
        this.keyLight.castShadow = true;
        const shadowRes = isMobile ? 1024 : 2048;
        this.keyLight.shadow.mapSize.set(shadowRes, shadowRes);
        const sCam = this.keyLight.shadow.camera;
        sCam.near = 4; sCam.far = 95;
        sCam.left = -28; sCam.right = 28; sCam.top = 28; sCam.bottom = -28;
        this.keyLight.shadow.bias = -0.0005;
        this.keyLight.shadow.normalBias = 0.04;
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);

        this.rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
        this.rimLight.position.set(-22, 16, -24);
        this.scene.add(this.rimLight);

        this.heroLight = new THREE.PointLight(0x22d3ee, 2.4, 13, 1.6);
        this.heroLight.position.set(0, 2.8, 0);
        this.scene.add(this.heroLight);

        // Materials, World Kit, Hero, VFX
        this.mats = createMaterialLibrary();
        this.world = buildOrbitalWorld(this.scene, this.mats);
        this.hero = buildHeroMech(this.mats);
        this.scene.add(this.hero);

        // Shared bullet geometries
        this.bulletGeos = {
            normal: new THREE.CapsuleGeometry(0.14, 0.55, 4, 8),
            rocket: new THREE.ConeGeometry(0.22, 0.85, 8),
            enemy: new THREE.OctahedronGeometry(0.28, 1)
        };
        this.bulletGeos.normal.rotateZ(Math.PI / 2);
        this.bulletGeos.rocket.rotateZ(-Math.PI / 2);

        this.vfx = new ThreeVfxSystem(this.scene);

        // Post-Processing Chain (Selective Bloom + Subtle Vignette + OutputPass)
        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.34, // strength
            0.26, // radius
            1.15  // threshold — strictly authored emissive signals only, never diffuse/specular armor
        );
        this.composer.addPass(this.bloomPass);

        const VignetteShader = {
            uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.38 }, uSize: { value: 0.78 } },
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform sampler2D tDiffuse; uniform float uStrength, uSize; varying vec2 vUv;
                void main(){
                    vec4 c = texture2D(tDiffuse, vUv);
                    float d = distance(vUv, vec2(0.5));
                    c.rgb *= mix(1.0, smoothstep(uSize, uSize - 0.42, d), uStrength);
                    gl_FragColor = c;
                }`
        };
        this.vignettePass = new ShaderPass(VignetteShader);
        this.composer.addPass(this.vignettePass);
        this.composer.addPass(new OutputPass());

        // Menu Showcase Orbiting Weapons (shown when in menu diorama)
        this.menuWeapons = [];
        ['pistol', 'shotgun', 'laser', 'rocket', 'katana', 'smg'].forEach((id) => {
            const m = buildWeaponMesh(id, this.mats);
            this.scene.add(m);
            this.menuWeapons.push(m);
        });

        // Resize handling
        window.addEventListener('resize', () => this.onResize());

        this.active = true;
        this._lastTime = performance.now();
        this.installTestHooks();
        this.loop();
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.isMobile = w <= 640;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
        this.bloomPass.setSize(w, h);
    }

    setMode(mode) {
        this.mode = mode;
        const hud = document.getElementById('premium-hud');
        if (hud) {
            hud.style.display = mode === 'gameplay' ? 'block' : 'none';
        }
        this.menuWeapons.forEach((m) => { m.visible = (mode === 'menu'); });
        if (mode !== 'gameplay') {
            this.clearGameplayPools();
        }
    }

    clearGameplayPools() {
        this.enemyMeshes.forEach((m) => this.scene.remove(m));
        this.enemyMeshes.clear();
        this.bulletMeshes.forEach((m) => this.scene.remove(m));
        this.bulletMeshes.clear();
        this.gemMeshes.forEach((m) => this.scene.remove(m));
        this.gemMeshes.clear();
        this.weaponMeshes.forEach((w) => this.scene.remove(w.mesh));
        this.weaponMeshes = [];
    }

    // Event hooks called from Phaser gameplay
    onEnemyHit(px, py, isCrit) {
        this.vfx.spawnBurst(pxToX(px), 0.95, pxToZ(py), isCrit ? 10 : 5, isCrit ? 0xfacc15 : 0x38bdf8, isCrit ? 10 : 7);
    }

    onEnemyKilled(px, py, enemy) {
        const color = enemy && enemy.isBoss ? 0xef4444 : (enemy && enemy.isElite ? 0xfacc15 : (enemy && enemy.tierColor) || 0xf97316);
        this.vfx.spawnBurst(pxToX(px), 1.0, pxToZ(py), enemy && enemy.isBoss ? 32 : 14, color, enemy && enemy.isBoss ? 14 : 9);
        if (enemy && (enemy.isBoss || enemy.isElite)) {
            this.vfx.spawnShockwave(pxToX(px), pxToZ(py), enemy.isBoss ? 5.5 : 3.2, color, 0.4);
            this.triggerShake(enemy.isBoss ? 0.65 : 0.35);
        }
    }

    onExplosion(px, py, radiusPx) {
        const x3 = pxToX(px), z3 = pxToZ(py);
        this.vfx.spawnShockwave(x3, z3, Math.max(2.2, radiusPx * PX_TO_3D), 0xf97316, 0.32);
        this.vfx.spawnBurst(x3, 0.9, z3, 22, 0xfb923c, 12);
        this.triggerShake(0.45);
    }

    onMeleeSlash(px, py, angle, rangePx) {
        this.vfx.spawnSlashArc(pxToX(px), pxToZ(py), angle, Math.max(1.8, rangePx * PX_TO_3D), 0x10b981);
    }

    onGemCollect(px, py, isGold) {
        this.vfx.spawnBurst(pxToX(px), 0.7, pxToZ(py), 7, isGold ? 0xfbbf24 : 0x34d399, 6);
    }

    onPlayerHurt() {
        this.hero.userData.hurtTimer = 0.22;
        this.triggerShake(0.4);
        this.vfx.spawnBurst(this.hero.position.x, 1.2, this.hero.position.z, 12, 0xef4444, 8);
    }

    onLevelUp() {
        this.vfx.spawnShockwave(this.hero.position.x, this.hero.position.z, 4.8, 0xfacc15, 0.48);
        this.vfx.spawnBurst(this.hero.position.x, 1.4, this.hero.position.z, 24, 0xfde047, 10);
    }

    triggerShake(amount) {
        this.shakeIntensity = Math.min(0.85, Math.max(this.shakeIntensity, amount));
    }

    // Sync Three.js entities from Phaser GameScene
    syncFromGameScene(gs, dt) {
        if (!gs || !gs.player) return;

        // 1. Hero position, rotation, walk-cycle animation
        const hx = pxToX(gs.player.x);
        const hz = pxToZ(gs.player.y);
        this.hero.position.set(hx, 0, hz);

        const vx = gs.player.body ? gs.player.body.velocity.x : 0;
        const vy = gs.player.body ? gs.player.body.velocity.y : 0;
        const speed = Math.hypot(vx, vy);
        const moveRatio = Math.min(1, speed / 220);

        // Phaser rotation=0 faces +X; Three.js Y rotation = -phaserRot faces +X
        const targetRotY = -(gs.player.rotation || 0);
        this.hero.rotation.y = targetRotY;

        const ud = this.hero.userData;
        const stride = Math.sin(this.time * 13) * 0.62 * moveRatio;
        ud.leftLeg.rotation.z = stride;
        ud.rightLeg.rotation.z = -stride;
        ud.bodyRig.position.y = Math.abs(Math.sin(this.time * 13)) * 0.14 * moveRatio + Math.sin(this.time * 3.5) * 0.04;
        ud.bodyRig.rotation.z = -0.14 * moveRatio; // lean forward into run
        ud.orbitRing.rotation.z = this.time * 0.7;
        ud.groundRing.rotation.z = -this.time * 0.4;

        // Thruster flames scale with speed
        ud.flames.forEach((f, idx) => {
            const pulse = 0.65 + 0.7 * moveRatio + Math.sin(this.time * 28 + idx) * 0.18;
            f.scale.set(1, pulse, 1);
        });

        // Hurt flash
        if (ud.hurtTimer > 0) {
            ud.hurtTimer -= dt;
            ud.torso.material = ud.hurtTimer > 0 ? this.mats.heroHurt : this.mats.heroArmor;
        }

        // Update Hero light & Shadow-casting Key Light to follow hero
        this.heroLight.position.set(hx, 3.0, hz);
        this.keyLight.position.set(hx + 18, 34, hz + 16);
        this.keyLight.target.position.set(hx, 0, hz);

        // 2. Orbiting Weapons
        const wpSprites = gs.weaponSprites || [];
        if (this.weaponMeshes.length !== wpSprites.length || wpSprites.some((w, i) => !this.weaponMeshes[i] || this.weaponMeshes[i].id !== w.data.id)) {
            this.weaponMeshes.forEach((w) => this.scene.remove(w.mesh));
            this.weaponMeshes = wpSprites.map((w) => {
                const mesh = buildWeaponMesh(w.data.id, this.mats);
                this.scene.add(mesh);
                return { id: w.data.id, mesh };
            });
        }
        wpSprites.forEach((w, i) => {
            const wm = this.weaponMeshes[i]?.mesh;
            if (!wm || !w.sprite) return;
            wm.position.set(pxToX(w.sprite.x), 1.32 + Math.sin(this.time * 4 + i) * 0.08, pxToZ(w.sprite.y));
            wm.rotation.y = -(w.sprite.rotation || 0);
            const recoilScale = w.sprite.scaleX || 1;
            wm.scale.setScalar(0.95 * recoilScale);
        });

        // 3. Enemies
        const activeEnemies = new Set();
        const enemyPool = gs.enemies || gs.enemyPool;
        if (enemyPool && typeof enemyPool.getChildren === 'function') {
            const children = enemyPool.getChildren();
            for (let i = 0; i < children.length; i++) {
                const e = children[i];
                if (!e.alive || !e.visible) continue;
                activeEnemies.add(e);

                let mesh = this.enemyMeshes.get(e);
                if (!mesh || mesh.userData.type !== e.enemyType) {
                    if (mesh) this.scene.remove(mesh);
                    mesh = buildEnemyMesh(e.enemyType || 'swarmer', this.mats);
                    this.scene.add(mesh);
                    this.enemyMeshes.set(e, mesh);
                }

                const ex = pxToX(e.x);
                const ez = pxToZ(e.y);
                mesh.position.set(ex, 0, ez);
                const s = (e.scaleX || 1) * 1.05;
                mesh.scale.set(s, s, s);

                // Face player
                mesh.rotation.y = -Math.atan2(gs.player.y - e.y, gs.player.x - e.x);

                // Subtle locomotion bob & spinner
                const bob = Math.sin(this.time * (e.enemyType === 'dasher' ? 14 : 8) + i) * 0.1;
                mesh.userData.body.position.y = Math.max(0, bob);
                if (mesh.userData.spinner) {
                    mesh.userData.spinner.rotation.z = this.time * 3.2;
                }

                // Detect hit flash via HP drop
                if (mesh.userData.lastHp > 0 && e.hp < mesh.userData.lastHp) {
                    mesh.userData.flashTimer = 0.08;
                }
                mesh.userData.lastHp = e.hp;

                if (mesh.userData.flashTimer > 0) {
                    mesh.userData.flashTimer -= dt;
                    mesh.userData.accentMeshes.forEach((am) => { am.material = this.mats.enemyHitFlash; });
                } else if (e.isBerserk) {
                    mesh.userData.accentMeshes.forEach((am) => { am.material = this.mats.enemyBerserkGlow; });
                } else {
                    const baseMat = e.enemyType === 'dasher' ? this.mats.enemyDasherBody
                        : e.enemyType === 'tank' ? this.mats.enemyTankBody
                        : e.enemyType === 'spitter' ? this.mats.enemySpitterBody
                        : e.enemyType === 'elite' ? this.mats.enemyCarapaceDark
                        : e.enemyType === 'boss' ? this.mats.enemyBossArmor
                        : this.mats.enemySwarmerBody;
                    mesh.userData.accentMeshes.forEach((am) => { am.material = baseMat; });
                }
            }
        }
        for (const [e, m] of this.enemyMeshes.entries()) {
            if (!activeEnemies.has(e)) {
                this.scene.remove(m);
                this.enemyMeshes.delete(e);
            }
        }

        // 4. Bullets (Player + Enemy)
        const activeBullets = new Set();
        const syncPool = (pool, isEnemy) => {
            if (!pool || typeof pool.getChildren !== 'function') return;
            const arr = pool.getChildren();
            for (let i = 0; i < arr.length; i++) {
                const b = arr[i];
                if (!b.alive || !b.visible) continue;
                activeBullets.add(b);
                let bm = this.bulletMeshes.get(b);
                if (!bm) {
                    const geo = isEnemy ? this.bulletGeos.enemy : (b.isExplosive ? this.bulletGeos.rocket : this.bulletGeos.normal);
                    const mat = isEnemy ? this.mats.bulletEnemy : (b.isExplosive ? this.mats.bulletRocket : (b.isCrit ? this.mats.bulletCrit : this.mats.bulletNormal));
                    bm = new THREE.Mesh(geo, mat);
                    this.scene.add(bm);
                    this.bulletMeshes.set(b, bm);
                }
                bm.position.set(pxToX(b.x), 1.22, pxToZ(b.y));
                bm.rotation.y = -(b.rotation || 0);
            }
        };
        syncPool(gs.bulletPool, false);
        syncPool(gs.enemyBulletPool, true);
        for (const [b, bm] of this.bulletMeshes.entries()) {
            if (!activeBullets.has(b)) {
                this.scene.remove(bm);
                this.bulletMeshes.delete(b);
            }
        }

        // 5. Gems (EXP & Gold)
        const activeGems = new Set();
        if (gs.gemPool && typeof gs.gemPool.getChildren === 'function') {
            const arr = gs.gemPool.getChildren();
            for (let i = 0; i < arr.length; i++) {
                const gm = arr[i];
                if (!gm.alive || !gm.visible) continue;
                activeGems.add(gm);
                let mesh = this.gemMeshes.get(gm);
                if (!mesh) {
                    mesh = buildGemMesh(gm.gemType === 'gold', this.mats);
                    this.scene.add(mesh);
                    this.gemMeshes.set(gm, mesh);
                }
                mesh.position.set(pxToX(gm.x), 0, pxToZ(gm.y));
                const crystal = mesh.userData.crystal;
                if (crystal) {
                    crystal.rotation.y = this.time * 3.4 + i;
                    crystal.position.y = 0.52 + Math.sin(this.time * 4.5 + i) * 0.14;
                }
            }
        }
        for (const [gm, m] of this.gemMeshes.entries()) {
            if (!activeGems.has(gm)) {
                this.scene.remove(m);
                this.gemMeshes.delete(gm);
            }
        }

        // 6. Camera Follow (Tilted 3D Tactical Perspective)
        const camH = this.isMobile ? 25.5 : 19.5;
        const camBack = this.isMobile ? 16.5 : 14.5;
        this.camTarget.lerp(new THREE.Vector3(hx, 0.8, hz), 0.14);
        let shakeX = 0, shakeY = 0;
        if (this.shakeIntensity > 0.005) {
            shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= Math.pow(0.04, dt);
        } else {
            this.shakeIntensity = 0;
        }
        this.camera.position.set(this.camTarget.x + shakeX, camH + shakeY, this.camTarget.z + camBack);
        this.camera.lookAt(this.camTarget);

        // 7. Sync Sleek DOM HUD
        this.syncHUD(gs);
    }

    syncHUD(gs) {
        const state = window.GlobalPlayerState || (window.SurvivorGame && window.SurvivorGame.GlobalPlayerState);
        if (!state) return;

        const hpFill = document.getElementById('hud-hp-fill');
        const hpVal = document.getElementById('hud-hp-val');
        const waveEl = document.getElementById('hud-wave');
        const timerEl = document.getElementById('hud-timer');
        const enemiesEl = document.getElementById('hud-enemies');
        const goldEl = document.getElementById('hud-gold');
        const lvlEl = document.getElementById('hud-level');
        const pendingEl = document.getElementById('hud-pending');
        const expFill = document.getElementById('hud-exp-fill');

        const hp = Math.max(0, Math.round(state.hp || 0));
        const maxHp = Math.max(1, Math.round(state.maxHp || 100));
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        if (hpFill) {
            hpFill.style.width = `${hpPct}%`;
            hpFill.classList.toggle('low', hpPct < 35);
        }
        if (hpVal) hpVal.textContent = `${hp}/${maxHp}`;

        const maxWaves = (window.GAME_CONFIG && window.GAME_CONFIG.MAX_WAVES) || 100;
        if (waveEl) waveEl.textContent = `W${state.currentWave || 1}/${maxWaves}`;

        const secLeft = Math.max(0, Math.floor(gs.waveTimer || 0));
        const m = Math.floor(secLeft / 60);
        const s = secLeft % 60;
        if (timerEl) {
            timerEl.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
            timerEl.classList.toggle('urgent', secLeft <= 15 || gs.isClimaxMode);
        }

        if (enemiesEl && typeof gs.getActiveEnemyCount === 'function') {
            const cnt = gs.getActiveEnemyCount();
            enemiesEl.textContent = `${cnt}/${gs.maxActiveEnemies || 10}`;
            enemiesEl.classList.toggle('berserk', !!gs.isBerserkMode);
        }

        if (goldEl) goldEl.textContent = `${state.gold || 0}`;
        if (lvlEl) lvlEl.textContent = `LV ${state.level || 1}`;
        if (pendingEl) {
            const p = gs.pendingSkillPicks || 0;
            pendingEl.style.display = p > 0 ? 'inline-flex' : 'none';
            pendingEl.textContent = `+${p} CARD`;
        }
        if (expFill) {
            const expPct = Math.max(0, Math.min(100, ((state.exp || 0) / Math.max(1, state.expToLevel || 10)) * 100));
            expFill.style.width = `${expPct}%`;
        }
    }

    updateMenuDiorama(dt) {
        this.hero.position.set(0, 0, 0);
        this.hero.rotation.y = this.time * 0.45;
        const ud = this.hero.userData;
        ud.bodyRig.position.y = Math.sin(this.time * 2.2) * 0.16;
        ud.bodyRig.rotation.z = 0;
        ud.leftLeg.rotation.z = 0;
        ud.rightLeg.rotation.z = 0;
        ud.orbitRing.rotation.z = this.time * 0.8;
        ud.flames.forEach((f, idx) => f.scale.set(1, 0.8 + Math.sin(this.time * 20 + idx) * 0.25, 1));

        // Orbit showcase weapons
        const r = 2.4;
        this.menuWeapons.forEach((m, i) => {
            m.visible = true;
            const a = this.time * 0.9 + (i * Math.PI * 2) / this.menuWeapons.length;
            m.position.set(Math.cos(a) * r, 1.45 + Math.sin(this.time * 3 + i) * 0.14, Math.sin(a) * r);
            m.rotation.y = -a + Math.PI / 2;
        });

        // Cinematic orbiting showcase camera
        const camA = this.time * 0.22;
        const dist = this.isMobile ? 12.5 : 9.6;
        const h = this.isMobile ? 7.2 : 5.4;
        this.camera.position.set(Math.sin(camA) * dist, h, Math.cos(camA) * dist);
        this.camera.lookAt(0, 1.35, 0);
        this.heroLight.position.set(0, 3.2, 0);
        this.keyLight.position.set(14, 26, 14);
        this.keyLight.target.position.set(0, 0, 0);
    }

    updateAmbientWorld(dt) {
        this.world.radarDishes.forEach((d, idx) => {
            d.rotation.y = this.time * (0.65 + idx * 0.1);
        });
        this.world.orbitalRing.rotation.z = this.time * 0.03;
    }

    updateDiagnostics() {
        const info = this.renderer.info;
        window.__THREE_GAME_DIAGNOSTICS__ = {
            renderer: {
                calls: info.render.calls,
                triangles: info.render.triangles,
                geometries: info.memory.geometries,
                textures: info.memory.textures,
                programs: info.programs ? info.programs.length : 0
            },
            scene: {
                mode: this.mode,
                enemies: this.enemyMeshes.size,
                bullets: this.bulletMeshes.size,
                gems: this.gemMeshes.size,
                weapons: this.weaponMeshes.length
            },
            dpr: this.renderer.getPixelRatio(),
            fps: Math.round(this.fps)
        };
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        const now = performance.now();
        const rawDt = Math.min(0.05, Math.max(0.001, (now - this._lastTime) / 1000));
        this._lastTime = now;

        this._frameCount++;
        this._fpsTimer += rawDt;
        if (this._fpsTimer >= 0.5) {
            this.fps = this._frameCount / this._fpsTimer;
            this._frameCount = 0;
            this._fpsTimer = 0;
        }

        const dt = this.pausedForScreenshot ? 0 : rawDt;
        this.time += dt;

        // Detect active Phaser scene automatically
        const game = window.game || (window.SurvivorGame && window.SurvivorGame.game);
        let activeGameScene = null;
        let activeSceneKey = null;
        if (game && game.scene) {
            const activeScenes = game.scene.getScenes(true);
            if (activeScenes && activeScenes.length > 0) {
                activeSceneKey = activeScenes[0].scene.key;
                if (activeSceneKey === 'GameScene') activeGameScene = activeScenes[0];
            }
        }

        if (activeGameScene) {
            if (this.mode !== 'gameplay') this.setMode('gameplay');
            this.syncFromGameScene(activeGameScene, dt);
        } else if (activeSceneKey === 'MenuScene' || activeSceneKey === 'BootScene' || !activeSceneKey) {
            if (this.mode !== 'menu') this.setMode('menu');
            this.updateMenuDiorama(dt);
        } else {
            // ShopScene, VictoryScene, GameOverScene — keep ambient orbital backdrop running cleanly
            if (this.mode !== 'overlay') this.setMode('overlay');
            this.updateMenuDiorama(dt * 0.4);
        }

        this.updateAmbientWorld(dt);
        this.vfx.update(dt);

        // Render via post-processing composer
        this.composer.render();
        this.updateDiagnostics();
    }

    // ==========================================
    // 7. QA INSPECTOR & EVIDENCE TEST HOOKS
    // ==========================================
    installTestHooks() {
        const self = this;
        window.__THREE_GAME_TEST_HOOKS__ = {
            seed(n) {
                let s = (Number(n) || 42) >>> 0;
                Math.random = () => {
                    s = (s * 1664525 + 1013904223) >>> 0;
                    return s / 4294967296;
                };
                return { seed: Number(n) || 42 };
            },

            setPausedForScreenshot(paused) {
                self.pausedForScreenshot = !!paused;
                const game = window.game;
                if (game && game.scene) {
                    const gs = game.scene.getScene('GameScene');
                    if (gs && gs.scene && gs.scene.isActive()) {
                        gs.isRoundPaused = !!paused;
                        if (gs.physics && gs.physics.world) {
                            if (paused) gs.physics.world.pause();
                            else gs.physics.world.resume();
                        }
                    }
                }
                // Force one synchronous render so the screenshot reflects the latest state immediately
                self.composer.render();
                self.updateDiagnostics();
                return { paused: self.pausedForScreenshot };
            },

            async setState(name) {
                const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));
                const game = window.game;
                if (!game || !game.scene) throw new Error('Phaser game not initialized');

                // Ensure BootScene finished
                for (let i = 0; i < 40; i++) {
                    const active = game.scene.getScenes(true);
                    if (active.length > 0 && active[0].scene.key !== 'BootScene') break;
                    await waitMs(50);
                }

                const startBtn = document.getElementById('start-game-btn');

                if (name === 'menu') {
                    game.scene.getScenes(true).forEach((s) => {
                        if (s.scene.key !== 'MenuScene') s.scene.stop();
                    });
                    if (!game.scene.isActive('MenuScene')) game.scene.start('MenuScene');
                    await waitMs(220);
                    self.setMode('menu');
                    self.updateMenuDiorama(0.016);
                    self.composer.render();
                    self.updateDiagnostics();
                    return { state: 'menu' };
                }

                if (name === 'active-play' || name === 'late-wave') {
                    if (startBtn) startBtn.style.display = 'none';
                    const GState = window.GlobalPlayerState || window.SurvivorGame.GlobalPlayerState;
                    const WTypes = window.WEAPON_TYPES || window.SurvivorGame.WEAPON_TYPES;
                    GState.reset();

                    if (name === 'late-wave') {
                        GState.currentWave = 6;
                        GState.level = 9;
                        GState.gold = 340;
                        GState.score = 12850;
                        GState.pendingSkillPicks = 2;
                        GState.weapons = [
                            JSON.parse(JSON.stringify(WTypes.PISTOL)),
                            JSON.parse(JSON.stringify(WTypes.SHOTGUN)),
                            JSON.parse(JSON.stringify(WTypes.SMG)),
                            JSON.parse(JSON.stringify(WTypes.LASER)),
                            JSON.parse(JSON.stringify(WTypes.ROCKET)),
                            JSON.parse(JSON.stringify(WTypes.KATANA))
                        ];
                    } else {
                        GState.currentWave = 2;
                        GState.level = 3;
                        GState.gold = 85;
                        GState.score = 1420;
                        GState.weapons = [
                            JSON.parse(JSON.stringify(WTypes.PISTOL)),
                            JSON.parse(JSON.stringify(WTypes.SHOTGUN)),
                            JSON.parse(JSON.stringify(WTypes.LASER)),
                            JSON.parse(JSON.stringify(WTypes.KATANA))
                        ];
                    }

                    game.scene.getScenes(true).forEach((s) => s.scene.stop());
                    game.scene.start('GameScene');
                    await waitMs(260);

                    const gs = game.scene.getScene('GameScene');
                    if (!gs || !gs.player) throw new Error('GameScene failed to start');

                    // Populate rich active combat encounter around hero
                    const px = gs.player.x;
                    const py = gs.player.y;
                    if (name === 'late-wave') {
                        gs.waveTimer = 14;
                        gs.isClimaxMode = true;
                        gs.spawnEnemy(px + 190, py - 110, 8, { isBoss: true });
                        gs.spawnEnemy(px - 170, py - 95, 7, { isElite: true });
                        const offsets = [
                            [-150, 90, 5], [160, 100, 6], [-210, -10, 7], [220, 20, 8],
                            [50, -165, 6], [-70, 155, 5], [120, -145, 8], [-125, -140, 7],
                            [250, -70, 6], [-240, 85, 5], [30, 175, 8], [-190, 150, 6]
                        ];
                        offsets.forEach(([ox, oy, tier]) => gs.spawnEnemy(px + ox, py + oy, tier));
                        self.onExplosion(px + 130, py - 70, 95);
                        self.onMeleeSlash(px, py, -0.5, 110);
                    } else {
                        gs.waveTimer = 142;
                        const offsets = [
                            [165, -75, 1], [-155, -85, 2], [180, 95, 3], [-175, 80, 4],
                            [45, -155, 1], [-65, 145, 2], [230, 15, 3], [-210, -25, 1]
                        ];
                        offsets.forEach(([ox, oy, tier]) => gs.spawnEnemy(px + ox, py + oy, tier));
                        self.onEnemyHit(px + 145, py - 65, true);
                    }

                    // Spawn gleaming EXP & Gold gems in view
                    if (gs.gemPool) {
                        [[-90, 55, 'exp'], [105, 65, 'gold'], [-110, -45, 'exp'], [85, -90, 'gold'], [40, 95, 'exp']].forEach(([gx, gy, type]) => {
                            const g = gs.gemPool.get();
                            if (g) g.spawn(px + gx, py + gy, type, type === 'gold' ? 5 : 4);
                        });
                    }

                    // Let weapons fire a volley so active projectiles are visible in flight
                    gs.update(performance.now(), 16.6);
                    gs.update(performance.now() + 16, 16.6);

                    self.setMode('gameplay');
                    self.syncFromGameScene(gs, 0.016);
                    self.vfx.update(0.04);
                    self.composer.render();
                    self.updateDiagnostics();
                    return { state: name };
                }

                if (name === 'gameover') {
                    if (startBtn) startBtn.style.display = 'none';
                    game.scene.getScenes(true).forEach((s) => s.scene.stop());
                    game.scene.start('GameOverScene');
                    await waitMs(220);
                    self.setMode('overlay');
                    self.updateMenuDiorama(0.016);
                    self.composer.render();
                    self.updateDiagnostics();
                    return { state: 'gameover' };
                }

                throw new Error(`Unknown state: ${name}`);
            }
        };
    }
}

// Instantiate on DOM ready
function bootThreeRenderer() {
    if (window.ThreeRenderer) return;
    try {
        window.ThreeRenderer = new OrbitThreeRenderer();
        window.SurvivorGame = window.SurvivorGame || {};
        window.SurvivorGame.ThreeRenderer = window.ThreeRenderer;
    } catch (err) {
        console.warn('[ThreeRenderer] WebGL init fallback:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootThreeRenderer);
} else {
    bootThreeRenderer();
}
