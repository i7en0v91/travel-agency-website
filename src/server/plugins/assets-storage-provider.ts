import fsDriver from 'unstorage/drivers/fs';
import { prefixStorage } from 'unstorage';
import { resolveParentDirectory } from '../../shared/fs';

export default defineNitroPlugin(async () => {
  // KB: in Nuxt 3.10.0 Nitro 2.8.1 was problems with mounting storage via nuxt.config nitro:serverAssets config option - mounted manually
  const publicAssetsDir = await resolveParentDirectory('.', 'public');
  const storage = useStorage();
  storage.mount('publicAssets', fsDriver({ base: publicAssetsDir }));
  (globalThis as any).$publicAssetsStorage = prefixStorage(storage, 'publicAssets');
});
