---
name: ui-hud-design
description: Standar desain UI/UX modern dan Game HUD ergonomis untuk proyek TypeScript dan Three.js. Gunakan skill ini setiap kali membuat, mengedit, atau merapikan tampilan HUD, menu, tombol, kartu item, modal, atau gaya CSS/DOM.
---

# UI/UX & Game HUD Design Standard (Three.js + TypeScript)

Panduan wajib setiap kali membuat, mengedit, atau merapikan tampilan HUD, menu, tombol, kartu item, modal, maupun styling CSS/DOM pada proyek game 3D ini agar antarmuka terlihat tajam, ergonomis, dan jauh dari kesan template generik.

## 1. Arah Estetika & Hierarki Visual

- **Kontras Berlapis (Layered Dark-Glass)**: Hindari panel datar dan membosankan. Bangun kontras yang tegas antara permukaan latar gelap berlapis (translucency terkendali + elevasi visual) dan elemen interaktif utama (CTA, resource utama, item aktif).
- **Hierarki Tipografi Terstruktur**: Bedakan secara jelas ukuran, ketebalan (`font-weight`), dan `letter-spacing` antara judul/header modal, angka statistik utama, dan label sekunder/metadata agar informasi terbaca dalam sekali lirik.
- **Hairline Borders & Backdrop Blur**: Prioritaskan garis tepi tipis `1px` dengan transparansi halus (`rgba(255, 255, 255, ...)` atau aksen semantik lembut) serta `backdrop-filter: blur(...)` daripada drop-shadow pekat dan tebal yang membuat tampilan terasa kotor.
- **Kode Warna Semantik Konsisten**: Gunakan sistem warna yang konsisten dan terprediksi di seluruh layar untuk status aktif/nonaktif, tier rarity item, peringatan/error, dan tombol aksi utama.

## 2. Aturan Wajib HUD Game 3D (Three.js)

- **Viewport First**: Area tengah layar harus selalu bersih dan terbuka untuk pandangan gameplay 3D. Tempatkan elemen HUD secara rapi di sudut atau tepi layar dengan jarak aman (`safe spacing`), dan hindari panel besar yang menutupi pit/arena saat modal tidak sedang dibuka.
- **Pointer Events Discipline**:
  - Container overlay HUD utama (root/layer wrapper) **wajib** menggunakan `pointer-events: none`.
  - **Hanya** elemen interaktif (tombol, panel menu, kartu, input, dialog modal) yang diberi `pointer-events: auto` agar drag/orbit kamera dan raycast klik objek 3D tidak pernah terblokir.
- **Anti-Jitter Numbers (`tabular-nums`)**: Semua angka yang berubah cepat atau dinamis—seperti timer/cooldown, skor/currency, HP bar, jumlah ore, DPS, maupun angka damage—**wajib** memakai `font-variant-numeric: tabular-nums` (class `tabular-nums`) agar lebar teks stabil dan tidak bergetar setiap tick/detik.

## 3. Game Feel & Responsivitas

- **Mikro-Interaksi & Transisi Empuk**: Berikan transisi halus pada state `hover`, umpan balik tekan `active` (mis. micro-scale/translate ringan), serta animasi kemunculan/penutupan modal agar antarmuka terasa hidup, responsif, dan empuk tanpa mengganggu keterbacaan.
- **Adaptif Desktop & Portal Iframe**: Pastikan seluruh HUD, hotbar, grid kartu, dan modal beradaptasi mulus di berbagai rasio layar desktop maupun ukuran jendela iframe portal web (seperti CrazyGames) tanpa memicu scrollbar horizontal (`overflow-x: hidden` / layout fleksibel) dan tanpa elemen yang saling bertabrakan.

## 4. Checklist Sebelum Selesai

- [ ] Tengah viewport 3D bersih saat gameplay aktif (tidak terhalang HUD).
- [ ] Wrapper overlay HUD memakai `pointer-events: none`; hanya elemen interaktif yang memakai `pointer-events: auto`.
- [ ] Seluruh counter, timer, damage, dan stat dinamis memakai `tabular-nums`.
- [ ] Panel memakai garis tepi `1px` halus + kontras berlapis yang jelas (bukan shadow kotor/datar).
- [ ] Tidak ada horizontal overflow atau elemen bertabrakan pada viewport sempit/iframe maupun desktop.
