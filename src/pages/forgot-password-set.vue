<script setup lang="ts">
import { type EntityId, type Locale, RecoverPasswordCompleteResultEnum, AppPage, getPagePath, getI18nResName2, AppConfig } from '@golobe-demo/shared';
import { ApiEndpointPasswordRecoveryComplete, type IRecoverPasswordCompleteDto, type IRecoverPasswordCompleteResultDto } from './../server/api-definitions';
import AccountPageContainer from './../components/account/page-container.vue';
import { post } from './../helpers/rest-utils';
import { createPasswordSchema } from './../helpers/forms';
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

const schema = computed(() => {
  return createPasswordSchema({
    required: t(getI18nResName2('validations', 'required')),
    minLength: t(getI18nResName2('validations', 'minLength'), { min: AppConfig.userPasswordPolicy.minLength }),
    policy: t(getI18nResName2('validations', 'password'), { min: AppConfig.userPasswordPolicy.minLength }),
    sameAs: t(getI18nResName2('validations', 'sameAsPassword'))
  });
});
const state = reactive<any>({
  password: undefined,
  confirmPassword: undefined
});

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
    logger.verbose('sending set password request');
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
    logger.verbose('wont send set password request, token params are empty');
    await navigateTo(navLinkBuilder.buildPageLink(AppPage.ForgotPasswordComplete, locale.value as Locale, { result: RecoverPasswordCompleteResultEnum.LINK_INVALID }));
  }
};

function onSubmit () {
  callServerPasswordSet(state.password);
}

</script>

<template>
  <AccountPageContainer :ctrl-key="[...CtrlKey, 'PageContent']">
    <div class="w-full h-auto">
      <h1 class="text-gray-600 dark:text-gray-300 text-5xl max-w-[90vw] break-words font-normal mt-4">
        {{ $t(getI18nResName2('forgotPasswordSetPage', 'title')) }}
      </h1>
      <div class="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-normal mt-4">
        {{ $t(getI18nResName2('forgotPasswordSetPage', 'subTitle')) }}
      </div>
    </div>

    <UForm :schema="schema" :state="state" class="mt-12 space-y-6" @submit="onSubmit" >
      <UFormGroup name="password" :label="t(getI18nResName2('accountPageCommon', 'passwordLabel'))">
        <UInput v-model="state.password" type="password" :placeholder="t(getI18nResName2('accountPageCommon', 'passwordPlaceholder'))" :max-length="256"/>
      </UFormGroup>

      <UFormGroup name="confirmPassword" :label="t(getI18nResName2('accountPageCommon', 'confirmPasswordLabel'))">
        <UInput v-model="state.confirmPassword" type="password" :placeholder="t(getI18nResName2('accountPageCommon', 'confirmPasswordPlaceholder'))" :max-length="256"/>
      </UFormGroup>

      <UButton type="submit" class="w-full h-auto !mt-7 md:!mt-10 justify-center" size="xl">
        {{ $t(getI18nResName2('forgotPasswordSetPage', 'setPassword')) }}
      </UButton>
    </UForm>
  </AccountPageContainer>
</template>
