<script setup lang="ts">
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';
import { UserAccountOptionButtonAccount, UserAccountOptionButtonHistory, UserAccountOptionButtonPayments } from './../../helpers/constants';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import TabAccount from './tabs/tab-account.vue';
import TabHistory from './tabs/tab-history.vue';
import TabPayments from './tabs/tab-payments.vue';

interface IProps {
  ctrlKey: string,
  activeOption?: string,
  tabPanelIds: {
    account: string,
    history: string,
    payments: string
  }
}
const { activeOption } = defineProps<IProps>();

const paymentsTabReady = ref(false);
const historyTabReady = ref(false);
const accountTabReady = ref(false);
const tabReady = computed(() =>
  activeOption && (
    (activeOption === UserAccountOptionButtonPayments && paymentsTabReady.value) ||
    (activeOption === UserAccountOptionButtonHistory && historyTabReady.value) ||
    (activeOption === UserAccountOptionButtonAccount && accountTabReady.value)
  ));

watch(() => activeOption, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});
watch(tabReady, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});

</script>

<template>
  <section class="account-page-content">
    <ComponentWaitingIndicator v-if="!tabReady" ctrl-key="accountPageContentWaiter" class="account-page-waiting-indicator" />
    <ClientOnly>
      <div class="account-page-tab" :style="{ display: tabReady ? 'block' : 'none' }">
        <KeepAlive>
          <TabPayments v-if="activeOption === UserAccountOptionButtonPayments" :id="tabPanelIds.payments" v-model:ready="paymentsTabReady" ctrl-key="userAccountTabPayments" />
          <TabHistory v-else-if="activeOption === UserAccountOptionButtonHistory" :id="tabPanelIds.history" v-model:ready="historyTabReady" ctrl-key="userAccountTabHistory" />
          <TabAccount v-else :id="tabPanelIds.account" v-model:ready="accountTabReady" ctrl-key="userAccountTabAccount" />
        </KeepAlive>
      </div>
    </ClientOnly>
  </section>
</template>
