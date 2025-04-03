<script setup lang="ts">
import type { ControlKey } from './../../../helpers/components';
import { AppPage, getPagePath, type Locale, getI18nResName3, type EntityId, type IStayOffer, type IFlightOffer, type EntityDataAttrsOnly, isElectronBuild } from '@golobe-demo/shared';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import { getCommonServices } from '../../../helpers/service-accessors';
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

const documentDownloader = import.meta.client ? useDocumentDownloader() : undefined;

const userAccountStore = useUserAccountStore();

async function onBtnClick(): Promise<void> {
  logger.verbose('download btn clicked', { ctrlKey, bookingId });

  const firstName = ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? userAccountStore.name.firstName : undefined) ?? undefined;
  const lastName = ((userAccountStore.name && userAccountStore.name !== LOADING_STATE) ? userAccountStore.name.lastName : undefined) ?? undefined;
  await documentDownloader!.download(bookingId, offer, firstName, lastName, locale.value as Locale, theme.currentTheme.value);
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
          :ctrl-key="[...ctrlKey, 'Btn', 'Download']"
          class="ticket-card-button-download"
          :label-res-name="getI18nResName3('accountPage', 'tabHistory', 'btnDownload')"
          @click="onBtnClick"
        />
        <NuxtLink class="ticket-card-booking-link btn btn-icon icon-nav-link btn-support brdr-1 tabbable" :to="navLinkBuilder.buildLink(`/${getPagePath(AppPage.BookingDetails)}/${bookingId}`, locale as Locale)" :target="isElectronBuild() ? '_blank' : undefined"/>
      </div>
    </div>
  </article>
</template>
