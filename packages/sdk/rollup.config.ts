import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import { defineConfig } from 'rollup';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const sdkRoot = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(sdkRoot, '..');

const subpackageAliases = [
  { find: '@mapcore/core', replacement: resolve(pkg, 'core/src/index.ts') },
  { find: '@mapcore/adapter-ol', replacement: resolve(pkg, 'adapter-ol/src/index.ts') },
  { find: '@mapcore/adapter-cesium', replacement: resolve(pkg, 'adapter-cesium/src/index.ts') },
  { find: '@mapcore/datasource', replacement: resolve(pkg, 'datasource/src/index.ts') },
  { find: '@mapcore/bridge', replacement: resolve(pkg, 'bridge/src/index.ts') },
];

export default defineConfig([
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/mapcore.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/mapcore.umd.js',
        format: 'umd',
        name: 'MapCore',
        sourcemap: true,
        globals: {
          ol: 'ol',
          cesium: 'Cesium',
        },
      },
    ],
    external(id) {
      if (id === 'ol' || id === 'cesium') return true;
      if (id.startsWith('ol/') || id.startsWith('cesium/')) return true;
      return false;
    },
    plugins: [
      alias({ entries: subpackageAliases }),
      typescript({
        tsconfig: './tsconfig.bundle.json',
        declarationDir: undefined,
        declaration: undefined,
        emitDeclarationOnly: false,
      }),
    ],
  },
  {
    input: 'src/vite-plugin.ts',
    output: {
      file: 'dist/vite-plugin.js',
      format: 'esm',
      sourcemap: true,
    },
    external(id) {
      if (id === 'vite' || id === 'path' || id === 'fs') return true;
      return false;
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.vite-plugin.json',
      }),
    ],
  },
]);
