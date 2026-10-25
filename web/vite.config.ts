import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Playwright trace files can be exclusively locked on Windows.
      ignored: ['**/test-results*/**', '**/playwright-report/**', '**/.mock/**', '**/Screens/**'],
    },
  },
});
