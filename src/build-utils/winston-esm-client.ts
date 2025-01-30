import type { Plugin as VitePlugin } from 'vite';
import { readFile } from 'fs/promises';
import { resolve } from 'pathe';
import { resolvePath } from '@nuxt/kit';
import type { NuxtConfig } from 'nuxt/schema';

const CjsStreamClassTemplate = 
`const { EventEmitter: EE } = require('events')
function Stream(opts) {
  EE.call(this, opts)
}
ObjectSetPrototypeOf(Stream.prototype, EE.prototype)
ObjectSetPrototypeOf(Stream, EE)`;
const EsmStreamClassTemplate = `
const { EventEmitter: EE } = require('../../../../unenv/runtime/node/events/index.cjs');
function Stream(opts) {
  this.__unenv__ = true;
  this._events = Object.create(null);
  //this._maxListeners = undefined;
}
ObjectSetPrototypeOf(Stream.prototype, EE.prototype);
ObjectSetPrototypeOf(Stream, EE);
Stream.prototype.listenerCount = function(type) {
  return this.rawListeners(type)?.lenght ?? 0;
};
`;

const WinstonEsmClientPluginName = 'winston-esm-client';
/**
 * May be unstable, see https://github.com/nodejs/readable-stream/issues/551
 */
const WinstonEsmClientPlugin: VitePlugin = {
  name: WinstonEsmClientPluginName,

  load: async (id: string) => {
    if(id.includes('readable-stream/lib/internal/streams/legacy')) {
      const path = resolve(id);
      const code = await readFile(path, 'utf8');

      const csjTemplateIndex = code.indexOf(CjsStreamClassTemplate);
      if(csjTemplateIndex <= 0) {
        // KB: current template is for readable-stream@4.7.0, probably need to actualize in case more recent version is used
        throw new Error('CJS Stream class template not found!');
      }
      const transformResult = code.replace(CjsStreamClassTemplate, EsmStreamClassTemplate);
      return transformResult;
    }
  },
};

/**
 * See comments to {@link WinstonEsmClientPlugin}
 */
const BuildConfig: NuxtConfig = {
  vite: {
    $client: {
      define: {
        process: {}
      },
      resolve: {
        alias: [
          {
            find: 'string_decoder/',
            replacement: await resolvePath('node_modules/string_decoder/lib/string_decoder.js')
          },
          {
            find: 'process',
            replacement: await resolvePath('node_modules/unenv/runtime/node/process/index.cjs')
          },
          {
            find: 'readable-stream',
            replacement: await resolvePath('node_modules/readable-stream'),
          },
        ]
      },
      plugins: [WinstonEsmClientPlugin]
    }
  },

  imports: {
    imports: [
      { name: 'StringDecoder', from: 'node:string_decoder' },
      { name: 'setImmediate', from: 'node:timers' }
    ]
  },
};


export { BuildConfig }; 