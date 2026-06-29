import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    esbuild: {
      keepNames: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/metar': {
          target: 'https://aviationweather.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/metar/, '/api/data/metar')
        },
        '/api/taf': {
          target: 'https://aviationweather.gov',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/taf/, '/api/data/taf')
        }
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
