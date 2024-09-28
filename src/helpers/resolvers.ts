import { createResolver } from '@nuxt/kit';

const bundlePathResolver = createResolver('./');

export function resolveSharedPkgPath(...segments: string[]): string {
  return bundlePathResolver.resolve('packages/shared', ...segments);
}

export function resolveBackendPkgPath(...segments: string[]): string {
  return bundlePathResolver.resolve('packages/backend', ...segments);
}