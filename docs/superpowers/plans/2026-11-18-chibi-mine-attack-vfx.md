# Chibi Attack Animation & Unified Cyber-Anime VFX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memberi seluruh 35 chibi di Tambang dan Battle Tower animasi serangan 3-beat combo yang elastis beserta afterimage, wind-up glint, 4-lapis VFX impact `AdditiveBlending`, sinkronisasi warna `accentColor`/Enchant/Rainbow, serta recoil horizontal pada `OreBillboard2D`.

**Architecture:** Mengekstrak modul pool VFX bersama `src/game3d/AttackImpactFx3D.ts` (`AttackImpactFxController`) yang memakai tekstur kanvas ter-cache dari `src/game3d/ProceduralTextures3D.ts` dan dipakai oleh `OrePit3D` (lantai pit) serta `TowerArena3D` (Wave 1–9 ores & Wave 10 Boss). Sementara itu `ChibiSprite3D` menangani animasi 3-beat combo + 2 ghost afterimages + 1 wind-up glint, dan `FieldMiner3D` / `TowerArena3D` / `MineScene3D` mengalirkan warna aksen serta vektor serangan secara real-time.

**Tech Stack:** TypeScript 5.8 (strict), Three.js r187, Vite 7, Vitest 3.

**Spec:** [docs/superpowers/specs/2026-11-18-chibi-mine-attack-vfx-design.md](../specs/2026-11-18-chibi-mine-attack-vfx-design.md)

## Global Constraints

- **Strict TypeScript tanpa `any`** (`.agent/rules/threejs-ts-standards.md`): dilarang `: any`, `as any`, atau `<any>`.
- **Delta Time Clamp & Color Space**: seluruh animasi dibatasi `dt <= 0.1` detik dan seluruh tekstur kanvas memakai `THREE.SRGBColorSpace` via `paintCachedTexture` (aman tanpa DOM `document` di Vitest).
- **Invarian `ChibiSprite3D` Hierarchy**: `sprite.group.children[0]` tetap `spritePivot`, `spritePivot.children[0]` tetap `animGroup`, dan `animGroup.children[0]` tetap `mesh`; mesh tambahan (`afterimages`, `glint`) ditempatkan di index `>= 1`.
- **Invarian `ChibiSprite3D` Beat 0**: untuk `facing = 1` setelah `triggerAttack(0.4)`, pada `p = 0.1` (`t = 0.04`) wajib `animGroup.position.x < 0` dan pada `p = 0.35` (`t = 0.14`) wajib `animGroup.position.x > 0.05` & `animGroup.rotation.z < 0`.
- **Invarian `TowerArena3D` `InstancedMesh` Count**: jumlah `THREE.InstancedMesh` pada `TowerArena3D.group` wajib tetap tepat `11` (`tests/world-3d.test.ts:1879`), sehingga 4 pool VFX memakai `THREE.Mesh` biasa + shared geometry + oldest-recycling.
- **Backward Compatibility**: `OrePit3D.hitNode(nodeId, dmg, heavy, shardCount?, attackFx?)` dan `OreBillboard2D.updateTransform(..., recoilX?)` wajib menjaga argumen tambahan bersifat opsional agar mock & pemanggil lama tetap lulus.
- **Memory Management**: seluruh geometry, material, dan pool VFX dibersihkan penuh lewat `.dispose()`.

## Review Focus

1. **Burst 5 chibi di kecepatan puncak (`0.28s`) + tap manual melebihi kapasitas pool (`> 18` slash / `> 64` streaks)**: ring-buffer *oldest-recycling* wajib mengganti item tertua & me-dispose materialnya tanpa menumbuhkan `group.children.length` melampaui batas. (Diuji di Task 2)
2. **Stabilitas hierarki child & arah lunge `ChibiSprite3D` di semua beat (`0`, `1`, `2`)**: ghost/glint tidak boleh menggeser indeks `animGroup`/`mesh`, dan fase strike di beat `1` maupun `2` harus tetap bergerak positif searah target serta memudarkan afterimage hingga `visible = false` saat selesai. (Diuji di Task 3)
3. **Transisi warna Enchant (`null` → Enchant → `rainbow` → `null`) di Pit & Tower**: `ChibiFieldFxController.getAccentColor()` wajib kembali ke `def.accentColor` saat enchant dilepas dan menghasilkan hex baru saat `rainbow` berputar tiap frame. (Diuji di Task 4 & Task 6)
4. **Pemanggilan headless Node (`typeof document === 'undefined'`) di semua tekstur dan controller VFX baru**: pemanggilan `getDualSlashArcTexture`, `getHitSparkStarTexture`, `getShockwaveRingTexture`, `getWindupGlintTexture`, `AttackImpactFxController`, `OrePit3D`, dan `TowerArena3D` tidak boleh melempar error di Vitest. (Diuji di Task 1, 2, 5, 6)
5. **Kompatibilitas mock `fakePit` 3-argumen + penjagaan `arenaInstancedCount === 11`**: pemanggilan `OrePit3D.hitNode` tanpa parameter `attackFx` serta traversal `TowerArena3D` sesudah spawn VFX harus tetap aman dan menjaga tepat 11 `InstancedMesh`. (Diuji di Task 5 & Task 6)

