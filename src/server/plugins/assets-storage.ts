export default defineNitroPlugin(() => {
  (globalThis as any).$nitroCache = useStorage();
  (globalThis as any).$srcsetCache = useStorage('glb:images:srcset');
  (globalThis as any).$appDataStorage = useStorage('assets:appdata');
  (globalThis as any).$localesStorage = useStorage('assets:locales');
  (globalThis as any).$pdfFontsStorage = useStorage('assets:pdf-fonts');
  (globalThis as any).$templatesStorage = useStorage('assets:templates');
});
