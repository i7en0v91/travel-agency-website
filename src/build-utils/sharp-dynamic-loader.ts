import type { Plugin as RollupPlugin} from 'rollup';
import { readFile } from 'fs/promises';
import { createResolver } from '@nuxt/kit';
import { consola } from 'consola';

const nuxtResolve = createResolver(import.meta.url);

const SharpDynamicLoaderPluginName = 'sharp-dynamic-loader';
const SharpDynamicLoaderWrapperId = 'sharp-dynamic-loader.ts';
const SharpDynamicLoaderPlugin: RollupPlugin = {
  name: SharpDynamicLoaderPluginName,
  
  resolveId: async (source) => {
    if(source.includes('sharp-image-processor') && !source.endsWith('.ts')) {
      return SharpDynamicLoaderWrapperId;
    }
  },
  load: async(id) => {
    if(id === SharpDynamicLoaderWrapperId) {
      const sharpProcessorSrcPath = await nuxtResolve.resolve('./../packages/backend/common-services/sharp-image-processor.ts');
      const sharpLibSrcPath = await nuxtResolve.resolve('./../node_modules/sharp/lib/index.js'); // sharp@0.32.6

      const imageProcessorSrc = await readFile(sharpProcessorSrcPath, 'utf8');
      const bundledAccessorTemplate = 'async getSharp() { return sharp; }';
      const dynamicAccessorTemplate = `async getSharp() { return (await import('${sharpLibSrcPath}')).default; }`;
      if(imageProcessorSrc.indexOf(bundledAccessorTemplate) < 0) {
        consola.error(`[${SharpDynamicLoaderPluginName}] rollup plugin failed - cannot locate accessor in image processor code template, original src=[${sharpProcessorSrcPath}], lib=[${sharpLibSrcPath}]`);
        throw new Error(`[${SharpDynamicLoaderPluginName}] plugin failed`);
      }

      //consola.debug(`[${SharpDynamicLoaderPluginName}] image processor code template transformed, original src=[${sharpProcessorSrcPath}], lib=[${sharpLibSrcPath}]`);
      return imageProcessorSrc.replace(bundledAccessorTemplate, dynamicAccessorTemplate);
    }
  }
};

export { SharpDynamicLoaderPlugin }; 