---

### Task 1: Cached Cyber-Anime VFX Textures (`ProceduralTextures3D.ts`)

**Files:**
- Modify: `src/game3d/ProceduralTextures3D.ts:397-436`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `paintCachedTexture` internal helper in `src/game3d/ProceduralTextures3D.ts:27-55`
- Produces:
  - `export function getDualSlashArcTexture(): THREE.Texture`
  - `export function getHitSparkStarTexture(): THREE.Texture`
  - `export function getShockwaveRingTexture(): THREE.Texture`
  - `export function getWindupGlintTexture(): THREE.Texture`
  - `export function getSparkStreakTexture(): THREE.Texture`

- [ ] **Step 1: Write the failing test**

Tambahkan spec di `tests/world-3d.test.ts` yang mengimpor dan memanggil kelima helper tekstur baru secara berulang:

```ts
it('caches headless-safe SRGB cyber-anime VFX textures in ProceduralTextures3D', () => {
  const slashA = getDualSlashArcTexture();
  const slashB = getDualSlashArcTexture();
  const spark = getHitSparkStarTexture();
  const ring = getShockwaveRingTexture();
  const glint = getWindupGlintTexture();
  const streak = getSparkStreakTexture();

  expect(slashA).toBe(slashB);
  for (const tex of [slashA, spark, ring, glint, streak]) {
    expect(tex).toBeInstanceOf(THREE.Texture);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run -t "caches headless-safe SRGB cyber-anime VFX textures"`
Expected: FAIL (symbol tidak ditemukan / belum diekspor dari `ProceduralTextures3D.ts`).

- [ ] **Step 3: Implement 5 cached VFX textures in `src/game3d/ProceduralTextures3D.ts`**

