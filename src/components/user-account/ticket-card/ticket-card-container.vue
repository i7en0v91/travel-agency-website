<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppPage, getPagePath, type Locale, getI18nResName2, getI18nResName3, type EntityId, type IStayOffer, type IFlightOffer, type EntityDataAttrsOnly, isElectronBuild } from '@golobe-demo/shared';
import { getCommonServices } from '../../../helpers/service-accessors';
import type ModalWaitingIndicator from '../../forms/modal-waiting-indicator.vue';
import { useDocumentDownloader, type IDocumentDownloader } from './../../../composables/document-downloader';
import { useModalWaiter, type IModalWaiter } from './../../../composables/modal-waiter';
import { LOADING_STATE } from '../../../helpers/constants';

interface IProps {
  ctrlKey: ControlKey,
  bookingId: EntityId,
  offer: EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>
};
const { ctrlKey, bookingId, offer } = defineProps<IProps>();

const logger = getCommonServices().getLogger().addContextProps({ component: 'TicketCardContainer' });
const navLinkBuilder = useNavLinkBuilder();

const { locale } = useI18n();
const theme = useThemeSettings();

const isError = ref(false);

const modalWaiterRef = useTemplateRef('modal-waiter');
const modalWaiterOpen = ref<boolean>(false);
let modalWaiter: IModalWaiter | undefined;
let documentDownloader: IDocumentDownloader | undefined;

const userAccountStore = useUserAccountStore();

async function onBtnClick(): Promise<void> {
  logger.verbose('download btn clicked', { ctrlKey, bookingId });

  const firstName = ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? userAccountStore.name.firstName : undefined) ?? undefined;
  const lastName = ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? userAccountStore.name.lastName : undefined) ?? undefined;
  await documentDownloader!.download(bookingId, offer, firstName, lastName, locale.value as Locale, theme.currentTheme.value);
}

onMounted(() => {
  modalWaiter = useModalWaiter(modalWaiterRef as any, modalWaiterOpen);
  documentDownloader = useDocumentDownloader(modalWaiter);
});

</script>

<template>
  <article class="w-full h-auto p-4 sm:p-6 lg:py-8 grid grid-rows-userticketxs grid-cols-userticketxs lg:grid-rows-userticketlg lg:grid-cols-userticketlg gap-4 lg:gap-8 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-gray-700">
    <div class="w-full h-auto row-start-1 row-end-2 col-start-1 col-end-2 overflow-x-auto pb-4 lg:pb-0">
      <ErrorHelm v-model:is-error="isError">
        <slot class="w-auto h-auto" />
      </ErrorHelm>
    </div>
    <div class="w-full overflow-hidden h-full lg:w-fit lg:pl-8 lg:mt-6 row-start-2 row-end-3 col-start-1 col-end-2 lg:row-start-1 lg:row-end-2 lg:col-start-2 lg:col-end-3">
      <div class="w-full h-auto flex flex-row flex-nowrap gap-4">
        <UButton size="lg" class="w-fit flex-1" :ui="{ base: 'justify-center text-center' }" variant="solid" color="primary" @click="onBtnClick">
          <span class="overflow-hidden line-clamp-1 text-wrap text-start">{{ $t(getI18nResName3('accountPage', 'tabHistory', 'btnDownload')) }}</span>
        </UButton>
        <UButton size="lg" class="w-min flex-initial" icon="i-heroicons-chevron-right-20-solid" :ui="{ base: 'justify-center' }" variant="outline" color="gray" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookingDetails)}/${bookingId}`, locale as Locale)" :external="false"  :target="isElectronBuild() ? '_blank' : undefined"/>
      </div>
    </div>
    <ModalWaitingIndicator ref="modal-waiter" v-model:open="modalWaiterOpen" :ctrl-key="[...ctrlKey, 'Waiter']" :label-res-name="getI18nResName2('bookingCommon', 'generatingDoc')"/>
  </article>
</template>
