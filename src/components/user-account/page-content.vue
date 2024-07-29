<script setup lang="ts">

import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import { UserAccountOptionButtonAccount, UserAccountOptionButtonHistory, UserAccountOptionButtonPayments, TabIndicesUpdateDefaultTimeout } from './../../shared/constants';
import TabAccount from './tabs/tab-account.vue';
import TabHistory from './tabs/tab-history.vue';
import TabPayments from './tabs/tab-payments.vue';
import { updateTabIndices } from './../../shared/dom';

interface IProps {
  ctrlKey: string,
  activeOption?: string,
  tabPanelIds: {
    account: string,
    history: string,
    payments: string
  }
}
const props = withDefaults(defineProps<IProps>(), {
  activeOption: undefined
});

const paymentsTabReady = ref(false);
const historyTabReady = ref(false);
const accountTabReady = ref(false);
const tabReady = computed(() =>
  props.activeOption && (
    (props.activeOption === UserAccountOptionButtonPayments && paymentsTabReady.value) ||
    (props.activeOption === UserAccountOptionButtonHistory && historyTabReady.value) ||
    (props.activeOption === UserAccountOptionButtonAccount && accountTabReady.value)
  ));

watch(() => props.activeOption, () => {
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
          <TabPayments v-if="props.activeOption === UserAccountOptionButtonPayments" :id="tabPanelIds.payments" v-model:ready="paymentsTabReady" ctrl-key="userAccountTabPayments" />
          <TabHistory v-else-if="props.activeOption === UserAccountOptionButtonHistory" :id="tabPanelIds.history" v-model:ready="historyTabReady" ctrl-key="userAccountTabHistory" />
          <TabAccount v-else :id="tabPanelIds.account" v-model:ready="accountTabReady" ctrl-key="userAccountTabAccount" />
        </KeepAlive>
      </div>
    </ClientOnly>
  </section>
</template>
