<script setup lang="ts">
import { getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { UserAccountPageCtrlKey, UserAccountOptionButtonPayments, UserAccountOptionButtonHistory, UserAccountOptionButtonAccount, UserAccountOptionButtonGroup, UserAccountTabAccount, UserAccountTabHistory, UserAccountTabPayments } from './../helpers/constants';
import AvatarBox from './../components/user-account/avatar-box.vue';
import UserCover from './../components/user-account/user-cover.vue';
import OptionButtonGroup from './../components/option-buttons/option-button-group.vue';
import PageContent from './../components/user-account/page-content.vue';
import ComponentWaitingIndicator from './../components/component-waiting-indicator.vue';
import type { ControlKey } from './../helpers/components';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: { resName: getI18nResName2('accountPage', 'title'), resArgs: undefined }
});
useOgImage();

const userAccountStore = useUserAccountStore();
const userAccount = await userAccountStore.getUserAccount();

const accountTabHtmlId = useId();
const historyTabHtmlId = useId();
const paymentTabHtmlId = useId();

const primaryEmail = computed(() => {
  return ((userAccount.emails?.length ?? 0) > 0 && (userAccount.emails![0]?.length ?? 0) > 0)
    ? userAccount.emails![0]
    : undefined;
});

const CtrlKey = UserAccountPageCtrlKey;

const activeOptionCtrl = ref<ControlKey | undefined>();
</script>

<template>
  <ClientOnly>
    <div class="user-account-page no-hidden-parent-tabulation-check">
      <div class="profile-images">
        <UserCover :ctrl-key="[...CtrlKey, 'UserCover']" />
        <AvatarBox :ctrl-key="[...CtrlKey, 'Avatar']" class="ml-xs-2 ml-s-4 ml-m-0" />
      </div>
      <div class="user-account-contacts">
        <div class="user-name mt-xs-3 mt-s-4">
          <div v-if="(userAccount.firstName?.trim().length ?? 0) > 0" class="first-name">
            {{ userAccount.firstName }}
          </div>
          <div v-if="(userAccount.lastName?.trim().length ?? 0) > 0" class="last-name">
            {{ userAccount.lastName }}
          </div>
        </div>
        <h1 v-if="primaryEmail" class="user-email mt-xs-2">
          {{ primaryEmail }}
        </h1>
      </div>
      <OptionButtonGroup
        v-model:active-option-key="activeOptionCtrl"
        class="user-account-page-tabs-control mt-xs-5"
        :ctrl-key="UserAccountOptionButtonGroup"
        role="tablist"
        :options="[
          { ctrlKey: UserAccountOptionButtonAccount, labelResName: getI18nResName3('accountPage', 'tabAccount', 'title'), shortIcon: 'user', enabled: true, role: { role: 'tab', tabPanelId: accountTabHtmlId }, tabName: UserAccountTabAccount },
          { ctrlKey: UserAccountOptionButtonHistory, labelResName: getI18nResName3('accountPage', 'tabHistory', 'title'), shortIcon: 'history', enabled: true, role: { role: 'tab', tabPanelId: historyTabHtmlId }, tabName: UserAccountTabHistory },
          { ctrlKey: UserAccountOptionButtonPayments, labelResName: getI18nResName3('accountPage', 'tabPayments', 'title'), shortIcon: 'payments', enabled: true, role: { role: 'tab', tabPanelId: paymentTabHtmlId }, tabName: UserAccountTabPayments }
        ]"
      />
      <PageContent :ctrl-key="[...CtrlKey, 'PageContent']" :active-option="activeOptionCtrl" :tab-panel-ids="{ payments: paymentTabHtmlId, account: accountTabHtmlId, history: historyTabHtmlId }" />
    </div>
    <template #fallback>
      <ComponentWaitingIndicator :ctrl-key="[...CtrlKey, 'ClientFallback']" class="my-xs-5"/>
    </template>
  </ClientOnly>
</template>
