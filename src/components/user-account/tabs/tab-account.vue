<script setup lang="ts">

import PropertyGrid from './../../forms/property-grid/property-grid.vue';
import SimplePropertyEdit from './../../forms/property-grid/simple-property-edit.vue';
import ListPropertyEdit from './../../forms/property-grid/list-property-edit.vue';
import { getI18nResName2, getI18nResName3, type I18nResName } from './../../../shared/i18n';
import { updateTabIndices } from './../../../shared/dom';
import AppConfig from './../../../appconfig';
import { maskLog } from './../../../shared/applogger';
import CaptchaProtection from './../components/forms/captcha-protection.vue';
import { useCaptchaToken } from './../../../composables/captcha-token';
import { post } from './../../../client/rest-utils';
import { TabIndicesUpdateDefaultTimeout, WebApiRoutes, UserNotificationLevel } from './../../../shared/constants';
import { type IUpdateAccountDto, type IUpdateAccountResultDto, UpdateAccountResultCode } from './../../../server/dto';

interface IProps {
  ctrlKey: string,
  ready: boolean
}
const props = defineProps<IProps>();

enum PropertyCtrlKeys {
  FirstName = 'userAccountProperty-FirstName',
  LastName = 'userAccountProperty-LastName',
  Password = 'userAccountProperty-Password',
  Emails = 'userAccountProperty-Emails'
}

const userNotificationStore = useUserNotificationStore();
const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();
const themeSettings = useThemeSettings();

const { locale } = useI18n();
const logger = CommonServicesLocator.getLogger();

const isError = ref(false);

const captcha = ref<InstanceType<typeof CaptchaProtection>>();
const propFirstName = ref<InstanceType<typeof SimplePropertyEdit>>();
const propLastName = ref<InstanceType<typeof SimplePropertyEdit>>();
const propPassword = ref<InstanceType<typeof SimplePropertyEdit>>();
const propEmails = ref<InstanceType<typeof ListPropertyEdit>>();

const captchaToken = useCaptchaToken(captcha);

const firstName = ref<string | undefined>(userAccount.firstName);
const lastName = ref<string | undefined>(userAccount.lastName);
const password = ref<string | undefined>();
const emails = ref<string[]>(userAccount.emails ?? []);
watch(userAccount, () => {
  logger.debug('(TabAccount) userAccount ref triggered');
  refreshAccountData();
});

function refreshAccountData () {
  firstName.value = userAccount.firstName;
  lastName.value = userAccount.lastName;
  emails.value = userAccount.emails ?? [];
}

function onPropertyEnterEditMode (ctrlKey: string) {
  logger.debug(`(TabAccount) property entered edit mode: ctrlKey=${props.ctrlKey}, propsCtrlKey=${ctrlKey}`);
  const propEditStoppers =
    [propFirstName, propLastName, propPassword, propEmails]
      .filter(p => p.value)
      .map((p) => { return { ctrlKey: p.value!.$props.ctrlKey, editStopperFn: p.value!.exitEditMode }; });
  propEditStoppers.forEach((p) => {
    if (p.ctrlKey !== ctrlKey) {
      p.editStopperFn();
    }
  });
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
}

async function validateAndSaveChanges (dto: IUpdateAccountDto, emailForVerification?: string): Promise<I18nResName | 'success'> {
  dto.captchaToken = await captchaToken.requestToken();

  logger.info(`(TabAccount) sending user account update dto: userId=${userAccount.userId}`);
  const resultDto = await post(WebApiRoutes.UserAccount, undefined, dto) as IUpdateAccountResultDto;
  if (resultDto) {
    switch (resultDto.code) {
      case UpdateAccountResultCode.SUCCESS:
        logger.info(`(TabAccount) user account updated successfully: userId=${userAccount.userId}`);
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
        logger.info(`(TabAccount) user account updated successfully (email autoverified): userId=${userAccount.userId}`);
        userNotificationStore.show({
          level: UserNotificationLevel.WARN,
          resName: getI18nResName3('accountPage', 'tabAccount', 'emailWasAutoverified')
        });
        return 'success';
      case UpdateAccountResultCode.EMAIL_ALREADY_EXISTS:
        logger.info(`(TabAccount) cannot update user account as email already used: userId=${userAccount.userId}`);
        return getI18nResName2('validations', 'emailIsUsed');
      case UpdateAccountResultCode.DELETING_LAST_EMAIL:
        logger.info(`(TabAccount) cannot update user account as the only email cannot be deleted for this user: userId=${userAccount.userId}`);
        return getI18nResName2('validations', 'deletingLastEmail');
    }
  } else {
    // default error handler should throw in a while
    return getI18nResName2('appErrors', 'unknown');
  }
}

