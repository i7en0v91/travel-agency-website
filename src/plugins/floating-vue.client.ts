// Configuration for floating-vue as it is not available out-of-the box at the moment
import FloatingVue from 'floating-vue';

export default defineNuxtPlugin(() => {
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
  // nuxtApp.vueApp.use(FloatingVue); // <-- I am not sure if we need this
});
