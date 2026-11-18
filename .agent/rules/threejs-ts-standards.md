---
trigger: glob
globs: "**/*.ts"
---

# Three.js + TypeScript Standards

Aturan wajib untuk seluruh file TypeScript (`.ts`) pada project game Three.js ini:

1. **Strict TypeScript tanpa `any`**
   - Wajib gunakan strict TypeScript dan dilarang keras memakai tipe `any` (baik `: any`, `as any`, maupun `<any>`). Gunakan type guard, interface eksplisit, `unknown`, atau generics yang tepat.

2. **Delta Time Clamping**
   - Selalu batasi delta time di dalam game loop dengan batas maksimal `0.1` detik (`Math.min(delta, 0.1)`) agar physics, cooldown, dan animasi tidak melompat saat user berpindah tab browser atau frame mengalami stall.

3. **Timing API Three.js**
   - Untuk timing, gunakan `THREE.Clock` dari paket utama `three` atau import `Timer` secara eksplisit dari `three/addons/misc/Timer.js`.
   - **Jangan pernah** menulis `THREE.Timer` karena tidak tersedia pada namespace utama `three`.

4. **Optimasi Draw Calls dengan `InstancedMesh`**
   - Gunakan `THREE.InstancedMesh` untuk objek 3D yang jumlahnya banyak atau muncul berulang kali demi menjaga draw calls tetap rendah dan performa tetap stabil.

5. **Manajemen Memori & Cleanup (`.dispose()`)**
   - Wajib panggil `.dispose()` pada setiap `BufferGeometry`, `Material`, dan `Texture` saat objek dihapus dari scene atau saat teardown untuk mencegah GPU/WebGL memory leak.

6. **Color Space Rendering**
   - Set `renderer.outputColorSpace = THREE.SRGBColorSpace` pada `WebGLRenderer` (termasuk offscreen renderer) dan gunakan `THREE.SRGBColorSpace` pada color textures agar rendering warna akurat.
