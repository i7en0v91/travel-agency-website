<script setup lang="ts">
import { type EntityId, isPasswordSecure, type Locale, RecoverPasswordCompleteResultEnum, AppPage, getPagePath, getI18nResName2 } from '@golobe-demo/shared';
import { ApiEndpointPasswordRecoveryComplete, type IRecoverPasswordCompleteDto, type IRecoverPasswordCompleteResultDto } from './../server/api-definitions';
import { post } from './../helpers/rest-utils';
import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { minLength, required, sameAs } from '@vuelidate/validators';
import NavLogo from './../components/navbar/nav-logo.vue';
import TextBox from './../components/forms/text-box.vue';
import SimpleButton from './../components/forms/simple-button.vue';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { useNavLinkBuilder } from './../composables/nav-link-builder';
import { getCommonServices } from '../helpers/service-accessors';
import type { ControlKey } from './../helpers/components';

const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: `/${getPagePath(AppPage.Index)}`
  },
  title: { resName: getI18nResName2('forgotPasswordSetPage', 'title'), resArgs: undefined }
});
useOgImage();

const CtrlKey: ControlKey = ['Page', 'ForgotPasswordSet'];

const password = ref('');
const confirmPassword = ref('');

const { createI18nMessage } = validators;
const withI18nMessage = createI18nMessage({ t });
const rules = computed(() => ({
  password: {
    required: withI18nMessage(required),
    minLength: withI18nMessage(minLength(8)),
    validator: withI18nMessage(isPasswordSecure, { messagePath: () => 'validations.password' })
  },
  confirmPassword: {
    required: withI18nMessage(required),
    sameAsPassword: withI18nMessage(sameAs(password))
  }
}));
const v$ = useVuelidate(rules, { password, confirmPassword, $lazy: true });

const logger = getCommonServices().getLogger().addContextProps({ component: 'ForgotPasswordSet' });
const route = useRoute();
let tokenId: EntityId | undefined;
let tokenValue = '';
try {
  tokenId = route.query.token_id?.toString() ?? '';
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info('failed to parse token data', { id: tokenId, token: tokenValue });
  console.warn(err);
}

const callServerPasswordSet = async (password: string) => {
  if (tokenId && tokenValue) {
    const postBody: IRecoverPasswordCompleteDto = {
      id: tokenId,
      value: tokenValue,
      password
    };

    const resultDto = await post(`/${ApiEndpointPasswordRecoveryComplete}`, undefined, postBody, undefined, true, undefined, 'default') as IRecoverPasswordCompleteResultDto;
    if (resultDto) {
      const resultCode = resultDto.code;
      await navigateTo(navLinkBuilder.buildPageLink(AppPage.ForgotPasswordComplete, locale.value as Locale, { result: resultCode }));
    }
  } else {
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.ForgotPasswordComplete, locale.value as Locale, { result: RecoverPasswordCompleteResultEnum.LINK_INVALID }));
  }
};

function submitClick () {
  v$.value.$touch();
  if (!v$.value.$error) {
    callServerPasswordSet(password.value);
  }
}

</script>

<template>
  <div class="set-password-page account-page no-hidden-parent-tabulation-check">
    <div class="set-password-page-content">
      <NavLogo :ctrl-key="[...CtrlKey, 'NavLogo']" mode="inApp" :hard-link="false"/>
      <h1 class="set-password-title font-h2">
        {{ t(getI18nResName2('forgotPasswordSetPage', 'title')) }}
      </h1>
      <div class="set-password-subtitle mt-xs-3">
        {{ t(getI18nResName2('forgotPasswordSetPage', 'subTitle')) }}
      </div>
      <form>
        <TextBox
          v-model="password"
          :ctrl-key="[...CtrlKey, 'TextBox', 'Password']"
          class="form-field set-password-form-field set-password-password-field"
          type="password"
          :caption-res-name="getI18nResName2('accountPageCommon', 'passwordLabel')"
          :placeholder-res-name="getI18nResName2('accountPageCommon', 'passwordPlaceholder')"
        />
        <div v-if="v$.password.$errors.length" class="input-errors">
          <div class="form-error-msg">
            {{ v$.password.$errors[0].$message }}
          </div>
        </div>
        <TextBox
          v-model="confirmPassword"
          :ctrl-key="[...CtrlKey, 'TextBox', 'ConfirmPassword']"
          class="form-field set-password-form-field set-password-confirm-password-field mt-xs-4"
          type="password"
          :caption-res-name="getI18nResName2('accountPageCommon', 'confirmPasswordLabel')"
          :placeholder-res-name="getI18nResName2('accountPageCommon', 'confirmPasswordPlaceholder')"
        />
        <div v-if="v$.confirmPassword.$errors.length" class="input-errors">
          <div class="form-error-msg">
            {{ v$.confirmPassword.$errors[0].$message }}
          </div>
        </div>
      </form>
      <SimpleButton :ctrl-key="[...CtrlKey, 'Btn', 'Submit']" class="set-password-btn mt-xs-2" :label-res-name="getI18nResName2('forgotPasswordSetPage', 'setPassword')" @click="submitClick" />
    </div>
    <AccountFormPhotos :ctrl-key="[...CtrlKey, 'AccountFormPhotos']" class="set-password-account-forms-photos" />
  </div>
</template>
