import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
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
      name: 'copy-manifest-and-icons',
      closeBundle() {
        // Copy manifest.json to dist/
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json'),
        );
        // Copy icons to dist/icons/
        const iconsDir = resolve(__dirname, 'dist/icons');
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        for (const size of ['16', '48', '128']) {
          const src = resolve(__dirname, `src/icons/icon-${size}.png`);
          const dest = resolve(__dirname, `dist/icons/icon-${size}.png`);
          if (existsSync(src)) {
            copyFileSync(src, dest);
          }
        }
      },
    },
  ],
});
