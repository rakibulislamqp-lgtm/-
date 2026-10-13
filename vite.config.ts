import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-firebase-config',
        closeBundle() {
          try {
            const src = path.resolve(__dirname, 'firebase-applet-config.json');
            const dest = path.resolve(__dirname, 'dist', 'firebase-applet-config.json');
            if (fs.existsSync(src)) {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              fs.copyFileSync(src, dest);
              console.log('Firebase configuration successfully copied to dist/ folder for Netlify/production deployment.');
            } else {
              console.warn('firebase-applet-config.json not found at project root');
            }
          } catch (err) {
            console.error('Failed to copy firebase-applet-config.json:', err);
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-icons';
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
