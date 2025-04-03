<script setup lang="ts">
import { areCtrlKeysEqual, type ControlKey } from './../../../helpers/components';
import { AppException, AppExceptionCodeEnum, UserNotificationLevel, maskLog, AppConfig, getI18nResName2, getI18nResName3, type I18nResName } from '@golobe-demo/shared';
import { UpdateAccountResultCode } from '../../../server/api-definitions';
import PropertyGrid from './../../forms/property-grid/property-grid.vue';
import SimplePropertyEdit from './../../forms/property-grid/simple-property-edit.vue';
import ListPropertyEdit from './../../forms/property-grid/list-property-edit.vue';
import CaptchaProtection from './../../../components/forms/captcha-protection.vue';
import { useCaptchaToken } from './../../../composables/captcha-token';
import type { UserUpdateData } from './../../../stores/user-account-store';
import { getCommonServices } from '../../../helpers/service-accessors';
import { LOADING_STATE } from '../../../helpers/constants';

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

const logger = getCommonServices().getLogger().addContextProps({ component: 'TabAccount' });

const isError = ref(false);

const captcha = useTemplateRef('captcha');
const propFirstName = useTemplateRef('prop-first-name');
const propLastName = useTemplateRef('prop-last-name');
const propPassword = useTemplateRef('prop-password');
const propEmails = useTemplateRef('prop-emails');

const captchaToken = useCaptchaToken(captcha as any);
let isCaptchaTokenRequestPending = false;

const firstName = ref<string | undefined>();
const lastName = ref<string | undefined>();
const password = ref<string | undefined>();
const emails = ref<string[]>([]);

const $emit = defineEmits(['update:ready']);

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
}

async function validateAndSaveChanges (
  updateFields: UserUpdateData, 
  emailForVerification?: string
): Promise<I18nResName | 'success' | 'cancel'> {
  if (isCaptchaTokenRequestPending) {
    logger.verbose('simple property change canceled - captcha request pending', ctrlKey);
    return 'cancel';
  }

  let token: string;
  try {
    isCaptchaTokenRequestPending = true;
    token = await captchaToken.requestToken();
  } finally {
    isCaptchaTokenRequestPending = false;
  }

  const resultCode = await userAccountStore.changePersonalInfo(updateFields, token);
  switch (resultCode) {
    case UpdateAccountResultCode.SUCCESS:
      logger.info('user account updated successfully', { userId: userAccountStore.userId });
      if (emailForVerification) {
        userNotificationStore.show({
          level: UserNotificationLevel.INFO,
          resName: getI18nResName3('accountPage', 'tabAccount', 'emailVerifyNotification'),
          resArgs: { email: emailForVerification }
        });
      }
      return 'success';
    case UpdateAccountResultCode.EMAIL_AUTOVERIFIED:
      logger.info('user account updated successfully (email autoverified', { userId: userAccountStore.userId });
      userNotificationStore.show({
        level: UserNotificationLevel.WARN,
        resName: getI18nResName3('accountPage', 'tabAccount', 'emailWasAutoverified')
      });
      return 'success';
    case UpdateAccountResultCode.EMAIL_ALREADY_EXISTS:
      logger.info('cannot update user account as email already used', { userId: userAccountStore.userId });
      return getI18nResName2('validations', 'emailIsUsed');
    case UpdateAccountResultCode.DELETING_LAST_EMAIL:
      logger.info('cannot update user account as the only email cannot be deleted for this user', { userId: userAccountStore.userId });
      return getI18nResName2('validations', 'deletingLastEmail');
    case false:
      logger.info('result of user account update may be ignored', { userId: userAccountStore.userId });
      return 'cancel';
  }
}

async function validateAndSaveSimpleChanges (propCtrlKey: ControlKey, value?: string): Promise<I18nResName | 'success' | 'cancel'> {
  logger.verbose('validating and saving simple property change', { ctrlKey, propCtrlKey, value: maskLog(value) });
  let updateData: UserUpdateData;
  if(areCtrlKeysEqual(propCtrlKey, PropCtrlKeyFirstName)) {
    updateData = { firstName: value?.trim() ?? '' };
  } else if(areCtrlKeysEqual(propCtrlKey, PropCtrlKeyLastName)) {
    updateData = { lastName: value?.trim() ?? '' };
  } else if(areCtrlKeysEqual(propCtrlKey, PropCtrlKeyPassword)) {
    updateData = { password: value };
  } else {
    throw new AppException(AppExceptionCodeEnum.UNKNOWN, 'unknown field', 'error-stub');
  }
  return await validateAndSaveChanges(updateData);
}

async function validateAndSaveEmailChanges (newValues: (string | undefined)[], _currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', newValue?: string) : Promise<I18nResName | 'success' | 'cancel'> {
  logger.verbose('validating and saving email changes', { ctrlKey, op, propIdx, newValue: maskLog(newValue) });
  const updateData: UserUpdateData = {
    emails: newValues.map(e => e?.trim() ?? '').filter(e => e.length > 0) as string[]
  };
  const emailIfAdded = (op === 'add' || op === 'change') ? newValue : undefined;
  return await validateAndSaveChanges(updateData, emailIfAdded);
}

onMounted(() => {
  watch(() => userAccountStore.emails, () => {
    emails.value = ((userAccountStore.emails && userAccountStore.emails !== LOADING_STATE) ? userAccountStore.emails : undefined) ?? [];
  }, { immediate: true });

  watch(() => userAccountStore.name, () => {
    firstName.value = ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? userAccountStore.name?.firstName : undefined) ?? '';
    lastName.value = ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? userAccountStore.name?.lastName : undefined) ?? '';
  }, { immediate: true });

  $emit('update:ready', true);
});

</script>

<template>
  <div class="w-full h-full" role="form">
    <UForm :state="{}" class="w-full h-auto">
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
          class="*:mt-6 *:sm:mt-8"
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
    </UForm>
  </div>
</template>
