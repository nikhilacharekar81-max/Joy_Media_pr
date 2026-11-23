import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ isSsrBuild }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      cssMinify: true,
      ...(isSsrBuild
        ? {}
        : {
            rollupOptions: {
              output: {
                manualChunks(id) {
                  if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
                    return 'vendor-react';
                  }
                },
              },
            },
          }),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio to prevent WebSocket conflicts and reload loops.
      hmr: false,
      watch: null,
      warmup: {
        clientFiles: [
          './src/index.css',
          './src/entry-client.tsx',
          './src/App.tsx',
          './src/layout/Header.tsx',
          './src/layout/Footer.tsx',
          './src/components/marketplace/AgencyHomePage.tsx',
        ],
      },
    },
  };
});
