<script setup lang="ts">

import { useVuelidate } from '@vuelidate/core';
import * as validators from '@vuelidate/validators';
import { minLength, required, sameAs } from '@vuelidate/validators';
import { getI18nResName2 } from './../shared/i18n';
import NavLogo from './../components/navbar/nav-logo.vue';
import TextBox from './../components/forms/text-box.vue';
import SimpleButton from './../components/forms/simple-button.vue';
import { ApiEndpointPasswordRecoveryComplete, SecretValueMask, PagePath } from './../shared/constants';
import { type IRecoverPasswordCompleteDto, type IRecoverPasswordCompleteResultDto, RecoverPasswordCompleteResultCode } from './../server/dto';
import { post } from './../shared/rest-utils';
import AccountFormPhotos from './../components/account/form-photos.vue';
import { isPasswordSecure } from './../shared/common';

const { t } = useI18n();
const localePath = useLocalePath();

definePageMeta({
  middleware: 'auth',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/'
  },
  title: { resName: getI18nResName2('forgotPasswordSetPage', 'title'), resArgs: undefined }
});
useOgImage();

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

const logger = CommonServicesLocator.getLogger();
const route = useRoute();
let tokenId: number | undefined;
let tokenValue = '';
try {
  tokenId = parseInt(route.query.token_id?.toString() ?? '');
  tokenValue = route.query.token_value?.toString() ?? '';
} catch (err: any) {
  logger.info(`(ForgotPasswordSet) failed to parse token data: id=${tokenId}, value=${tokenValue ? SecretValueMask : '[empty]'}`);
}

const callServerPasswordSet = async (password: string) => {
  if (tokenId && tokenValue) {
    const postBody: IRecoverPasswordCompleteDto = {
      id: tokenId,
      value: tokenValue,
      password
    };

    const resultDto = await post(ApiEndpointPasswordRecoveryComplete, undefined, postBody, undefined, true, 'default') as IRecoverPasswordCompleteResultDto;
    if (resultDto) {
      const resultCode = resultDto.code;
      navigateTo(localePath(`/${PagePath.ForgotPasswordComplete}?result=${resultCode}`));
    }
  } else {
    navigateTo(localePath(`/${PagePath.ForgotPasswordComplete}?result=${RecoverPasswordCompleteResultCode.LINK_INVALID}`));
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
      <NavLogo ctrl-key="setPasswordPageAppLogo" mode="inApp" />
      <h1 class="set-password-title font-h2">
        {{ t(getI18nResName2('forgotPasswordSetPage', 'title')) }}
      </h1>
      <div class="set-password-subtitle mt-xs-3">
        {{ t(getI18nResName2('forgotPasswordSetPage', 'subTitle')) }}
      </div>
      <form>
        <TextBox
          v-model="password"
          ctrl-key="setPasswordPgPassword"
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
          ctrl-key="setPasswordPgConfirmPassword"
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
      <SimpleButton ctrl-key="setPasswordSubmitBtn" class="set-password-btn mt-xs-2" :label-res-name="getI18nResName2('forgotPasswordSetPage', 'setPassword')" @click="submitClick" />
    </div>
    <AccountFormPhotos ctrl-key="SetPasswordPhotos" class="set-password-account-forms-photos" />
  </div>
</template>
