export default defineNitroPlugin(() => {
  (globalThis as any).$appDataStorage = useStorage('assets:appdata');
});
