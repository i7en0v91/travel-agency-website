<script setup lang="ts">
import { UserAccountTabAccount, UserAccountTabHistory, UserAccountTabPayments } from './../../helpers/constants';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import TabAccount from './tabs/tab-account.vue';
import TabHistory from './tabs/tab-history.vue';
import TabPayments from './tabs/tab-payments.vue';

interface IProps {
  ctrlKey: string,
  activeTab?: string,
  tabPanelIds: {
    account: string,
    history: string,
    payments: string
  }
}
const props = withDefaults(defineProps<IProps>(), {
  activeTab: undefined
});

const paymentsTabReady = ref(false);
const historyTabReady = ref(false);
const accountTabReady = ref(false);
const tabReady = computed(() =>
  props.activeTab && (
    (props.activeTab === UserAccountTabPayments && paymentsTabReady.value) ||
    (props.activeTab === UserAccountTabHistory && historyTabReady.value) ||
    (props.activeTab === UserAccountTabAccount && accountTabReady.value)
  ));

</script>

<template>
  <section class="account-page-content">
    <ComponentWaitingIndicator v-if="!tabReady" ctrl-key="accountPageContentWaiter" class="account-page-waiting-indicator" />
    <ClientOnly>
      <div class="account-page-tab" :style="{ display: tabReady ? 'block' : 'none' }">
        <KeepAlive>
          <TabPayments v-if="props.activeTab === UserAccountTabPayments" :id="tabPanelIds.payments" v-model:ready="paymentsTabReady" ctrl-key="userAccountTabPayments" />
          <TabHistory v-else-if="props.activeTab === UserAccountTabHistory" :id="tabPanelIds.history" v-model:ready="historyTabReady" ctrl-key="userAccountTabHistory" />
          <TabAccount v-else :id="tabPanelIds.account" v-model:ready="accountTabReady" ctrl-key="userAccountTabAccount" />
        </KeepAlive>
      </div>
    </ClientOnly>
  </section>
</template>
