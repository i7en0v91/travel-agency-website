/**
 * Performs various configuration checks
 */

import { existsSync, readFileSync } from 'fs';
import { destr } from 'destr';
import { consola } from 'consola';
import AppConfig from './../appconfig';

const PackageJsonFile = 'package.json';
const OgImageNpmPackageName = 'nuxt-og-image';

function fail(msg: string) {
  consola.error(`pre-build checks FAILED: ${msg}`);
  throw new Error(msg);
}

async function checkOgImageCachePrefix(): Promise<void> {
  const packageJsonPath = PackageJsonFile;
  if(!existsSync(packageJsonPath)) {
    fail('cannot locate package.json file');
  }
  const packageJson = destr<any>(readFileSync(packageJsonPath, 'utf-8'));
  let ogImagePackageVersion = packageJson.dependencies[OgImageNpmPackageName] ?? packageJson.devDependencies[OgImageNpmPackageName];
  ogImagePackageVersion = ogImagePackageVersion.replace('^', '');
  const expectedImagesCachePrefix = `cache:${OgImageNpmPackageName}@${ogImagePackageVersion}`;
  const currentImagesCachePrefix = AppConfig.caching.invalidation.ogImageCachePrefix;
  if(currentImagesCachePrefix !== expectedImagesCachePrefix) {
    fail(`seems like ${OgImageNpmPackageName} module version has changed and rendered images cache prefix in appconfig.ts became outdated: current value [${currentImagesCachePrefix}] (expected ${expectedImagesCachePrefix})`);
  }
}

async function run () {
  consola.log(`pre-build checks...`);
  await checkOgImageCachePrefix();
}

run();
