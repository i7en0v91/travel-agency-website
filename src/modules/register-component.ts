import { addComponent, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  async setup () {
    // registering such way instead of import directive to prevent TS types warnings
    await addComponent({
      name: 'VueRecaptcha',
      filePath: 'vue3-recaptcha2'
    });

    await addComponent({
      name: 'CaptchaProtection',
      filePath: '~/components/forms/captcha-protection.vue'
    });

    await addComponent({
      name: 'ConfirmBox',
      filePath: '~/components/confirm-box.vue'
    });
  }
});
