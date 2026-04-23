import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const ORT_MIME: Record<string, string> = {
  wasm: 'application/wasm',
  mjs: 'text/javascript',
  js: 'text/javascript',
};

function onnxRuntimeAssets(): Plugin {
  const sourceDir = dirname(require.resolve('onnxruntime-web'));
  const targetDir = resolve(here, 'public/ort');

  async function copyForBuild() {
    await mkdir(targetDir, { recursive: true });
    const files = await readdir(sourceDir);
    const needed = files.filter((f) => f.endsWith('.wasm') || f.endsWith('.mjs'));
    await Promise.all(needed.map((name) => copyFile(join(sourceDir, name), join(targetDir, name))));
  }

  return {
    name: 'rcm-onnxruntime-assets',
    async buildStart() {
      await copyForBuild();
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/ort/')) return next();
        const name = url.replace(/^\/ort\//, '').split('?')[0] ?? '';
        if (!/^[\w.-]+\.(wasm|mjs|js)$/.test(name)) return next();
        const filePath = join(sourceDir, name);
        try {
          const s = await stat(filePath);
          if (!s.isFile()) return next();
          const ext = name.split('.').pop() ?? '';
          res.setHeader('Content-Type', ORT_MIME[ext] ?? 'application/octet-stream');
          res.setHeader('Content-Length', String(s.size));
          createReadStream(filePath).on('error', next).pipe(res);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), onnxRuntimeAssets()],
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
