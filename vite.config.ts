import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'embed-proxy-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/embed')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const rawId = urlObj.searchParams.get('id') || urlObj.searchParams.get('v') || '';
                const videoId = rawId.replace(/^ph-/, '').split('?')[0].trim();
                if (!videoId) {
                  res.statusCode = 400;
                  return res.end('Video ID is required.');
                }
                const targetUrl = `https://www.pornhub.org/embed/${videoId}`;
                const upstream = await fetch(targetUrl, {
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Referer': 'https://www.pornhub.org/',
                  },
                });
                const html = await upstream.text();
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.end(html);
              } catch {
                res.statusCode = 500;
                return res.end('Stream loading...');
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      cssMinify: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('motion')) return 'vendor-motion';
              return 'vendor-libs';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/ready': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
