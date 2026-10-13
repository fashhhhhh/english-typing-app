import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 相对路径，使构建产物可通过 file:// 直接打开（桌面快捷方式）
  base: './',
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
