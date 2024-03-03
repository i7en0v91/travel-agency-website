<script setup lang="ts">

import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import AvatarBox from './../components/user-account/avatar-box.vue';
import UserCover from './../components/user-account/user-cover.vue';
import OptionButtonGroup from './../components/option-buttons/option-button-group.vue';
import PageContent from './../components/user-account/page-content.vue';
import { UIControlKeys } from './../shared/constants';

definePageMeta({
  middleware: 'auth',
  auth: true,
  title: getI18nResName2('accountPage', 'title')
});

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

const activeOptionCtrl = ref<string | undefined>();
</script>

<template>
  <div class="user-account-page no-hidden-parent-tabulation-check">
    <div class="profile-images">
      <UserCover ctrl-key="userCover" />
      <AvatarBox ctrl-key="avatarBox" class="ml-xs-2 ml-s-4 ml-m-0" />
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
      <div v-if="primaryEmail" class="user-email mt-xs-2">
        {{ primaryEmail }}
      </div>
    </div>
    <OptionButtonGroup
      v-model:active-option-ctrl="activeOptionCtrl"
      class="user-account-page-tabs-control mt-xs-5"
      ctrl-key="accountOptionButtonsGroup"
      role="tablist"
      :options="[
        { ctrlKey: UIControlKeys.UserAccountOptionButtonAccount, labelResName: getI18nResName3('accountPage', 'tabAccount', 'title'), shortIcon: 'user', enabled: true, role: { role: 'tab', tabPanelId: accountTabHtmlId } },
        { ctrlKey: UIControlKeys.UserAccountOptionButtonHistory, labelResName: getI18nResName3('accountPage', 'tabHistory', 'title'), shortIcon: 'history', enabled: true, role: { role: 'tab', tabPanelId: historyTabHtmlId } },
        { ctrlKey: UIControlKeys.UserAccountOptionButtonPayments, labelResName: getI18nResName3('accountPage', 'tabPayments', 'title'), shortIcon: 'payments', enabled: true, role: { role: 'tab', tabPanelId: paymentTabHtmlId } }
      ]"
    />
    <PageContent ctrl-key="accountPageContent" :active-option="activeOptionCtrl" :tab-panel-ids="{ payments: paymentTabHtmlId, account: accountTabHtmlId, history: historyTabHtmlId }" />
  </div>
</template>
