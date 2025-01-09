<script setup lang="ts">
import { AppPage, getPagePath, type Locale, getI18nResName2, getI18nResName3, type EntityId, type IStayOffer, type IFlightOffer, type EntityDataAttrsOnly, isElectronBuild } from '@golobe-demo/shared';
import { getCommonServices } from '../../../helpers/service-accessors';
import type ModalWaitingIndicator from '../../forms/modal-waiting-indicator.vue';
import { useDocumentDownloader, type IDocumentDownloader } from './../../../composables/document-downloader';
import { useModalWaiter, type IModalWaiter } from './../../../composables/modal-waiter';
import { type ComponentInstance } from 'vue';

interface IProps {
  ctrlKey: string,
  bookingId: EntityId,
  offer: EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>
};
const props = defineProps<IProps>();

const logger = getCommonServices().getLogger();
const navLinkBuilder = useNavLinkBuilder();

const { locale } = useI18n();
const theme = useThemeSettings();

const isError = ref(false);

const modalWaiterRef = shallowRef<ComponentInstance<typeof ModalWaitingIndicator>>() as Ref<ComponentInstance<typeof ModalWaitingIndicator>>;
const modalWaiterOpen = ref<boolean>(false);
let modalWaiter: IModalWaiter | undefined;
let documentDownloader: IDocumentDownloader | undefined;

const userAccountStore = useUserAccountStore();

async function onBtnClick(): Promise<void> {
  logger.verbose(`(TicketCardContainer) download btn clicked, ctrlKey=${props.ctrlKey}, bookingId=${props.bookingId}`);

  let firstName: string | undefined;
  let lastName: string | undefined;
  try {
    const userAccount = await userAccountStore.getUserAccount();
    firstName = userAccount.firstName;
    lastName = userAccount.lastName;
  } catch (err: any) {
    logger.warn(`(TicketCardContainer) failed to initialize user account info, ctrlKey=${props.ctrlKey}`, err);
  }

  await documentDownloader!.download(props.bookingId, props.offer, firstName, lastName, locale.value as Locale, theme.currentTheme.value);
}

onMounted(() => {
  modalWaiter = useModalWaiter(modalWaiterRef, modalWaiterOpen);
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
    <ModalWaitingIndicator ref="modalWaiterRef" v-model:open="modalWaiterOpen" :ctrl-key="`${props.ctrlKey}-Waiter`" :label-res-name="getI18nResName2('bookingCommon', 'generatingDoc')"/>
  </article>
</template>
