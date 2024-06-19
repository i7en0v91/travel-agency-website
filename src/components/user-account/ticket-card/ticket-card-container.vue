<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { type EntityId, type IStayOffer, type IFlightOffer, type EntityDataAttrsOnly } from './../../../shared/interfaces';
import { getI18nResName3 } from './../../../shared/i18n';
import { type Locale } from './../../../shared/constants';
import { HtmlPage, getHtmlPagePath } from './../../../shared/page-query-params';

interface IProps {
  ctrlKey: string,
  bookingId: EntityId,
  offer: EntityDataAttrsOnly<IFlightOffer> | EntityDataAttrsOnly<IStayOffer>
};
const props = defineProps<IProps>();

const logger = CommonServicesLocator.getLogger();
const localePath = useLocalePath();

const { locale } = useI18n();
const theme = useThemeSettings();

const documentDownloader = import.meta.client ? useDocumentDownloader() : undefined;

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

</script>

<template>
  <article class="ticket-card-container px-xs-3 py-xs-3 py-s-4 px-s-4 py-l-5 py-l-5">
    <div class="ticket-card-slot">
      <PerfectScrollbar
        :options="{
          suppressScrollY: true,
          wheelPropagation: true
        }"
        :watch-options="false"
        class="pb-xs-3 pb-l-0"
        tag="div"
      >
        <slot name="ticket-card" />
      </PerfectScrollbar>
    </div>
    <div class="ticket-card-buttons-div mt-l-4">
      <div class="ticket-card-buttons">
        <SimpleButton
          kind="default"
          :ctrl-key="`${ctrlKey}-BtnDownload`"
          class="ticket-card-button-download"
          :label-res-name="getI18nResName3('accountPage', 'tabHistory', 'btnDownload')"
          @click="onBtnClick"
        />
        <NuxtLink class="ticket-card-booking-link btn btn-icon icon-nav-link btn-support brdr-1 tabbable" :to="localePath(`/${getHtmlPagePath(HtmlPage.BookingDetails)}/${bookingId}`)"/>
      </div>
    </div>
  </article>
</template>
