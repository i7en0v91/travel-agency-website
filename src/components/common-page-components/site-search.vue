<script setup lang="ts">
import { type Locale, type AppPage, getI18nResName2, UserNotificationLevel, extractSurroundingText, type EntityId, getI18nResName3, lookupPageByUrl, getLocaleFromUrl, type I18nResName, SystemPage } from '@golobe-demo/shared';
import { getCommonServices } from '../../helpers/service-accessors';
import { useDeviceSize } from '../../composables/device-size';
import { SiteSearchMaxMatchLength } from '../../helpers/constants';
import MiniSearch from 'minisearch';
import isString from 'lodash-es/isString';
import flatten from 'lodash-es/flatten';
import groupBy from 'lodash-es/groupBy';
import values from 'lodash-es/values';
import keys from 'lodash-es/keys';
import type { UInput } from '../../.nuxt/components';
import uniqBy from 'lodash-es/uniqBy';
import { type ComponentInstance } from 'vue';
import { parseURL, withFragment } from 'ufo';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();
const $emit = defineEmits(['close']);

const inputRef = shallowRef<ComponentInstance<typeof UInput> | undefined>();

const PageLinksDisplayParams: { [P in keyof typeof AppPage]: { icon: string, titleResName: I18nResName } } = {
  Account: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('accountPage', 'title') },
  BookFlight: { icon: 'i-material-symbols-flight', titleResName: getI18nResName2('flightBookingPage', 'title') },
  BookStay: { icon: 'i-material-symbols-bed', titleResName: getI18nResName2('stayBookingPage', 'title') },
  BookingDetails: { icon: 'i-mdi-file-document', titleResName: getI18nResName2('bookingPage', 'pageTitle') },
  EmailVerifyComplete: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('emailVerifyCompletePage', 'title') },
  Favourites: { icon: 'i-heroicons-heart-solid', titleResName: getI18nResName2('favouritesPage', 'title') },
  FindFlights: { icon: 'i-material-symbols-flight', titleResName: getI18nResName2('flightsPage', 'title') },
  FindStays: { icon: 'i-material-symbols-bed', titleResName: getI18nResName2('staysPage', 'title') },
  FlightDetails: { icon: 'i-material-symbols-flight', titleResName: getI18nResName2('flightDetailsPage', 'title') },
  Flights: { icon: 'i-material-symbols-flight', titleResName: getI18nResName2('flightsPage', 'title') },
  ForgotPassword: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('forgotPasswordPage', 'title') },
  ForgotPasswordComplete: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('forgotPasswordCompletePage', 'title') },
  ForgotPasswordSet: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('forgotPasswordSetPage', 'title') },
  ForgotPasswordVerify: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('forgotPasswordVerifyPage', 'title') },
  Index: { icon: 'i-mdi-file-document', titleResName: getI18nResName2('indexPage', 'title') },
  Login: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('loginPage', 'title') },
  Privacy: { icon: 'i-mdi-file-document', titleResName: getI18nResName2('privacyPage', 'title') },
  Signup: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('signUpPage', 'title') },
  SignupComplete: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('signUpCompletePage', 'title') },
  SignupVerify: { icon: 'i-heroicons-user-20-solid', titleResName: getI18nResName2('signUpVerifyPage', 'title') },
  StayDetails: { icon: 'i-material-symbols-bed', titleResName: getI18nResName2('stayDetailsPage', 'title') },
  Stays: { icon: 'i-material-symbols-bed', titleResName: getI18nResName2('staysPage', 'title') }
};

type SearchResultItem = Awaited<ReturnType<typeof searchContent>>['value'] extends Array<infer TItem> ? TItem : never;
type ParsedSearchItem = {
  idx: number,
  score: number,
  text: {
    before: string,
    mark: string,
    after: string
  },
  link: {
    page: AppPage,
    id: EntityId | undefined,
    url: string
  }
};

const { current: deviceSize } = useDeviceSize();
const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

const searchUserInput = ref<string>('');
const searchTerm = computed(() => {
  return (searchUserInput.value?.trim()?.length > 0) ? searchUserInput.value : MiniSearch.wildcard;
});
const searchResultsRef = await searchContent(searchTerm);

