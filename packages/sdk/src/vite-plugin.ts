/**
 * @file Vite 构建插件 — 地图引擎静态资源自动配置
 * @description 为使用 MapCore SDK 的项目自动处理 Cesium / OpenLayers
 *              运行时所需的静态资源（Workers、Assets、Widgets 等），
 *              使下游项目无需手动配置 viteStaticCopy 和 CESIUM_BASE_URL。
 *
 * 使用方式：
 * ```ts
 * // vite.config.ts
 * import { mapEngineSetup } from '@geomapcore/sdk/vite'
 * export default defineConfig({
 *   plugins: [vue(), mapEngineSetup()]
 * })
 * ```
 *
 * @module @geomapcore/sdk/vite
 */

import { resolve, join, dirname } from 'path';
import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';

type VitePlugin = NonNullable<import('vite').Plugin>;

interface MapEngineSetupOptions {
  cesiumBaseDir?: string;
  cesiumBaseUrl?: string;
  copyCesium?: boolean;
}

const DEFAULT_CESIUM_SUBDIR = '/cesium';

const CESIUM_STATIC_DIRS = ['Workers', 'Assets', 'ThirdParty', 'Widgets'];

function resolveFromNodeModules(subpath: string): string | null {
  const candidates = [
    resolve(process.cwd(), 'node_modules', subpath),
    resolve(process.cwd(), 'node_modules', '.pnpm', subpath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  try {
    const resolved = require.resolve(subpath, { paths: [process.cwd()] });
    if (resolved) return dirname(resolved);
  } catch {
    // require.resolve may throw if not found
  }

  return null;
}

function findCesiumBuildDir(): string | null {
  const cesiumPkgRoot = resolveFromNodeModules('cesium/package.json');
  if (cesiumPkgRoot) {
    const buildDir = resolve(cesiumPkgRoot, 'Build', 'Cesium');
    if (existsSync(buildDir)) return buildDir;
  }

  const directBuild = resolve(
    process.cwd(),
    'node_modules',
    'cesium',
    'Build',
    'Cesium'
  );
  if (existsSync(directBuild)) return directBuild;

  return null;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyDirRecursive(src: string, dest: string): void {
  ensureDir(dest);
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export function mapEngineSetup(options: MapEngineSetupOptions = {}): VitePlugin {
  const {
    cesiumBaseUrl = DEFAULT_CESIUM_SUBDIR,
    copyCesium = true,
  } = options;

  let outDir: string;
  let publicDir: string | undefined;
  let cesiumBuildDir: string | null = null;
  let cesiumDetected = false;

  return {
    name: 'mapcore:engine-setup',

    config() {
      cesiumBuildDir = findCesiumBuildDir();
      cesiumDetected = cesiumBuildDir !== null;

      if (!cesiumDetected) return {};

      return {
        define: {
          CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
        },
      };
    },

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir ?? 'dist');
      publicDir = config.publicDir ?? resolve(config.root, 'public');
    },

    async buildStart() {
      if (!copyCesium || !cesiumDetected || !cesiumBuildDir) return;

      const targetBase = publicDir
        ? resolve(publicDir, cesiumBaseUrl.replace(/^\//, ''))
        : resolve(outDir, cesiumBaseUrl.replace(/^\//, ''));

      for (const dir of CESIUM_STATIC_DIRS) {
        const srcDir = resolve(cesiumBuildDir, dir);
        const destDir = resolve(targetBase, dir);

        if (existsSync(srcDir)) {
          if (!existsSync(destDir)) {
            copyDirRecursive(srcDir, destDir);
          }
        }
      }
    },

    async closeBundle() {
      if (!copyCesium || !cesiumDetected || !cesiumBuildDir) return;
      if (publicDir) return;

      const targetBase = resolve(outDir, cesiumBaseUrl.replace(/^\//, ''));
      for (const dir of CESIUM_STATIC_DIRS) {
        const srcDir = resolve(cesiumBuildDir, dir);
        const destDir = resolve(targetBase, dir);

        if (existsSync(srcDir) && !existsSync(destDir)) {
          copyDirRecursive(srcDir, destDir);
        }
      }
    },
  };
}

export default mapEngineSetup;
