---
name: procedural-3d-assets
description: Standar arsitektur dan seni pembuatan aset 3D prosedural (props, kristal, altar, peti, lingkungan, dan efek visual) di Three.js + TypeScript agar tampak detail, low-poly stylized, dan optimal. Gunakan skill ini setiap kali membuat atau memperbarui mesh, model 3D, material, atau objek lingkungan baru di dalam scene.
---

# Procedural 3D Assets Standard (Three.js + TypeScript)

Panduan wajib setiap kali membuat atau memperbarui mesh, properti (props), kristal, altar, peti, lingkungan, atau efek visual 3D prosedural di Three.js + TypeScript agar hasilnya tampak detail, memiliki gaya low-poly stylized yang tajam, dan tetap optimal.

## 1. Kualitas Bentuk & Siluet (Anti-Primitif Polos)

- **Dilarang Primitif Tunggal**: Jangan pernah membuat aset hanya dari satu kubus (`BoxGeometry`), bola (`SphereGeometry`), atau silinder (`CylinderGeometry`) polos.
- **Dilarang Gyroscopic / Armillary / Tilted Tumbling Orbit Rings**: Jangan pernah memasang cincin (`TorusGeometry` / `RingGeometry`) melayang yang miring dan berputar ke atas-bawah (*gyroscopic / armillary / tumbling hoops*) mengelilingi podium, jam, altar, kristal, atau ikon. Semua cincin segel/roda gigi pada podium & jam wajib **100% datar/horizontal** sejajar permukaan lantai/dais.
- **Komposisi Multi-Part**: Bangun siluet yang kaya dan terbaca dari berbagai sudut dengan menggabungkan beberapa sub-mesh (basis/pedestal, bingkai/trim, ornamen, dan puncak/inti):
  - Manfaatkan `THREE.ExtrudeGeometry` dengan `bevelEnabled: true` untuk panel, bingkai, segel, atau ornamen bersudut.
  - Gunakan `THREE.LatheGeometry` untuk bentuk berprofil melingkar (pilar berundak, kendi, cawan altar, mahkota lampu).
  - Gunakan `THREE.CylinderGeometry` atau `THREE.ConeGeometry` segi banyak bersegmen rendah (5–8 sisi) untuk pilar kristal, baut, dan batang struktural.
  - Terapkan variasi rotasi, kemiringan, dan skala asimetris pada elemen alami (gugusan batu, klaster kristal, akar, dedaunan, pohon) agar tidak tampak kaku atau seragam.
- **Tegas & Low-Poly Stylized**: Aktifkan `flatShading: true` pada material dan/atau gunakan variasi warna per sub-part atau `vertexColors` untuk menonjolkan bidang faset low-poly yang bersih dan tajam.

## 2. Standar Material & Pencahayaan

- **PBR Material Realistis per Bahan (`THREE.MeshStandardMaterial`)**:
  - Batu / tanah / dinding kasar: `roughness` tinggi (`0.78–0.95`), `metalness` rendah (`0.0–0.08`).
  - Logam mengilap / trim emas / baja: `metalness` tinggi (`0.75–0.95`), `roughness` rendah–sedang (`0.18–0.42`).
  - Kayu / kain matte: `roughness` (`0.72–0.9`), `metalness` (`0.0–0.05`).
- **Aksen Bercahaya (Emissive)**: Untuk kristal energi, inti lava, rune altar, atau indikator magis, kombinasikan `emissive` dan `emissiveIntensity` (sekitar `0.6–2.5` sesuai kebutuhan scene) agar tetap terbaca jelas dan menonjol di area gelap.
- **Bayangan Konsisten**: Set `mesh.castShadow = true` dan `mesh.receiveShadow = true` secara konsisten pada seluruh mesh struktural utama (kecuali mesh efek transparan/emissive murni atau partikel kecil yang memang sengaja tidak melempar bayangan).

## 3. Arsitektur Kode & Manajemen Memori

- **Factory Function dengan Pivot Dasar (`y = 0`)**:
  - Bungkus setiap jenis aset di dalam factory function TypeScript bertipe ketat (tanpa `any`) yang mengembalikan `THREE.Group` (atau objek hasil yang berisi `group` dan helper `dispose`).
  - Pastikan titik origin/pivot grup berada tepat di dasar bawah objek (`y = 0`) sehingga seluruh sub-mesh berada di `y >= 0` (kecuali akar/fondasi yang memang dimaksudkan tertanam) agar aset mudah ditempatkan langsung di permukaan tanah atau platform.
- **Konfigurasi Fleksibel & Deterministik**:
  - Sediakan interface opsi konfigurasi (misalnya `scale`, `palette` / `rarity`, `seed` variasi) dengan default yang aman agar satu generator mampu memproduksi berbagai variasi visual tanpa duplikasi kode.
- **Pembersihan Memori Wajib (`.dispose()`)**:
  - Setiap aset atau modul generator wajib menyediakan fungsi/helper pembersihan untuk menelusuri `group.traverse(...)` dan memanggil `.dispose()` pada seluruh `BufferGeometry`, `Material` (termasuk array material), dan `Texture` terkait saat aset dihapus dari scene.
  - Untuk properti identik yang muncul berulang dalam jumlah banyak, gunakan `THREE.InstancedMesh` dan tetap dispose geometry/material-nya saat dibongkar.

### Pola Referensi Minimal

```ts
import * as THREE from 'three';

export interface ProceduralAssetOptions {
  scale?: number;
  accentColor?: number;
  seed?: number;
}

export interface ProceduralAssetInstance {
  group: THREE.Group;
  dispose: () => void;
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      mat.dispose();
    }
  });
}
```

## 4. Checklist Sebelum Selesai

- [ ] Aset tersusun dari beberapa sub-mesh (bukan kubus/bola/silinder tunggal polos) dengan `flatShading: true` atau variasi warna sub-part.
- [ ] `THREE.MeshStandardMaterial` memakai `roughness`, `metalness`, serta `emissive`/`emissiveIntensity` (untuk bagian bercahaya) yang sesuai bahan.
- [ ] Mesh utama mengaktifkan `castShadow = true` dan `receiveShadow = true`.
- [ ] Factory function mengembalikan `THREE.Group` dengan pivot tepat di dasar (`y = 0`), memakai strict TypeScript (tanpa `any`), dan menerima parameter variasi (`scale`, palet/rarity, `seed`).
- [ ] Tersedia helper `.dispose()` untuk membebaskan seluruh geometry, material, dan texture saat objek dihapus.
