<script setup lang="ts">
import { AppException, AppExceptionCodeEnum, UserNotificationLevel, maskLog, AppConfig, getI18nResName2, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { areCtrlKeysEqual, type ControlKey } from './../../../helpers/components';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../../helpers/dom';
import { ApiEndpointUserAccount, type IUpdateAccountDto, type IUpdateAccountResultDto, UpdateAccountResultCode } from '../../../server/api-definitions';
import PropertyGrid from './../../forms/property-grid/property-grid.vue';
import SimplePropertyEdit from './../../forms/property-grid/simple-property-edit.vue';
import ListPropertyEdit from './../../forms/property-grid/list-property-edit.vue';
import CaptchaProtection from './../../../components/forms/captcha-protection.vue';
import { useCaptchaToken } from './../../../composables/captcha-token';
import { post } from './../../../helpers/rest-utils';
import { getCommonServices } from '../../../helpers/service-accessors';

interface IProps {
  ctrlKey: ControlKey,
  ready: boolean
}
const { ctrlKey } = defineProps<IProps>();

const PropCtrlKeyFirstName: ControlKey = [...ctrlKey, 'FirstName'];
const PropCtrlKeyLastName: ControlKey = [...ctrlKey, 'LastName'];
const PropCtrlKeyPassword: ControlKey = [...ctrlKey, 'Password'];
const PropCtrlKeyEmail: ControlKey = [...ctrlKey, 'Email'];

const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();
const themeSettings = useThemeSettings();

const { locale } = useI18n();
const logger = getCommonServices().getLogger().addContextProps({ component: 'TabAccount' });

const isError = ref(false);

const captcha = useTemplateRef('captcha');
const propFirstName = useTemplateRef('prop-first-name');
const propLastName = useTemplateRef('prop-last-name');
const propPassword = useTemplateRef('prop-password');
const propEmails = useTemplateRef('prop-emails');

const captchaToken = useCaptchaToken(captcha as any);
let isCaptchaTokenRequestPending = false;

const firstName = ref<string | undefined>(userAccount.firstName);
const lastName = ref<string | undefined>(userAccount.lastName);
const password = ref<string | undefined>();
const emails = ref<string[]>(userAccount.emails ?? []);
watch(userAccount, () => {
  logger.debug('userAccount ref triggered');
  refreshAccountData();
});

function refreshAccountData () {
  firstName.value = userAccount.firstName;
  lastName.value = userAccount.lastName;
  emails.value = userAccount.emails ?? [];
}

function onPropertyEnterEditMode (ctrlKey: ControlKey) {
  logger.debug('property entered edit mode', { ctrlKey, propsCtrlKey: ctrlKey });
  const propEditStoppers =
    [propFirstName, propLastName, propPassword, propEmails]
      .filter(p => p.value)
      .map((p) => { return { ctrlKey: p.value!.$props.ctrlKey, editStopperFn: p.value!.exitEditMode }; });
  propEditStoppers.forEach((p) => {
    if (!areCtrlKeysEqual(p.ctrlKey, ctrlKey)) {
      p.editStopperFn();
    }
  });
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

async function validateAndSaveChanges (dto: IUpdateAccountDto, emailForVerification?: string): Promise<I18nResName | 'success' | 'cancel'> {
  if (isCaptchaTokenRequestPending) {
    logger.verbose('simple property change canceled - captcha request pending', ctrlKey);
    return 'cancel';
  }

  try {
    isCaptchaTokenRequestPending = true;
    dto.captchaToken = await captchaToken.requestToken();
  } finally {
    isCaptchaTokenRequestPending = false;
  }

  logger.info('sending user account update dto', { userId: userAccount.userId });
  const resultDto = await post(`/${ApiEndpointUserAccount}`, undefined, dto, undefined, true, undefined, 'default') as IUpdateAccountResultDto;
  if (resultDto) {
    switch (resultDto.code) {
      case UpdateAccountResultCode.SUCCESS:
        logger.info('user account updated successfully', { userId: userAccount.userId });
        setTimeout(() => { userAccountStore.notifyUserAccountChanged(dto); }, 0);
        if (emailForVerification) {
          userNotificationStore.show({
            level: UserNotificationLevel.INFO,
            resName: getI18nResName3('accountPage', 'tabAccount', 'emailVerifyNotification'),
            resArgs: { email: emailForVerification }
          });
        }
        return 'success';
      case UpdateAccountResultCode.EMAIL_AUTOVERIFIED:
        logger.info('user account updated successfully (email autoverified', { userId: userAccount.userId });
        userNotificationStore.show({
          level: UserNotificationLevel.WARN,
          resName: getI18nResName3('accountPage', 'tabAccount', 'emailWasAutoverified')
        });
        return 'success';
      case UpdateAccountResultCode.EMAIL_ALREADY_EXISTS:
        logger.info('cannot update user account as email already used', { userId: userAccount.userId });
        return getI18nResName2('validations', 'emailIsUsed');
      case UpdateAccountResultCode.DELETING_LAST_EMAIL:
        logger.info('cannot update user account as the only email cannot be deleted for this user', { userId: userAccount.userId });
        return getI18nResName2('validations', 'deletingLastEmail');
    }
  } else {
    // default error handler should throw in a while
    return getI18nResName2('appErrors', 'unknown');
  }
}

async function validateAndSaveSimpleChanges (propCtrlKey: ControlKey, value?: string): Promise<I18nResName | 'success' | 'cancel'> {
  logger.verbose('validating and saving simple property change', { ctrlKey, propCtrlKey, value: maskLog(value) });
  let updateDto: IUpdateAccountDto = {
    locale: locale.value,
    theme: themeSettings.currentTheme.value
  };
  if(areCtrlKeysEqual(propCtrlKey, PropCtrlKeyFirstName)) {
    updateDto = { ...updateDto, firstName: (value?.trim() ?? '') };
  } else if(areCtrlKeysEqual(propCtrlKey, PropCtrlKeyLastName)) {
    updateDto = { ...updateDto, lastName: (value?.trim() ?? '') };
  } else if(areCtrlKeysEqual(propCtrlKey, PropCtrlKeyPassword)) {
    updateDto = { ...updateDto, password: value ?? '' };
  } else {
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown field', 'error-stub');
  }
  return await validateAndSaveChanges(updateDto);
}

async function validateAndSaveEmailChanges (newValues: (string | undefined)[], _currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', newValue?: string) : Promise<I18nResName | 'success' | 'cancel'> {
  logger.verbose('validating and saving email changes', { ctrlKey, op, propIdx, newValue: maskLog(newValue) });
  const updateDto: IUpdateAccountDto = {
    locale: locale.value,
    theme: themeSettings.currentTheme.value,
    emails: newValues.map(e => e?.trim() ?? '').filter(e => e.length > 0)
  };
  const emailIfAdded = (op === 'add' || op === 'change') ? newValue : undefined;
  return await validateAndSaveChanges(updateDto, emailIfAdded);
}

const $emit = defineEmits(['update:ready']);

onMounted(() => {
  $emit('update:ready', true);
});

</script>

<template>
  <div class="account-tab-container" role="form">
    <h2 class="account-page-tab-name mb-xs-2 mb-s-3 font-h3">
      {{ $t(getI18nResName3('accountPage', 'tabAccount', 'title')) }}
    </h2>
    <div class="account-tab-account px-xs-3 px-s-4 pt-xs-3 pt-s-4 pb-xs-2 pb-s-3 brdr-3" role="form">
      <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="true">
        <PropertyGrid :ctrl-key="[...ctrlKey, 'PropGrid']">
          <SimplePropertyEdit
            ref="prop-first-name"
            v-model:value="firstName"
            :ctrl-key="PropCtrlKeyFirstName"
            type="text"
            :validate-and-save="async (value?: string) => { return await validateAndSaveSimpleChanges(PropCtrlKeyFirstName, value); }"
            :caption-res-name="getI18nResName3('accountPage', 'tabAccount', 'firstNameCaption')"
            :placeholder-res-name="getI18nResName3('accountPage', 'tabAccount', 'firstNamePlaceholder')"
            :max-length="128"
            @enter-edit-mode="onPropertyEnterEditMode"
          />
          <SimplePropertyEdit
            ref="prop-last-name"
            v-model:value="lastName"
            :ctrl-key="PropCtrlKeyLastName"
            type="text"
            :validate-and-save="async (value?: string) => { return await validateAndSaveSimpleChanges(PropCtrlKeyLastName, value); }"
            :caption-res-name="getI18nResName3('accountPage', 'tabAccount', 'lastNameCaption')"
            :placeholder-res-name="getI18nResName3('accountPage', 'tabAccount', 'lastNamePlaceholder')"
            :max-length="128"
            @enter-edit-mode="onPropertyEnterEditMode"
          />
          <SimplePropertyEdit
            ref="prop-password"
            v-model:value="password"
            :ctrl-key="PropCtrlKeyPassword"
            type="password"
            :validate-and-save="async (value?: string) => { return await validateAndSaveSimpleChanges(PropCtrlKeyPassword, value); }"
            :caption-res-name="getI18nResName3('accountPage', 'tabAccount', 'passwordLabel')"
            :placeholder-res-name="getI18nResName3('accountPage', 'tabAccount', 'passwordPlaceholder')"
            :max-length="256"
            :min-length="8"
            :auto-trim="false"
            :required="true"
            @enter-edit-mode="onPropertyEnterEditMode"
          />
        </PropertyGrid>
        <ListPropertyEdit
          ref="prop-emails"
          v-model:values="emails"
          :ctrl-key="PropCtrlKeyEmail"
          type="email"
          class="mt-xs-4 mt-s-5"
          :validate-and-save="validateAndSaveEmailChanges"
          :caption-res-name="getI18nResName2('accountPageCommon', 'emailLabel')"
          :placeholder-res-name="getI18nResName3('accountPage', 'tabAccount', 'emailPlaceholder')"
          :max-length="256"
          :auto-trim="true"
          :required="true"
          :max-elements-count="AppConfig.maxUserEmailsCount"
          @enter-edit-mode="onPropertyEnterEditMode"
        />
        <CaptchaProtection ref="captcha" :ctrl-key="[...ctrlKey, 'Captcha']" @verified="captchaToken.onCaptchaVerified" @failed="captchaToken.onCaptchaFailed" />
      </ErrorHelm>
    </div>
  </div>
</template>
