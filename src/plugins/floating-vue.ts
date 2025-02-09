// Configuration for floating-vue as it is not available out-of-the box at the moment
import FloatingVue from 'floating-vue';
import type { DirectiveBinding } from 'vue';
import { patchPopperComponent } from '../client/floating-vue';
import type { FloatingVueHydrationHints } from './../types';

export default defineNuxtPlugin((nuxtApp) => {
  FloatingVue.options.themes['default-dropdown'] = {
    // ...FloatingVue.options.themes.dropdown,
    // $resetCss: true,
    $extend: 'dropdown'
  };
  FloatingVue.options.themes['default-menu'] = {
    $extend: 'menu'
  };
  FloatingVue.options.themes['control-dropdown'] = {
    $extend: 'dropdown'
  };
  FloatingVue.options.themes['options-button-dropdown'] = {
    $extend: 'control-dropdown'
  };
  FloatingVue.options.themes['secondary-dropdown'] = {
    $extend: 'control-dropdown'
  };
  FloatingVue.options.themes['default-tooltip'] = {
    $extend: 'tooltip'
  };
  FloatingVue.options.themes['footer-item-tooltip'] = {
    $extend: 'default-tooltip'
  };

  nuxtApp.vueApp.directive('floating-vue-hydration', {
    beforeMount(el: Element, binding: DirectiveBinding, _: VNode) {
      if(!el.className.includes('v-popper') || !binding?.value) {
        return;
      }

      const hydrationHints = binding.value as FloatingVueHydrationHints;
      patchPopperComponent(el as HTMLElement, hydrationHints);
    }
  });
});
