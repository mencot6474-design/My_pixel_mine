import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three-vendor';
          if (id.includes('/src/game3d/') || id.includes('\\src\\game3d\\')) return 'game-3d';
          if (id.includes('/src/ui/') || id.includes('\\src\\ui\\')) return 'game-ui';
        },
      },
    },
  },
});