const searchResultsContextLength = computed(() => {
  return SiteSearchMaxMatchLength[deviceSize.value];
});

const matchedPages = computed<ParsedSearchItem[]>(() => {
  const searchResponse = searchResultsRef.value;
  logger.debug(`(SiteSearch) updating search result items list, itemsCount=${searchResultsRef.value?.length ?? 0}, searchTerm=[${searchUserInput.value}]`);

  const currentLocale = locale.value as Locale;
  const resultsForCurrentLocale = searchResponse.filter(r => getLocaleFromUrl(r.id) === currentLocale);

  if(searchTerm.value === MiniSearch.wildcard) {
    return uniqBy(resultsForCurrentLocale, i => lookupPageByUrl(i.id)).map(i => {
      const page = lookupPageByUrl(i.id);
      if(!page) {
        logger.warn(`(SiteSearch) failed to detect result item page for wildcard search, id=${i.id}`);
        return undefined;
      }

      if(page === SystemPage.Drafts) {
        return undefined;
      }

      return {
        idx: 0,
        score: i.score,
        link: {
          page: lookupPageByUrl(i.id),
          id: undefined,
          url: navLinkBuilder.buildPageLink(page, locale.value as Locale)
        },
        text: {
          before: i['content'].substring(0, searchResultsContextLength.value),
          mark: '',
          after: ''        
        }
      } as ParsedSearchItem;
    }).filter(i => !!i);
  }

  const parsedResults = flatten(resultsForCurrentLocale.map(formatSearchResultItem));
  return values(groupBy(parsedResults, i => i.link.url)).map((g) => {
    g.sort((a, b) => b.score - a.score);
    return g[0];
  });
});

const logger = getCommonServices().getLogger();
const userNotificationStore = useUserNotificationStore();

function formatSearchResultItem(resultItem: SearchResultItem): ParsedSearchItem[] {
  try {
    logger.debug(`(SiteSearch) parsing search result item, id=${resultItem.id}, score=${resultItem.score}, terms=[${resultItem.terms.join(', ')}], matches=[${keys(resultItem.match).join(',')}]`);
    const page = lookupPageByUrl(resultItem.id);
    if(!page || page === SystemPage.Drafts) {
      logger.debug(`(SiteSearch) matched non-app page, id=${resultItem.id}, score=${resultItem.score}, term=${t}, id=${resultItem.id}`);
      return [];
    }

    const maxMatchLenght = searchResultsContextLength.value;
    const parsed = resultItem.terms.map((t, idx) => {
      const textFieldNames = resultItem.match[t].filter(f => ['title', 'content'].includes(f));
      if(!textFieldNames.length) {
        logger.debug(`(SiteSearch) matched fields array does not contain expected field names, id=${resultItem.id}, score=${resultItem.score}, term=${t}, fieldNames=${[resultItem.match[t].join(', ')]}`);
        return undefined;
      }

      const textFieldName = textFieldNames[0];
      const matchedFieldText = resultItem[textFieldName];
      let matchedTerm = t;
      matchedTerm = matchedTerm.length > maxMatchLenght ? matchedTerm.substring(0, maxMatchLenght) : matchedTerm;

      let phrase: { text: string, phraseIdx: number } | undefined;
      try {
        if(isString(matchedFieldText) && matchedFieldText.trim().length) {
          logger.debug(`(SiteSearch) extracting surrounding text, id=${resultItem.id}, field=${textFieldName}, matchedTerm=${matchedTerm}, fieldTextLength=${matchedFieldText.length}`);
          phrase = extractSurroundingText(matchedFieldText, matchedTerm, maxMatchLenght);
        }

        if(!phrase?.text.length) {
          logger.warn(`(SiteSearch) failed to extract surrounding text, id=${resultItem.id}, field=${textFieldName}, matchedTerm=${matchedTerm}, fieldTextLength=${matchedFieldText.length}`);
          return undefined;
        }
        logger.debug(`(SiteSearch) surrounding text extracted, id=${resultItem.id}, field=${textFieldName}, matchedTerm=${matchedTerm}, fieldTextLength=${matchedFieldText.length}, result=[${phrase.text}]`);
      } catch(err: any) {
        logger.warn(`(SiteSearch) exception occured while extracting surrounding text, id=${resultItem.id}, field=${textFieldName}, matchedTerm=${matchedTerm}, fieldTextLength=${matchedFieldText.length}`, err);
        return undefined;
      }

      const befores = phrase.text.substring(0, phrase.phraseIdx).split('.');
      
      return {
        idx,
        score: resultItem.score,
        link: {
          page,
          id: undefined,
          url: withFragment(
            navLinkBuilder.buildPageLink(page, locale.value as Locale), 
            (parseURL(resultItem.id).hash ?? '').replace('#', '')
          )
        },
        text: {
          before: befores.length > 1 ? befores[befores.length - 1] : befores[0],
          mark: matchedTerm,
          after: phrase.text.substring(phrase.phraseIdx + matchedTerm.length)
        }
      } as ParsedSearchItem;
    }).filter(i => !!i);
    logger.debug(`(SiteSearch) search result item parsed, id=${resultItem.id}, score=${resultItem.score}, terms=[${resultItem.terms.join(', ')}]`, parsed);
    return parsed;
  } catch(err: any) {
    logger.warn('(SiteSearch) exception occured while parsing search result item', err, resultItem);
    userNotificationStore.show({
      level: UserNotificationLevel.ERROR,
      resName: getI18nResName2('appErrors', 'unknown')
    });
    return [];
  }
}

