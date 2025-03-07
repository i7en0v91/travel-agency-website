<script setup lang="ts">
import { areCtrlKeysEqual, type ControlKey } from './../../helpers/components';
import { TabIndicesUpdateDefaultTimeout, updateTabIndices } from './../../helpers/dom';
import { UserAccountOptionButtonAccount, UserAccountOptionButtonHistory, UserAccountOptionButtonPayments } from './../../helpers/constants';
import ComponentWaitingIndicator from './../component-waiting-indicator.vue';
import TabAccount from './tabs/tab-account.vue';
import TabHistory from './tabs/tab-history.vue';
import TabPayments from './tabs/tab-payments.vue';

interface IProps {
  ctrlKey: ControlKey,
  activeOption?: ControlKey,
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
    (areCtrlKeysEqual(activeOption, UserAccountOptionButtonPayments) && paymentsTabReady.value) ||
    (areCtrlKeysEqual(activeOption, UserAccountOptionButtonHistory) && historyTabReady.value) ||
    (areCtrlKeysEqual(activeOption, UserAccountOptionButtonAccount) && accountTabReady.value)
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
    <ComponentWaitingIndicator v-if="!tabReady" :ctrl-key="[...ctrlKey, 'Waiter']" class="account-page-waiting-indicator" />
    <ClientOnly>
      <div class="account-page-tab" :style="{ display: tabReady ? 'block' : 'none' }">
        <KeepAlive>
          <TabPayments v-if="activeOption && areCtrlKeysEqual(activeOption, UserAccountOptionButtonPayments)" :id="tabPanelIds.payments" v-model:ready="paymentsTabReady" :ctrl-key="[...ctrlKey, 'Payments', 'Tab']" />
          <TabHistory v-else-if="activeOption && areCtrlKeysEqual(activeOption, UserAccountOptionButtonHistory)" :id="tabPanelIds.history" v-model:ready="historyTabReady" :ctrl-key="[...ctrlKey, 'History', 'Tab']" />
          <TabAccount v-else :id="tabPanelIds.account" v-model:ready="accountTabReady" :ctrl-key="[...ctrlKey, 'Account', 'Tab']" />
        </KeepAlive>
      </div>
    </ClientOnly>
  </section>
</template>
