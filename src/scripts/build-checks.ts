/**
 * Performs various configuration checks
 */
import { AppConfig, isQuickStartEnv, isTestEnv, isElectronBuild } from '@golobe-demo/shared';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { destr } from 'destr';
import { consola } from 'consola';

const OgImageNpmPackageName = 'nuxt-og-image';
const PackageJsonFile = `node_modules/${OgImageNpmPackageName}/package.json`;

function onChecksFailed(msg: string) {
  consola.error(`pre-build checks FAILED, there may be issues and exceptions in runtime: ${msg}`);
}

async function checkOgImageCachePrefix(): Promise<void> {
  const packageJsonPath = resolve(PackageJsonFile);
  if(!existsSync(packageJsonPath)) {
    onChecksFailed(`cannot locate package.json file, path=${packageJsonPath}`);
  }
  const packageJson = destr<any>(readFileSync(packageJsonPath, 'utf-8'));
  let ogImagePackageVersion = packageJson.version;
  ogImagePackageVersion = ogImagePackageVersion.replace('^', '');
  const expectedImagesCachePrefix = `cache:${OgImageNpmPackageName}@${ogImagePackageVersion}`;
  const currentImagesCachePrefix = AppConfig.caching.invalidation.ogImageCachePrefix;
  if(currentImagesCachePrefix !== expectedImagesCachePrefix) {
    onChecksFailed(`seems like ${OgImageNpmPackageName} module version has changed and rendered images cache prefix in appconfig.ts became outdated: current value [${currentImagesCachePrefix}] (expected ${expectedImagesCachePrefix})`);
  }
}

async function run () {
  consola.log(`pre-build checks...`);

  if(isElectronBuild() && isTestEnv()) {
    consola.error('Running tests with Electron build is not supported');
    throw new Error('Electron build failed');
  }

  if(isQuickStartEnv()) {
    // ignore warnings of potential issues in quickstart
    return;
  }
  await checkOgImageCachePrefix();
}

run();