async function validateAndSaveSimpleChanges (propCtrlKey: PropertyCtrlKeys, value?: string): Promise<I18nResName | 'success'> {
  logger.verbose(`(TabAccount) validating and saving simple property change: ctrlKey=${props.ctrlKey}, propCtrlKey=${propCtrlKey}, value=${maskLog(value)}`);
  let updateDto: IUpdateAccountDto = {
    locale: locale.value,
    theme: themeSettings.currentTheme.value
  };
  switch (propCtrlKey) {
    case PropertyCtrlKeys.FirstName:
      updateDto = { ...updateDto, firstName: (value?.trim() ?? '') };
      break;
    case PropertyCtrlKeys.LastName:
      updateDto = { ...updateDto, lastName: (value?.trim() ?? '') };
      break;
    case PropertyCtrlKeys.Password:
      updateDto = { ...updateDto, password: value ?? '' };
      break;
  }
  return await validateAndSaveChanges(updateDto);
}

async function validateAndSaveEmailChanges (newValues: (string | undefined)[], _currentValues: (string | undefined)[], op: 'add' | 'change' | 'delete', propIdx: number | 'add', newValue?: string) : Promise<I18nResName | 'success'> {
  logger.verbose(`(TabAccount) validating and saving email changes: ctrlKey=${props.ctrlKey}, op=${op}, propIdx=${propIdx}, newValue=${maskLog(newValue)}`);
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
  <div class="account-tab-account px-xs-3 px-s-4 pt-xs-3 pt-s-4 pb-xs-2 pb-s-3 brdr-3" role="form">
    <ErrorHelm v-model:is-error="isError" :appearance="'error-stub'" :user-notification="true">
      <PropertyGrid ctrl-key="userAccountPropertyGrid">
        <SimplePropertyEdit
          ref="propFirstName"
          v-model:value="firstName"
          :ctrl-key="PropertyCtrlKeys.FirstName"
          type="text"
          :validate-and-save="async (value?: string) => { return await validateAndSaveSimpleChanges(PropertyCtrlKeys.FirstName, value); }"
          :caption-res-name="getI18nResName3('accountPage', 'tabAccount', 'firstNameCaption')"
          :placeholder-res-name="getI18nResName3('accountPage', 'tabAccount', 'firstNamePlaceholder')"
          :max-length="128"
          @enter-edit-mode="onPropertyEnterEditMode"
        />
        <SimplePropertyEdit
          ref="propLastName"
          v-model:value="lastName"
          :ctrl-key="PropertyCtrlKeys.LastName"
          type="text"
          :validate-and-save="async (value?: string) => { return await validateAndSaveSimpleChanges(PropertyCtrlKeys.LastName, value); }"
          :caption-res-name="getI18nResName3('accountPage', 'tabAccount', 'lastNameCaption')"
          :placeholder-res-name="getI18nResName3('accountPage', 'tabAccount', 'lastNamePlaceholder')"
          :max-length="128"
          @enter-edit-mode="onPropertyEnterEditMode"
        />
        <SimplePropertyEdit
          ref="propPassword"
          v-model:value="password"
          :ctrl-key="PropertyCtrlKeys.Password"
          type="password"
          :validate-and-save="async (value?: string) => { return await validateAndSaveSimpleChanges(PropertyCtrlKeys.Password, value); }"
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
        ref="propEmails"
        v-model:values="emails"
        :ctrl-key="PropertyCtrlKeys.Emails"
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
      <CaptchaProtection ref="captcha" ctrl-key="UserAccountTabCaptchaProtection" @verified="captchaToken.onCaptchaVerified" @failed="captchaToken.onCaptchaFailed" />
    </ErrorHelm>
  </div>
</template>
