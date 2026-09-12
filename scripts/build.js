import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

async function buildAll() {
  console.log('Building Extension Pages (popup & dashboard)...');
  await build({
    configFile: false,
    root,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(root, 'src/popup/popup.html'),
          dashboard: resolve(root, 'src/dashboard/dashboard.html'),
        },
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          { src: 'manifest.json', dest: '.' },
          { src: 'src/icons/*', dest: 'icons' },
        ],
      }),
    ],
  });

  console.log('Building Standalone Background Service Worker...');
  await build({
    configFile: false,
    root,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(root, 'src/background/service_worker.ts'),
        formats: ['es'],
        fileName: () => 'service_worker.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  console.log('Building Standalone Content Script (IIFE)...');
  await build({
    configFile: false,
    root,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(root, 'src/content/cadence_tracker.ts'),
        formats: ['iife'],
        name: 'AmanuensisContentScript',
        fileName: () => 'content_script.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  console.log('All extension components built cleanly and self-contained!');
}

buildAll().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
