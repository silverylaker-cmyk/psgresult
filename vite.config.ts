import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 정적 사이트로 빌드됩니다 (dist/). 서버 TTS·MP4 렌더 기능은 server/index.mjs 를 함께 띄울 때만 활성화됩니다.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3123',
      '/media': 'http://localhost:3123',
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  },
});
