import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';

// Plugin to copy splash.html to dist-electron
function copySplashPlugin() {
  return {
    name: 'copy-splash',
    closeBundle() {
      const src = path.resolve(__dirname, 'electron/splash.html');
      const dest = path.resolve(__dirname, 'dist-electron/splash.html');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
          plugins: [copySplashPlugin()],
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
