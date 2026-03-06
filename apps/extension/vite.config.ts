import { defineConfig } from 'vite';
import { resolve } from 'path';
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  rmSync,
} from 'fs';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-extension-assets',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');

        // Copy manifest.json to dist/
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(distDir, 'manifest.json'),
        );

        // Copy icons to dist/icons/
        const iconsDir = resolve(distDir, 'icons');
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        for (const size of ['16', '48', '128']) {
          const src = resolve(__dirname, `src/icons/icon-${size}.png`);
          const dest = resolve(iconsDir, `icon-${size}.png`);
          if (existsSync(src)) {
            copyFileSync(src, dest);
          }
        }
      },
    },
  ],
});