onMounted(() => {
  logger.debug('(SiteSearch) mounted');
  inputRef.value.$el?.querySelector('input')?.focus();
});

onUnmounted(() => {
  logger.debug('(SiteSearch) unmounted');
});

</script>

<template>
  <div :class="`flex flex-col flex-nowrap bg-white dark:bg-gray-900 rounded-md w-full h-full`">
    <div class="block w-full flex-initial">
      <UInput 
        ref="inputRef"
        v-model.trim="searchUserInput" 
        :max-length="SiteSearchMaxMatchLength.XXL" 
        :ui="{ wrapper: 'sm:ml-2 pr-2 sm:pr-4' }" 
        :placeholder="$t(getI18nResName3('nav', 'search', 'placeholder'))" 
        variant="none">
        <template #leading>
          <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5"/>
        </template>

        <template #trailing>
          <UButton
            variant="ghost" 
            color="gray"
            size="sm" 
            square 
            class="*:w-5 *:h-5 sm:mr-2 pointer-events-auto"
            icon="i-mdi-close"
            :aria-label="$t(getI18nResName2('ariaLabels', 'btnClose'))"
            @click="$emit('close')"
          />
        </template>
      </UInput>
      <UDivider color="gray" orientation="horizontal" size="sm"/>
    </div>
    <ol v-if="matchedPages.length" class="block flex-grow-0 flex-shrink-1 basis-auto w-full h-auto overflow-y-auto space-y-2 p-2">
      <li v-for="(item) in matchedPages" :key="`search-item-${item.idx}-${item.link.url}-${item.text.mark}-${item.score}`">
        <ULink class="w-full h-auto flex flex-row flex-nowrap gap-2 items-center text-sm sm:text-base" :to="item.link.url" :external="false" @click="$emit('close')">
          <UIcon :name="PageLinksDisplayParams[item.link.page].icon" color="gray" class="w-5 h-5 bg-primary-300 dark:bg-gray-600 flex-grow flex-shrink-0 basis-auto"/>
          <div class="flex-grow flex-shrink-0 basis-auto w-min text-nowrap text-black dark:text-white font-semibold">{{ $t(PageLinksDisplayParams[item.link.page].titleResName) }}</div>
          <div class="flex-grow flex-shrink basis-auto w-full truncate text-gray-500 dark:text-gray-400">{{ item.text.before }}<mark>{{ item.text.mark }}</mark>{{ item.text.after }}</div>
        </ULink>
      </li>
    </ol>
    <div v-else class="w-full h-auto mt-2 px-2 text-gray-500 dark:text-gray-400 text-wrap text-center text-sm sm:text-base">{{  $t(getI18nResName3('nav', 'search', 'noResults')) }}</div>
  </div>
</template>
