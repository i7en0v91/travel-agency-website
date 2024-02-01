<script setup lang="ts">

import ComponentWaiterIndicator from './../component-waiting-indicator.vue';
import { getI18nResName3 } from './../../shared/i18n';
import { UIControlKeys, TabIndicesUpdateDefaultTimeout } from './../../shared/constants';
import TabAccount from './tabs/tab-account.vue';
import TabHistory from './tabs/tab-history.vue';
import TabPayments from './tabs/tab-payments.vue';
import { updateTabIndices } from './../../shared/dom';

interface IProps {
  ctrlKey: string,
  activeOption?: string,
}
const props = withDefaults(defineProps<IProps>(), {
  activeOption: undefined
});

const { t } = useI18n();

const mounted = ref(false);

const paymentsTabReady = ref(false);
const historyTabReady = ref(false);
const accountTabReady = ref(false);
const tabReady = computed(() =>
  props.activeOption && (
    (props.activeOption === UIControlKeys.UserAccountOptionButtonPayments && paymentsTabReady.value) ||
    (props.activeOption === UIControlKeys.UserAccountOptionButtonHistory && historyTabReady.value) ||
    (props.activeOption === UIControlKeys.UserAccountOptionButtonAccount && accountTabReady.value)
  ));

const tabName = computed<string>(() => {
  if (!props.activeOption || !tabReady.value) {
    return '';
  }
  switch (props.activeOption) {
    case UIControlKeys.UserAccountOptionButtonPayments:
      return t(getI18nResName3('accountPage', 'tabPayments', 'title'));
    case UIControlKeys.UserAccountOptionButtonHistory:
      return t(getI18nResName3('accountPage', 'tabHistory', 'title'));
    default:
      return t(getI18nResName3('accountPage', 'tabAccount', 'title'));
  }
});
watch(tabName, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});
watch(tabReady, () => {
  setTimeout(() => updateTabIndices(), TabIndicesUpdateDefaultTimeout);
});

onMounted(() => {
  mounted.value = true;
});

</script>

<template>
  <div class="account-page-content">
    <ComponentWaiterIndicator v-if="!tabReady" ctrl-key="accountPageContentWaiter" class="account-page-waiting-indicator" />
    <div class="account-page-tab-div">
      <ClientOnly>
        <div class="account-page-tab" :style="{ display: tabReady ? 'block' : 'none' }">
          <h3 class="account-page-tab-name mb-xs-2 mb-s-3">
            {{ tabName }}
          </h3>
          <TabPayments v-if="props.activeOption === UIControlKeys.UserAccountOptionButtonPayments" v-model:ready="paymentsTabReady" ctrl-key="userAccountTabPayments" />
          <TabHistory v-else-if="props.activeOption === UIControlKeys.UserAccountOptionButtonHistory" v-model:ready="historyTabReady" ctrl-key="userAccountTabHistory" />
          <TabAccount v-else v-model:ready="accountTabReady" ctrl-key="userAccountTabAccount" />
        </div>
      </ClientOnly>
    </div>
  </div>
</template>
