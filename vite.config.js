import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'web-dist' },
  server: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
    watch: { ignored: ['**/legacy/**', '**/.tools/**', '**/.preview/**', '**/.gradle/**', '**/.gradle-home/**', '**/.web-runtime/**', '**/data/**', '**/docs/**', '**/dist/**', '**/web-dist/**', '**/playwright-report/**', '**/test-results/**'] },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/data/**', '**/legacy/**', '**/.preview/**', '**/.tools/**', '**/.web-runtime/**'] },
  },
});
