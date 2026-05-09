#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

const PACKAGES = ['core', 'datasource', 'bridge', 'adapter-ol', 'adapter-cesium', 'sdk'];

const version = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
const npmToken = process.env.NPM_TOKEN;

if (!version) {
  console.log('Usage: NPM_TOKEN=<token> node scripts/publish.mjs <version> [--dry-run]');
  console.log('');
  console.log('Arguments:');
  console.log('  version    Semver version (e.g. 1.0.1, 1.1.0, 2.0.0)');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run  Print commands without executing');
  console.log('');
  console.log('Environment:');
  console.log('  NPM_TOKEN  npm Granular Access Token (required for non-dry-run)');
  console.log('');
  console.log('Examples:');
  console.log('  NPM_TOKEN=npm_xxx pnpm publish:sdk 1.0.1');
  console.log('  pnpm publish:sdk:dry');
  process.exit(1);
}

if (!dryRun && !npmToken) {
  console.error('ERROR: NPM_TOKEN environment variable is required.');
  console.error('Create a Granular Access Token at https://www.npmjs.com/settings/tokens');
  console.error('');
  console.error('Usage: NPM_TOKEN=<token> pnpm publish:sdk <version>');
  process.exit(1);
}

function run(cmd, options = {}) {
  if (dryRun) {
    console.log(`  [DRY-RUN] ${cmd.replace(npmToken, '***')}`);
    return '';
  }
  const env = { ...process.env };
  if (npmToken) {
    env.NPM_CONFIG_REGISTRY = 'https://registry.npmjs.org';
  }
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, env, ...options });
}

function updatePackageVersion(pkgDir, newVersion) {
  const pkgPath = resolve(pkgDir, 'package.json');
  const raw = readFileSync(pkgPath, 'utf-8');
  const updated = raw.replace(/"version":\s*"[^"]*"/, `"version": "${newVersion}"`);
  if (dryRun) {
    console.log(`  [DRY-RUN] update version in ${pkgPath}`);
  } else {
    writeFileSync(pkgPath, updated, 'utf-8');
  }
}

function verifyDist(pkgDir) {
  const distDir = resolve(pkgDir, 'dist');
  if (!existsSync(distDir)) {
    console.error(`  ERROR: ${distDir} not found. Build may have failed.`);
    process.exit(1);
  }
}

console.log('============================================');
console.log(' MapCore SDK Publish');
console.log(` Version: ${version}`);
console.log(` Mode:    ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
console.log('============================================');
console.log('');

console.log('[1/5] Updating version to ' + version + '...');
for (const pkg of PACKAGES) {
  updatePackageVersion(resolve(ROOT_DIR, 'packages', pkg), version);
}
console.log('');

console.log('[2/5] Updating lockfile...');
run('pnpm install --no-frozen-lockfile');
console.log('');

console.log('[3/5] Building all packages...');
run('pnpm build');
console.log('');

console.log('[4/5] Verifying build artifacts...');
for (const pkg of PACKAGES) {
  const distDir = resolve(ROOT_DIR, 'packages', pkg, 'dist');
  if (dryRun) {
    console.log(`  [DRY-RUN] verify ${pkg}/dist/`);
  } else {
    verifyDist(resolve(ROOT_DIR, 'packages', pkg));
    console.log(`  OK: ${pkg}/dist/`);
  }
}
console.log('');

console.log('[5/5] Publishing packages...');
for (const pkg of PACKAGES) {
  const pkgDir = resolve(ROOT_DIR, 'packages', pkg);
  console.log(`  Publishing @geomapcore/${pkg}...`);
  run(
    `npm publish --registry=https://registry.npmjs.org --//registry.npmjs.org/:_authToken=${npmToken}`,
    { cwd: pkgDir }
  );
}
console.log('');

console.log('============================================');
console.log(` Done! Published @geomapcore/*@${version}`);
console.log('============================================');
