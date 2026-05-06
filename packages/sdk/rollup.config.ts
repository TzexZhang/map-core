import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

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
          '@mapcore/core': 'MapCoreCore',
          '@mapcore/adapter-ol': 'MapCoreAdapterOL',
          '@mapcore/adapter-cesium': 'MapCoreAdapterCesium',
          '@mapcore/datasource': 'MapCoreDatasource',
          '@mapcore/bridge': 'MapCoreBridge',
        },
      },
    ],
    external: [
      'ol',
      'cesium',
      'ol/geom',
      'ol/format',
      'ol/source',
      'ol/layer',
      '@mapcore/core',
      '@mapcore/adapter-ol',
      '@mapcore/adapter-cesium',
      '@mapcore/datasource',
      '@mapcore/bridge',
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declarationDir: undefined,
        declaration: undefined,
        emitDeclarationOnly: false,
      }),
    ],
  },
]);
