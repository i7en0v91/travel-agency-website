<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { UserAccountTabAccount, UserAccountTabHistory, UserAccountTabPayments } from './../helpers/constants';
import AvatarBox from './../components/user-account/avatar-box.vue';
import UserCover from './../components/user-account/user-cover.vue';
import TabsGroup from '../components/forms/tabs-group.vue';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('accountPage', 'title'), resArgs: undefined }
});
useOgImage();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const selectedTab = ref<string | undefined>();

const paymentsTabReady = ref(false);
const historyTabReady = ref(false);
const accountTabReady = ref(false);

const tabReady = computed(() =>
  selectedTab.value && (
    (selectedTab.value === UserAccountTabPayments && paymentsTabReady.value) ||
    (selectedTab.value === UserAccountTabHistory && historyTabReady.value) ||
    (selectedTab.value === UserAccountTabAccount && accountTabReady.value)
  ));

const primaryEmail = computed(() => {
  return ((userAccount.emails?.length ?? 0) > 0 && (userAccount.emails![0]?.length ?? 0) > 0)
    ? userAccount.emails![0]
    : undefined;
});

</script>

<template>
  <ContentSection :spaced="false">
    <ClientOnly>
      <div class="user-account-page">
        <div class="w-full grid grid-rows-1 grid-cols-1 profile-images pb-[40px] sm:pb-[60px]">
          <div class="w-full h-auto z-[1] row-start-1 row-end-2 col-start-1 col-end-2">
            <UserCover ctrl-key="userCover" />
          </div>
          <div class="pointer-events-none w-full h-auto self-end z-[2] row-start-1 row-end-2 col-start-1 col-end-2 md:*:mx-auto">
            <AvatarBox ctrl-key="avatarBox" class="*:pointer-events-auto ml-2 sm:ml-6 md:ml-0 translate-y-[40px] sm:translate-y-[60px]" />
          </div>
        </div>
        <div class="w-full flex flex-col flex-nowrap items-center mt-4">
          <div class="w-full mt-4 sm:mt-6 flex-1 flex flex-row flex-wrap justify-center gap-2 text-2xl font-semibold *:flex-grow-0 *:flex-shrink *:basis-auto *:text-center *:text-nowrap *:text-ellipsis *:overflow-hidden">
            <div v-if="(userAccount.firstName?.trim().length ?? 0) > 0">
              {{ userAccount.firstName }}
            </div>
            <div v-if="(userAccount.lastName?.trim().length ?? 0) > 0">
              {{ userAccount.lastName }}
            </div>
          </div>
          <h1 v-if="primaryEmail" class="flex-1 w-full mt-1 flex-grow-0 flex-shrink basis-auto text-center text-nowrap text-ellipsis overflow-hidden text-gray-600 dark:text-gray-300">
            {{ primaryEmail }}
          </h1>
        </div>

        <section class="mx-auto px-2 pt-1 pb-4 mt-8">
          <TabsGroup
            v-model:activeTabKey="selectedTab"
            class="w-full block rounded-3xl bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-700 user-account-page-tabs-control"
            ctrl-key="UserAccount-TabControl"
            :tabs="[
              { ctrlKey: UserAccountTabAccount, labelResName: getI18nResName3('accountPage', 'tabAccount', 'title'), shortIcon: 'i-heroicons-user-20-solid', enabled: true, tabName: UserAccountTabAccount },
              { ctrlKey: UserAccountTabHistory, labelResName: getI18nResName3('accountPage', 'tabHistory', 'title'), shortIcon: 'i-mdi-file-document', enabled: false, tabName: UserAccountTabHistory },
              { ctrlKey: UserAccountTabPayments, labelResName: getI18nResName3('accountPage', 'tabPayments', 'title'), shortIcon: 'i-mdi-credit-card', enabled: false, tabName: UserAccountTabPayments }
            ]"
            :ui="{ compactTabs: false }"
          >
            <ComponentWaitingIndicator v-if="!tabReady" ctrl-key="accountPageContentWaiter" />
            <KeepAlive>  
              <div class="px-4 sm:px-6 pt-0 sm:pt-2 pb-4 account-page-tab" :style="{ display: tabReady ? 'block' : 'none' }">
                <TabPayments v-if="selectedTab === UserAccountTabPayments" v-model:ready="paymentsTabReady" ctrl-key="userAccountTabPayments" />
                <TabHistory v-else-if="selectedTab === UserAccountTabHistory" v-model:ready="historyTabReady" ctrl-key="userAccountTabHistory" />
                <TabAccount v-else v-model:ready="accountTabReady" ctrl-key="userAccountTabAccount" />
              </div>
            </KeepAlive>
          </TabsGroup>
        </section>
      </div>
      <template #fallback>
        <ComponentWaitingIndicator ctrl-key="AccountPageClientFallback" class="my-8 min-h-[calc(300px+10rem)]"/>
      </template>
    </ClientOnly>
  </ContentSection>
</template>
