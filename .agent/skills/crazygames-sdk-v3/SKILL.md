---
name: crazygames-sdk-v3
description: Standar integrasi CrazyGames SDK v3 untuk game web TypeScript, mencakup lifecycle hooks, handler iklan midgame/rewarded, pause game loop, dan audio mute/unmute. Gunakan skill ini setiap kali mengedit atau mengecek integrasi SDK, sistem iklan, audio, atau state game.
---

# CrazyGames SDK v3 Integration Standard

Panduan wajib untuk integrasi CrazyGames SDK v3 pada game web TypeScript (`src/sdk/crazygames.ts` dan seluruh pemanggilnya).

## 1. Script & Safe Guard (`localhost`-Safe)

- Pastikan `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>` dimuat di `index.html`.
- Selalu akses SDK melalui `window.CrazyGames?.SDK` dan sediakan safe guard di setiap helper/hook:
  ```ts
  if (!window.CrazyGames?.SDK || window.CrazyGames.SDK.environment === 'disabled') return;
  ```
- Bungkus pemanggilan SDK dalam `try { ... } catch` agar game tetap berjalan mulus saat dijalankan di `localhost` atau lingkungan tanpa portal CrazyGames.
- Panggil `await window.CrazyGames.SDK.init()` sebelum memanggil `SDK.game.*` atau `SDK.ad.*` (dengan timeout fallback yang aman agar startup tidak pernah hang).

## 2. Lifecycle Hooks Wajib

- **`SDK.game.loadingStart()`**: Panggil saat aset/scene mulai dimuat.
- **`SDK.game.loadingStop()`**: Panggil tepat ketika aset siap dan game siap masuk menu/layar awal.
- **`SDK.game.gameplayStart()`**: Panggil tepat saat pemain mulai bermain/beraksi (dan jangan dipanggil saat tab `document.hidden` atau saat iklan sedang aktif).
- **`SDK.game.gameplayStop()`**: Panggil saat game di-pause, tab tidak aktif (`visibilitychange` / `blur`), masuk menu utama, game over, atau iklan dimulai.
- Bind `SDK.game.settings.muteAudio` & `SDK.game.addSettingsChangeListener` agar pengaturan mute portal CrazyGames selalu tersinkron ke audio game secara terpisah dari preferensi mute user.

## 3. Ad Handlers Wajib (`midgame` & `rewarded`)

Setiap memanggil `SDK.ad.requestAd('midgame' | 'rewarded', callbacks)`, wajib mengimplementasikan logika manual di dalam callback berikut:

- **`adStarted`**:
  - Langsung pause game loop (`requestAnimationFrame` / tick simulasi / timer HUD) dan blokir input gameplay sementara iklan berlangsung.
  - Langsung mute seluruh audio game (BGM + Web Audio SFX) melalui flag terpisah (`adMuted`), tanpa menimpa preferensi mute milik user.
  - Panggil `gameplayStop()` jika gameplay sebelumnya sedang berjalan.
- **`adFinished` dan `adError`**:
  - Kembalikan state audio seperti semula (unmute `adMuted = false`; audio hanya kembali berbunyi jika user tidak me-mute audio secara manual dan portal/tab tidak sedang mute).
  - Lanjutkan game loop (reset timestamp `lastTime` agar delta time tidak melompat) dan kembalikan kontrol ke pemain.
  - Panggil `gameplayStart()` kembali jika sebelum iklan gameplay sedang berjalan dan tab tidak tersembunyi (`!document.hidden`).
  - Gunakan guard `settled` agar `adFinished` / `adError` / `catch` tidak melakukan restore ganda.

## 4. Portal Compliance

- Pastikan **tidak ada** tombol, banner, atau link eksternal (`href`, `window.open`, dll.) yang mengarah keluar dari portal CrazyGames.
