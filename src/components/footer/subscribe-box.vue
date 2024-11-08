<script setup lang="ts">
import { validateObjectSync, UserNotificationLevel, getI18nResName2, type I18nResName } from '@golobe-demo/shared';
import { object, string } from 'yup';
import { getCommonServices } from '../../helpers/service-accessors';
import MailBoxSvg from '~/public/img/mailbox.svg';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const { t } = useI18n();
const schema = object({
  email: string().email(getI18nResName2('validations', 'email'))
});
const state = reactive({
  email: undefined
});

const logger = getCommonServices().getLogger();
const userNotificationStore = useUserNotificationStore();

const showRequiredError = ref(false);
const validationErrorResName = computed(() => {
  let errMsgResName: I18nResName | undefined;
  if(showRequiredError.value) {
    errMsgResName = getI18nResName2('validations', 'required');
  } else {
    const validationResult = validateObjectSync(state, schema);
    if(validationResult?.errors?.length) {
      errMsgResName =  validationResult.errors[0] as I18nResName;
    }
  }

  if(errMsgResName) {
    logger.verbose(`(SubscribeBox) input values validation failed, msg=[${errMsgResName}]`);
    return errMsgResName;
  }

  return undefined;
});

async function onSubscribeClick () {
  if(!state.email) {
    showRequiredError.value = true;
    logger.verbose(`(SubscribeBox) preventing subscription attempt for empty email, msg=[${validationErrorResName.value}]`);
    return;
  }

  if(validationErrorResName.value?.length) {
    logger.verbose(`(SubscribeBox) preventing subscription attempt for incorrect email, msg=[${validationErrorResName.value}]`);
    return;
  }
  
  logger.verbose(`(SubscribeBox) showing subscription notification`);
  userNotificationStore.show({
    level: UserNotificationLevel.INFO,
    resName: getI18nResName2('subscribeBox', 'subscribeNotification')
  });
}

onMounted(() => {
  watch(state, () => {
    showRequiredError.value = false;
  });
});

</script>

<template>
  <section class="relative flex flex-row flex-nowrap items-end gap-[90px] bg-primary-200 dark:bg-gray-700 rounded-3xl shadow-md brdr-4">
    <div class="flex-grow flex-shrink basis-auto w-full p-6 p-xs-4">
      <h2 class="text-black dark:text-white text-5xl font-normal text-center lg:text-start overflow-hidden">
        {{ $t(getI18nResName2('subscribeBox', 'title')) }}
      </h2>
      <p class="mt-6 text-gray-600 dark:text-gray-200 text-lg sm:text-xl font-semibold leading-normal">
        {{ $t(getI18nResName2('subscribeBox', 'heading')) }}
      </p>
      <UFormGroup name="email" :label="$t(getI18nResName2('subscribeBox', 'text'))" :error="!!validationErrorResName && $t(validationErrorResName)" class="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-normal flex-grow flex-shrink basis-auto">
        <div class="flex flex-col flex-nowrap gap-[8px] w-full md:flex-row md:items-stretch md:gap-[16px]">
          <UInput v-model.trim="state.email" class="w-full flex-grow flex-shrink basis-auto" :placeholder="$t(getI18nResName2('subscribeBox', 'emailPlaceholder'))"/>
          <UButton size="xl" class="w-full h-[3.250rem] flex-grow-0 flex-shrink basis-auto md:w-auto justify-center" variant="solid" color="primary" @click="onSubscribeClick">
            {{ t(getI18nResName2('subscribeBox', 'subscribeBtn')) }}
          </UButton>
        </div>
      </UFormGroup>
    </div>
    <MailBoxSvg class="!w-[300px] !h-auto hidden lg:block mr-6" filled />
  </section>
</template>
