import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * 桌面端单文件构建：
 * 把所有 JS/CSS 内联进一个 index.html，避免 file:// 协议下
 * ES module 脚本被跨域策略拦截导致白屏，双击即可离线使用。
 */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist-desktop',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
