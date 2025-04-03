<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { UserAccountPageCtrlKey, UserAccountTabGroup, UserAccountTabAccount, UserAccountTabHistory, UserAccountTabPayments, LocatorClasses, LOADING_STATE } from './../helpers/constants';
import type { ControlKey } from './../helpers/components';
import AvatarBox from './../components/user-account/avatar-box.vue';
import UserCover from './../components/user-account/user-cover.vue';
import TabsGroup from '../components/forms/tabs-group.vue';
import PageSection from './../components/common-page-components/page-section.vue';
import ComponentWaitingIndicator from '../components/forms/component-waiting-indicator.vue';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('accountPage', 'title'), resArgs: undefined }
});
useOgImage();

const userAccountStore = useUserAccountStore();

const selectedTab = ref<ControlKey | undefined>();

const paymentsTabReady = ref(false);
const historyTabReady = ref(false);
const accountTabReady = ref(false);

const primaryEmail = computed(() => {
  return (
    userAccountStore.emails !== LOADING_STATE && 
    (userAccountStore.emails?.length ?? 0) > 0 && 
    (userAccountStore.emails![0]?.length ?? 0) > 0
  ) ? userAccountStore.emails![0] : undefined;
});

const CtrlKey = UserAccountPageCtrlKey;

const displayedFirstName = computed(() => (userAccountStore.name !== LOADING_STATE && (userAccountStore.name?.firstName?.trim().length ?? 0) > 0) ? userAccountStore.name!.firstName!.trim() : undefined);
const displayedLastName = computed(() => (userAccountStore.name !== LOADING_STATE && (userAccountStore.name?.lastName?.trim().length ?? 0) > 0) ? userAccountStore.name!.lastName!.trim() : undefined);

</script>

<template>
  <PageSection :ctrl-key="[...CtrlKey, 'PageSection']" :spaced="false">
    <ClientOnly>
      <div :class="LocatorClasses.UserAccountPage">
        <div class="w-full grid grid-rows-1 grid-cols-1 profile-images pb-[40px] sm:pb-[60px]">
          <div class="w-full h-auto z-[1] row-start-1 row-end-2 col-start-1 col-end-2">
            <UserCover :ctrl-key="[...CtrlKey, 'UserCover']" />
          </div>
          <div class="pointer-events-none w-full h-auto self-end z-[2] row-start-1 row-end-2 col-start-1 col-end-2 md:*:mx-auto">
            <AvatarBox :ctrl-key="[...CtrlKey, 'Avatar']" class="*:pointer-events-auto ml-2 sm:ml-6 md:ml-0 translate-y-[40px] sm:translate-y-[60px]" />
          </div>
        </div>
        <div class="w-full flex flex-col flex-nowrap items-center mt-4">
          <div class="w-full mt-4 sm:mt-6 flex-1 flex flex-row flex-wrap justify-center gap-2 text-2xl font-semibold *:flex-grow-0 *:flex-shrink *:basis-auto *:text-center *:text-nowrap *:text-ellipsis *:overflow-hidden">
            <div v-if="displayedFirstName">
              {{ displayedFirstName }}
            </div>
            <div v-if="displayedLastName">
              {{ displayedLastName }}
            </div>
          </div>
          <h1 v-if="primaryEmail" class="flex-1 w-full mt-1 flex-grow-0 flex-shrink basis-auto text-center text-nowrap text-ellipsis overflow-hidden text-gray-600 dark:text-gray-300">
            {{ primaryEmail }}
          </h1>
        </div>

        <section class="mx-auto px-2 pt-1 pb-4 mt-8">
          <TabsGroup
            v-model:active-tab-key="selectedTab"
            :ctrl-key="UserAccountTabGroup"
            :tabs="[
              { ctrlKey: UserAccountTabAccount, slotName: 'account', label: { resName: getI18nResName3('accountPage', 'tabAccount', 'title'), shortIcon: 'i-heroicons-user-20-solid' }, enabled: true, tabName: UserAccountTabAccount },
              { ctrlKey: UserAccountTabHistory, slotName: 'history', label: { resName: getI18nResName3('accountPage', 'tabHistory', 'title'), shortIcon: 'i-mdi-file-document' }, enabled: true, tabName: UserAccountTabHistory },
              { ctrlKey: UserAccountTabPayments, slotName: 'payments', label: { resName: getI18nResName3('accountPage', 'tabPayments', 'title'), shortIcon: 'i-mdi-credit-card' }, enabled: true, tabName: UserAccountTabPayments }
            ]"
            variant="split"
          >
            <template #account>
              <ComponentWaitingIndicator v-if="!accountTabReady" :ctrl-key="[...CtrlKey, 'Waiter']" />
              <div class="p-4 sm:p-6 rounded-xl bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-700 mt-2 sm:mt-4" :style="{ display: accountTabReady ? 'block' : 'none' }">
                <TabAccount  v-model:ready="accountTabReady" :ctrl-key="UserAccountTabAccount" />
              </div>
            </template>

            <template #history>
              <ComponentWaitingIndicator v-if="!historyTabReady" :ctrl-key="[...CtrlKey, 'Waiter']" />
              <div class="w-full h-auto mt-2 sm:mt-4" :style="{ display: historyTabReady ? 'block' : 'none' }">
                <TabHistory  v-model:ready="historyTabReady" :ctrl-key="UserAccountTabHistory" />
              </div>
            </template>

            <template #payments>
              <ComponentWaitingIndicator v-if="!paymentsTabReady" :ctrl-key="[...CtrlKey, 'Waiter']" />
              <div class="p-4 sm:p-6 rounded-xl bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-700 mt-2 sm:mt-4" :style="{ display: paymentsTabReady ? 'block' : 'none' }">
                <TabPayments v-model:ready="paymentsTabReady" :ctrl-key="UserAccountTabPayments" />
              </div>
            </template>
          </TabsGroup>
        </section>
      </div>
      <template #fallback>
        <ComponentWaitingIndicator :ctrl-key="[...CtrlKey, 'ClientFallback']" class="my-8 min-h-[calc(300px+10rem)]"/>
      </template>
    </ClientOnly>
  </PageSection>
</template>
