export default defineNitroPlugin(() => {
  (globalThis as any).$nitroCache = useStorage();
  (globalThis as any).$appDataStorage = useStorage('assets:appdata');
  (globalThis as any).$pdfFontsStorage = useStorage('assets:pdf-fonts');
});