Tambahkan `paintConcaveStar(ctx, mid, outerR, innerR)` helper bersama untuk star silang 4-sudut tajam, lalu implementasikan via `paintCachedTexture`:
- `getDualSlashArcTexture()` (`256x256`): crescent asimetris meruncing dua ujung, outer glow semi-transparan (`rgba(255,255,255,0.45)`) dan inner blade core putih penuh (`#ffffff`) agar 1 mesh `AdditiveBlending` menghasilkan efek dual-pass.
- `getHitSparkStarTexture()` (`128x128`): star 4-sudut tajam + silang diagonal tipis + radial core flash.
- `getShockwaveRingTexture()` (`256x256`): ring radial tajam (`r ~ 86..118`) dengan fade dalam lembut + 12 micro-streak radial.
- `getWindupGlintTexture()` (`128x128`): memakai `paintConcaveStar` ramping + halo inti kecil untuk sinyal anticipation.
- `getSparkStreakTexture()` (`64x128`): kapsul/diamond memanjang vertikal dengan inti putih & ekor lembut.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run -t "caches headless-safe SRGB cyber-anime VFX textures"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game3d/ProceduralTextures3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): add cached cyber-anime slash, hitspark, shockwave, glint & streak textures"
```

---

### Task 2: Shared 4-Layer `AttackImpactFxController` (`AttackImpactFx3D.ts`)

**Files:**
- Create: `src/game3d/AttackImpactFx3D.ts`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes:
  - `getDualSlashArcTexture`, `getHitSparkStarTexture`, `getShockwaveRingTexture`, `getSparkStreakTexture` from `src/game3d/ProceduralTextures3D.ts`
- Produces:
  - `export interface AttackImpactSpawnOptions { targetX: number; targetY: number; targetZ: number; accentColor: string; heavy?: boolean; comboStep?: number; attackerX?: number; attackerZ?: number; shockwaveScale?: number; }`
  - `export class AttackImpactFxController` with `readonly group: THREE.Group`, `constructor(opts?: { floorY?: number })`, `spawnImpact(opts: AttackImpactSpawnOptions): void`, `update(dtSec: number, camera?: THREE.Camera): void`, `getActiveCounts(): { slashes: number; hitsparks: number; streaks: number; shockwaves: number }`, `dispose(): void`.

- [ ] **Step 1: Write the failing test**

Tambahkan spec di `tests/world-3d.test.ts`:

```ts
it('spawns 4-layer AttackImpactFxController pools with oldest-recycling caps and full dispose', () => {
  const fx = new AttackImpactFxController({ floorY: 0.045 });
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
  cam.position.set(0, 11.7, 15.6);

  fx.spawnImpact({
    targetX: 0,
    targetY: 0.95,
    targetZ: 0,
    accentColor: '#f59e0b',
    comboStep: 2,
    heavy: true,
    attackerX: -1.3,
    attackerZ: 0.36,
  });
  const afterOne = fx.getActiveCounts();
  expect(afterOne.slashes).toBe(2); // X-Cross on Beat 2 / heavy
  expect(afterOne.hitsparks).toBe(1);
  expect(afterOne.streaks).toBeGreaterThanOrEqual(8);
  expect(afterOne.shockwaves).toBe(1);

  for (let i = 0; i < 20; i++) {
    fx.spawnImpact({ targetX: 0, targetY: 1.0, targetZ: 0, accentColor: '#38bdf8', comboStep: i % 3 });
  }
  const capped = fx.getActiveCounts();
  expect(capped.slashes).toBeLessThanOrEqual(18);
  expect(capped.hitsparks).toBeLessThanOrEqual(16);
  expect(capped.streaks).toBeLessThanOrEqual(64);
  expect(capped.shockwaves).toBeLessThanOrEqual(12);

  let instanced = 0;
  fx.group.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) instanced++;
  });
  expect(instanced).toBe(0);

  fx.update(0.12, cam);
  fx.update(0.4, cam);
  const expired = fx.getActiveCounts();
  expect(expired.slashes + expired.hitsparks + expired.streaks + expired.shockwaves).toBe(0);

  expect(() => fx.dispose()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run -t "spawns 4-layer AttackImpactFxController"`
Expected: FAIL (`Cannot find module '../src/game3d/AttackImpactFx3D'`).

- [ ] **Step 3: Implement `AttackImpactFxController` in `src/game3d/AttackImpactFx3D.ts`**

Bangun helper `pushPooledItem` yang memakai strategi **oldest-recycling** saat kapasitas tercapai (`slashes: 18`, `hitsparks: 16`, `streaks: 64`, `shockwaves: 12`):
- Semua 4 layer memakai `THREE.Mesh` biasa (nol `InstancedMesh`) dengan `sharedSlashGeo` (`PlaneGeometry(1.75, 1.75)`), `sharedHitsparkGeo` (`PlaneGeometry(1.25, 1.25)`), `sharedStreakGeo` (`PlaneGeometry(0.16, 0.72)`), `sharedShockwaveGeo` (`PlaneGeometry(1.0, 1.0)`), dan `MeshBasicMaterial({ ..., transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })`.
- Hitung arah vektor dari `(attackerX, attackerZ)` ke `(targetX, targetZ)` (default menghadap kamera `+Z` bila attacker tidak diberikan), posisikan slash & hitspark sedikit bergeser ke sisi penyerang (`0.32m`), lalu pilih rotasi diagonal per `comboStep` (`0`: miring kanan-bawah, `1`: miring kiri-bawah, `2` atau `heavy`: X-Cross 2 slash).
- Emisi `4–6` spark streaks pada hit normal (`comboStep` `0`/`1`) dan `8–10` pada `comboStep === 2` atau `heavy` dengan lifetime `0.18s–0.26s`, melesat keluar searah pantulan dan diorientasikan sepanjang vektor kecepatannya saat `update()`.
- `shockwave` ditempatkan datar di `y = this.floorY` dan mengembang cepat (`0.22s–0.26s`), lebih lebar saat `comboStep === 2`, `heavy`, atau `shockwaveScale > 1`.
- `dispose()` melepas seluruh pool aktif (remove + material dispose) dan 4 shared geometry.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run -t "spawns 4-layer AttackImpactFxController"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game3d/AttackImpactFx3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): add pooled 4-layer AttackImpactFxController for anime slash, hitspark, streaks & shockwave"
```

---

### Task 3: 3-Beat Combo, Ghost Afterimages & Wind-Up Glint (`ChibiSprite3D.ts`)

**Files:**
- Modify: `src/game3d/ChibiSprite3D.ts:1-390`
- Test: `tests/world-3d.test.ts:1248-1282`

**Interfaces:**
- Consumes: `getWindupGlintTexture` from `src/game3d/ProceduralTextures3D.ts`
- Produces:
  - `public setAccentColor(hex: string): void`
  - `public triggerAttack(durationSec = 0.42, comboStep?: number): void`
  - `public getComboStep(): number` (for verification/readability)

- [ ] **Step 1: Write the failing test**

Tambahkan spec baru di `tests/world-3d.test.ts` tepat setelah test `ChibiSprite3D` yang sudah ada (menjaga test `L1248-1282` tetap utuh):

```ts
it('cycles 3-beat attack combos with tinted ghost afterimages and wind-up glint while preserving child indices', () => {
  const sprite = new ChibiSprite3D(CHIBI_CATALOG[1], 1.95, 0);
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
  cam.position.set(0, 11.7, 15.6);

  const pivot = sprite.group.children[0] as THREE.Group;
  const animGroup = pivot.children[0] as THREE.Group;
  const primaryMesh = animGroup.children[0] as THREE.Mesh;
  expect(primaryMesh.customDepthMaterial).toBeInstanceOf(THREE.MeshDepthMaterial);
  expect(pivot.children.length).toBeGreaterThanOrEqual(3); // animGroup + 2 afterimages
  expect(animGroup.children.length).toBeGreaterThanOrEqual(2); // mesh + wind-up glint

  const ghost0 = pivot.children[1] as THREE.Mesh;
  const glintMesh = animGroup.children[1] as THREE.Mesh;

  sprite.setAccentColor('#f59e0b');
  sprite.setFacing(1);
  sprite.setAnimState('attack');

  for (const expectedStep of [0, 1, 2]) {
    sprite.triggerAttack(0.4);
    expect(sprite.getComboStep()).toBe(expectedStep);
    sprite.update(0.04, 1.0 + expectedStep, cam); // p = 0.10 (wind-up)
    expect(animGroup.position.x).toBeLessThan(0);
    expect(glintMesh.visible).toBe(true);

    sprite.update(0.1, 1.1 + expectedStep, cam); // p = 0.35 (strike lunge)
    expect(animGroup.position.x).toBeGreaterThan(0.05);
    expect(ghost0.visible).toBe(true);
    expect((ghost0.material as THREE.MeshBasicMaterial).color.getHexString()).toBe('f59e0b');
  }

  sprite.update(0.4, 5.0, cam); // settle finished
  expect(ghost0.visible).toBe(false);
  expect(glintMesh.visible).toBe(false);
  expect(() => sprite.dispose()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run -t "cycles 3-beat attack combos with tinted ghost afterimages"`
Expected: FAIL (`sprite.setAccentColor is not a function` / child indices).

- [ ] **Step 3: Implement 3-beat combo, 2 ghost afterimages, and wind-up glint in `src/game3d/ChibiSprite3D.ts`**

- Di constructor (setelah `this.spritePivot.add(this.animGroup)` dan `this.animGroup.add(this.mesh)`):
  - Tambahkan 2 ghost `THREE.Mesh` ke `this.spritePivot` (index `1` dan `2`, memakai `MeshBasicMaterial` additive dengan `depthWrite: false`, `side: THREE.DoubleSide`, `visible = false`, warna default `def.accentColor`).
  - Tambahkan 1 `glintMesh` ke `this.animGroup` (index `1`, `PlaneGeometry(0.46, 0.46)`, `getWindupGlintTexture()`, `AdditiveBlending`, `depthWrite: false`, `visible = false`, `z = 0.04`).
- Di `applyPose`: sinkronkan `ghost.geometry` & `ghostMat.map` ke ukuran/tekstur pose terbaru (dispose geometry ghost lama sebelum replace, atau share geometry ukuran `width, h` dengan clone ringan — lebih aman share `this.mesh.geometry`? JANGAN share geometry yang sama kalau `dispose()` memanggil `dispose()` dua kali, atau buat/sync `new THREE.PlaneGeometry(width, h)` khusus ghost yang di-dispose sekali di `dispose()` & saat `applyPose`!). Sinkronkan `ghost.position.y = h * 0.5` dan `glintMesh.position.set(0, h * 0.56, 0.04)`.
- Di `triggerAttack(durationSec = 0.42, comboStep?: number)`: bila `comboStep` diberikan, set `this.attackComboStep = ((comboStep % 3) + 3) % 3`; bila tidak, gunakan `this.nextComboStep` lalu increment `(this.nextComboStep + 1) % 3`.
- Di `update(...)`:
  - Saat `animState === 'attack'` dan `attackSwingTimer > 0`: jalankan kurva 3 beat (`0`: Diagonal Slash, `1`: Snap Cross dengan lunge lebih lebar & squash horizontal, `2`: Heavy Jump Smash dengan hop lebih tinggi `0.18` & recoil spring), sambil menjaga `posX < 0` di `p = 0.1` dan `posX > 0.05` + `rotZ < 0` di `p = 0.35` untuk `facing = 1`.
  - Aktifkan `glintMesh` pada `p` di `0.02..0.24` (scale pulse & rotasi `z`) dan 2 ghost afterimage pada `p` di `0.16..0.64` (offset mundur sepanjang `-facing` dan `mesh.scale.x` mengikuti facing aktual, lalu sembunyikan saat non-attack atau selesai).
- Di `dispose()`: bersihkan `glintMesh.geometry`/`glintMat`, serta geometry & material kedua ghost mesh.

- [ ] **Step 4: Run test to verify it passes (both new & existing ChibiSprite3D tests)**

Run: `npx.cmd vitest run -t "ChibiSprite3D"`
Expected: PASS (kedua test `ChibiSprite3D` lulus).

- [ ] **Step 5: Commit**

```bash
git add src/game3d/ChibiSprite3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): add 3-beat combo lunge, tinted ghost afterimages & wind-up glint to ChibiSprite3D"
```

---

### Task 4: `ChibiFieldFxController` Color Fix & `FieldMiner3D` Combo Sync (`FieldMiner3D.ts`)

**Files:**
- Modify: `src/game3d/FieldMiner3D.ts:20-320`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes:
  - `ChibiSprite3D.setAccentColor`, `ChibiSprite3D.triggerAttack(durationSec, comboStep)`
  - `OreAttackFxOptions` from `src/game3d/OrePit3D.ts` (note: declare a lightweight structural interface or import type from `AttackImpactFx3D.ts` / `OrePit3D.ts` without circular runtime import — keep `OreAttackFxOptions` in `AttackImpactFx3D.ts` or `OrePit3D.ts` as type-only!).
- Produces:
  - `ChibiFieldFxController.getAccentColor()` returning `defAccentColor` when unenchanted, enchant color when enchanted, and live HSL hex while `enchantRainbow` updates.
  - `FieldMiner3D` cycling `comboStep` `0 -> 1 -> 2` and forwarding `{ accentColor, attackerX, attackerZ, comboStep }` to `pit.hitNode(...)`.

- [ ] **Step 1: Write the failing test**

Tambahkan spec di `tests/world-3d.test.ts`:

```ts
it('returns chibi def.accentColor when unenchanted, cycles rainbow accent, and forwards combo/attackFx from FieldMiner3D', () => {
  const chibi = CHIBI_CATALOG[1]; // solar-striker (#f59e0b)
  const host = new THREE.Group();
  const fx = new ChibiFieldFxController(host, chibi.accentColor, 0);
  expect(fx.getAccentColor()).toBe(chibi.accentColor);

  fx.setEnchant('blazing');
  expect(fx.getAccentColor()).toBe('#f97316');

  fx.setEnchant(null);
  expect(fx.getAccentColor()).toBe(chibi.accentColor);

  fx.setEnchant('spellbound'); // rainbow
  fx.update(0.1);
  const c1 = fx.getAccentColor();
  fx.update(1.2);
  const c2 = fx.getAccentColor();
  expect(c1).not.toBe(c2);
  fx.dispose();

  const receivedFx: Array<{ accentColor?: string; attackerX?: number; comboStep?: number } | undefined> = [];
  const oreNode = {
    id: 0,
    hp: 9999,
    maxHp: 9999,
    alive: true,
    worldX: 0,
    worldY: 0,
    worldZ: 0.65,
    variantKey: 'common' as const,
  };
  const fakePit = {
    getAliveNodesInfo: () => [oreNode],
    hitNode: (_id: number, _dmg: number, _heavy: boolean, _shards?: number, attackFx?: { accentColor?: string; attackerX?: number; comboStep?: number }) => {
      receivedFx.push(attackFx);
      return { broken: false, dmgDealt: 10, variantKey: 'common' as const };
    },
  } as unknown as OrePit3D;

  const fm = new FieldMiner3D(chibi, 0);
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
  cam.position.set(0, 11.7, 15.6);
  for (let i = 0; i < 30; i++) {
    fm.update(0.1, (i + 1) * 0.1, cam, fakePit, undefined, undefined, true);
  }
  expect(receivedFx.length).toBeGreaterThanOrEqual(2);
  expect(receivedFx[0]?.accentColor).toBe(chibi.accentColor);
  expect(typeof receivedFx[0]?.attackerX).toBe('number');
  expect(receivedFx.slice(0, 3).map((x) => x?.comboStep)).toEqual([0, 1, 2].slice(0, Math.min(3, receivedFx.length)));
  fm.dispose();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run -t "returns chibi def.accentColor when unenchanted"`
Expected: FAIL (`getAccentColor()` masih `'#38bdf8'` dan `receivedFx[0]` masih `undefined`).

- [ ] **Step 3: Implement `ChibiFieldFxController` & `FieldMiner3D` sync in `src/game3d/FieldMiner3D.ts`**

- Di `ChibiFieldFxController`: simpan `private readonly defaultAccentColor: string`, inisialisasi `this.accentColorHex = defAccentColor`, reset ke `this.defaultAccentColor` di `setEnchant(null)`, dan perbarui `this.accentColorHex = \`#${this.rainbowTmp.getHexString()}\`` saat `this.enchantRainbow` aktif di `update(elapsed)` (set `rainbowTmp.setHSL(hue, 0.92, 0.62)` sekali sebelum dipakai untuk `moteMat`).
- Di `FieldMiner3D`: simpan `private comboStep = 0`, saat `this.attackCooldown <= 0`:
  - Bila `renderVisuals`: ambil `step = this.comboStep`, increment `this.comboStep = (this.comboStep + 1) % 3`, panggil `this.sprite.setAccentColor(this.fx.getAccentColor())` & `this.sprite.triggerAttack(Math.min(0.44, this.attackInterval * 0.75), step)`, lalu kirim `{ accentColor: this.fx.getAccentColor(), attackerX: pos.x, attackerZ: pos.z, comboStep: step }` sebagai argumen ke-5 `pit.hitNode(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run -t "returns chibi def.accentColor|FieldMiner3D"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game3d/FieldMiner3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): sync ChibiFieldFxController accent/rainbow colors and FieldMiner3D 3-beat attackFx"
```

---

### Task 5: `OreBillboard2D` Recoil & `OrePit3D` 4-Layer Impact Integration (`OrePit3D.ts`)

**Files:**
- Modify: `src/game3d/OrePit3D.ts:345-1246`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes: `AttackImpactFxController` from `src/game3d/AttackImpactFx3D.ts`
- Produces:
  - `export interface OreAttackFxOptions { accentColor?: string; attackerX?: number; attackerZ?: number; comboStep?: number; }`
  - `OreBillboard2D.updateTransform(..., recoilX = 0): void` (optional 7th param)
  - `OrePit3D.hitNode(nodeId: number, dmg: number, heavy: boolean, shardCount?: number, attackFx?: OreAttackFxOptions): OreHitResult | null`
  - `OrePit3D.dispose(): void`

- [ ] **Step 1: Write the failing test**

Tambahkan spec di `tests/world-3d.test.ts`:

```ts
it('drives 4-layer AttackImpactFxController and OreBillboard2D horizontal recoil from OrePit3D.hitNode', () => {
  const pit = new OrePit3D(DEFAULT_WORLD_PALETTE);
  pit.group.visible = true;
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
  cam.position.set(0, 11.7, 15.6);

  const info = pit.getAliveNodesInfo()[0];
  expect(info).toBeDefined();

  const res = pit.hitNode(info.id, 10, false, undefined, {
    accentColor: '#fb7185',
    attackerX: info.worldX - 1.3,
    attackerZ: info.worldZ + 0.36,
    comboStep: 2,
  });
  expect(res?.dmgDealt).toBe(10);

  pit.update(0.016, 0.5, cam);
  expect(() => pit.dispose()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run -t "drives 4-layer AttackImpactFxController and OreBillboard2D horizontal recoil"`
Expected: FAIL (`pit.dispose is not a function`).

- [ ] **Step 3: Implement `OreBillboard2D` recoil & `AttackImpactFxController` in `src/game3d/OrePit3D.ts`**

- Di `OreBillboard2D.updateTransform(elapsed, phase, squashAmt, scaleMult, flashActive, camera?, recoilX = 0)`: terapkan `this.visualGroup.position.x = tremor + recoilX` dan `this.visualGroup.rotation.z = -recoilX * 0.42` untuk efek hentakan samping ringan yang membal kembali ke `0`.
- Di `InternalOreNode`: tambahkan `recoilAmt: number` dan `recoilDirX: number` (diinisialisasi `0` / `1` pada `createNode` & `meteorNode`).
- Di `OrePit3D`: ganti `slashPool` + `slashGeo` dengan `private readonly impactFx = new AttackImpactFxController({ floorY: 0.045 })` dan tambahkan `this.group.add(this.impactFx.group)`.
- Di `hitNode(nodeId, dmg, heavy, shardCount = heavy ? 9 : 4, attackFx?: OreAttackFxOptions)`:
  - Hitung `recoilDirX` dari `Math.sign(node.x - attackFx.attackerX)` (fallback `Math.random() < 0.5 ? 1 : -1`), set `node.recoilAmt = heavy ? 0.24 : 0.16`.
  - Jika `this.group.visible`, panggil `this.impactFx.spawnImpact({ targetX: node.x, targetY: 0.92, targetZ: node.z, accentColor: attackFx?.accentColor ?? (heavy ? '#fbbf24' : this.activePalette.crystalColor), heavy, comboStep: attackFx?.comboStep, attackerX: attackFx?.attackerX, attackerZ: attackFx?.attackerZ !== undefined ? attackFx.attackerZ - PIT_CENTER_Z : undefined })`. *(Perhatikan koordinat lokal `OrePit3D`: `node.x, node.z` berada dalam grup `OrePit3D` yang terletak di `z = PIT_CENTER_Z`, sedangkan `FieldMiner3D` `pos.z` berada di world-space `z` — kurangi `PIT_CENTER_Z` pada `attackerZ` saat memanggil `impactFx.spawnImpact`!)*
- Di `update`: decay `node.recoilAmt` (`Math.max(0, node.recoilAmt - dtSec * 1.35)`), teruskan `node.recoilAmt * node.recoilDirX` ke `node.oreSprite.updateTransform(...)`, dan panggil `this.impactFx.update(dtSec, camera)`.
- Tambahkan `public dispose(): void` di `OrePit3D` yang membersihkan `impactFx.dispose()`, tiap `node.oreSprite.dispose()` + `meteorNode.oreSprite.dispose()`, serta material/geometry milik `OrePit3D` (`floorMat`, `wallMat`, `trimMat`, `pitNeonMat`, `shardMat`, `sharedShardGeo`, `hitMesh`, `geodeRing`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run -t "OrePit3D|drives 4-layer AttackImpactFxController"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game3d/OrePit3D.ts tests/world-3d.test.ts
git commit -m "feat(3d): integrate 4-layer AttackImpactFxController and ore recoil in OrePit3D"
```

---

### Task 6: `TowerArena3D` & `MineScene3D` Unified VFX + Fighter Color Sync + `GAME_MAP.md`

**Files:**
- Modify: `src/game3d/TowerArena3D.ts:1-1117`
- Modify: `src/game3d/MineScene3D.ts:617-630`
- Modify: `GAME_MAP.md`
- Test: `tests/world-3d.test.ts`

**Interfaces:**
- Consumes:
  - `AttackImpactFxController` from `src/game3d/AttackImpactFx3D.ts`
  - `ChibiFieldFxController.getAccentColor()`, `ChibiSprite3D.setAccentColor()`
- Produces:
  - `TowerStrikeEvent` extended with optional `{ accentColor?: string; comboStep?: number; attackerX?: number; attackerZ?: number; }`
  - `TowerArena3D.triggerOreHitBounce(oreIndex: number, broken?: boolean, attackFx?: { accentColor?: string; comboStep?: number; attackerX?: number; attackerZ?: number }): void`

- [ ] **Step 1: Write the failing test**

Tambahkan spec di `tests/world-3d.test.ts` yang memastikan fighter Tower unenchanted memakai `def.accentColor`, sinkron saat enchant berubah, Wave ore mengalami recoil + 4-layer VFX, Boss hit tetap memicu `impactFx`, dan `arenaInstancedCount === 11` tetap terjaga:

```ts
it('unifies 4-layer AttackImpactFxController and fighter accent color sync in TowerArena3D while keeping 11 InstancedMeshes', () => {
  const arena = new TowerArena3D();
  arena.group.visible = true;
  arena.syncFighters([
    { slotIndex: 0, def: CHIBI_CATALOG[1], enchantId: null, dmg: 30, speed: 12, miningMult: 1.2 }, // solar-striker #f59e0b
  ]);
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 1, 120);
  cam.position.set(0, 9.2, 14.8);
  cam.lookAt(0, 2.2, -1.6);

  const wave1Ores = rollTowerWaveOres(1, 1);
  arena.syncWaveState({
    floor: 1,
    wave: 1,
    isBossWave: false,
    isCheckpointFloor: false,
    waveOres: wave1Ores,
    anomalyColorHex: '#38bdf8',
    equippedMinerCount: 1,
    paused: false,
  });

  const strikes: Array<{ accentColor?: string; comboStep?: number }> = [];
  for (let i = 0; i < 45; i++) {
    arena.update(0.05, (i + 1) * 0.05, cam, (ev) => {
      strikes.push({ accentColor: ev.accentColor, comboStep: ev.comboStep });
      if (ev.targetOreIndex !== null) {
        arena.triggerOreHitBounce(ev.targetOreIndex, false, ev);
      }
    });
  }
  expect(strikes.length).toBeGreaterThan(0);
  expect(strikes[0].accentColor).toBe(CHIBI_CATALOG[1].accentColor);

  arena.setFloorVisual(true, '#facc15', 2, 5, false);
  arena.triggerHitBounce(0.24, true);

  let instanced = 0;
  arena.group.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) instanced++;
  });
  expect(instanced).toBe(11);
  expect(() => arena.dispose()).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run -t "unifies 4-layer AttackImpactFxController and fighter accent color sync in TowerArena3D"`
Expected: FAIL (`strikes[0].accentColor` undefined / `RingGeometry` masih dipakai).

- [ ] **Step 3: Update `TowerArena3D.ts`, `MineScene3D.ts`, and `GAME_MAP.md`**

- **`TowerArena3D.ts`**:
  - Ganti `slashGroup` / `slashes` (`RingGeometry`) dengan `private readonly impactFx = new AttackImpactFxController({ floorY: 0.11 })` dan tambahkan `this.group.add(this.impactFx.group)`.
  - Tambah `comboStep: number` pada `TowerChibiFighter`, inisialisasi `colorHex: cfg.def.accentColor`, panggil `sprite.setAccentColor(cfg.def.accentColor)` saat pembuatan fighter dan di `applyFighterEnchant`, serta update `f.colorHex = f.fx.getAccentColor()` + `f.sprite.setAccentColor(f.colorHex)` tiap frame agar Enchant Rainbow ikut live-sync.
  - Tambah `recoilAmt: number` & `recoilDirX: number` di `TowerWaveRockSlot`, decay di `update()`, dan kirim `recoilAmt * recoilDirX` ke `rock.oreSprite.updateTransform(...)`.
  - Di `update()` (Wave ore & Boss): saat `f.attackCooldown <= 0`, increment `f.comboStep`, panggil `f.sprite.triggerAttack(Math.min(0.44, f.attackInterval * 0.75), step)`, harmoniskan `f.lungeTimer` (`0.08m` toward wave ore / `0.26m` toward Boss), dan:
    - Wave ore: kirim `{ ..., accentColor: f.colorHex, comboStep: step, attackerX: pos.x, attackerZ: pos.z }` pada `onFighterStrike`.
    - Boss: panggil `this.impactFx.spawnImpact({ targetX: (Math.random() - 0.5) * 0.65, targetY: 2.45, targetZ: BOSS_CENTER_Z + 1.05, accentColor: f.colorHex, comboStep: step, attackerX: pos.x, attackerZ: pos.z, shockwaveScale: 1.45 })`.
  - Di `triggerOreHitBounce(oreIndex, broken = false, attackFx?)`: set `rock.recoilAmt` & `rock.recoilDirX`, lalu panggil `this.impactFx.spawnImpact(...)` pada posisi batu `(rock.x, 1.05, rock.z)`.
  - Di `triggerHitBounce(intensity = 0.24, spawnSlash = true)`: bila `spawnSlash === true`, panggil `this.impactFx.spawnImpact({ targetX: 0, targetY: 2.65, targetZ: BOSS_CENTER_Z + 1.05, accentColor: this.bossMode ? '#facc15' : this.anomalyColorHex, heavy: true, comboStep: 2, shockwaveScale: 1.65 })`.
  - Panggil `this.impactFx.update(safeDt, camera)` di `update()` dan `this.impactFx.dispose()` di `dispose()`.
- **`MineScene3D.ts:617-630`**: teruskan `strike` ke `this.towerArena.triggerOreHitBounce(strike.targetOreIndex, Boolean(res.broken), strike)`.
- **`GAME_MAP.md`**: perbarui jumlah baris & deskripsi `ProceduralTextures3D.ts`, `AttackImpactFx3D.ts`, `ChibiSprite3D.ts`, `FieldMiner3D.ts`, `OrePit3D.ts`, `TowerArena3D.ts`, `MineScene3D.ts`, dan `tests/world-3d.test.ts` (serta header & Quick Target Lookup).

- [ ] **Step 4: Run full test suite & production build**

Run: `npm.cmd test && npm.cmd run build`
Expected: seluruh spec di `tests/world-3d.test.ts` PASS (48 existing + 6 baru = 54 passed), `tsc --noEmit && vite build` exit code `0`.

- [ ] **Step 5: Visual smoke check & final commit**

Lakukan smoke-test cepat di browser (`npm.cmd run dev` + preview/browser check pada Tambang dan Battle Tower) untuk memastikan slash, hitspark, streak, shockwave, dan ghost afterimage tampil halus tanpa artefak visual, lalu commit perubahan bersih:

```bash
git add src/game3d/ docs/superpowers/ GAME_MAP.md tests/world-3d.test.ts
git commit -m "feat(3d): unify 3-beat chibi attack combos and 4-layer cyber-anime impact VFX across Mine Pit & Battle Tower"
```

---

## Self-Review Check (Inline)
1. **Spec Coverage**: Seluruh bagian spec (`ProceduralTextures3D`, `AttackImpactFx3D`, `ChibiSprite3D` 3-beat/afterimage/glint, `FieldMiner3D` color fix & combo sync, `OrePit3D` recoil + 4-layer impact + dispose, `TowerArena3D` Wave & Boss integration + `MineScene3D` pass-through + `GAME_MAP.md` & test suite) tercakup di Tasks 1–6 tanpa celah.
2. **Step Scan**: Setiap langkah menentukan file, signature, konstanta, assertion test, dan perintah verifikasi konkret tanpa placeholder.
3. **Type Consistency**: Nama class (`AttackImpactFxController`), interface (`AttackImpactSpawnOptions`, `OreAttackFxOptions`, `TowerStrikeEvent`), serta nama fungsi tekstur konsisten di semua task.
4. **Review Focus**: Kelima skenario Review Focus memiliki test spesifik di Tasks 1–6.
5. **Proportion**: Rencana berfokus pada interface, alur data, & test tanpa menyalin implementasi panjang.
