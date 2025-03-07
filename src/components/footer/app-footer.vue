<script setup lang="ts">
import type { ArbitraryControlElementMarker, ControlKey } from './../../helpers/components';
import { type Locale, AppPage, AppConfig, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import SubscribeBox from './subscribe-box.vue';
import AppFooterItem from './app-footer-item.vue';
import AppFooterSocialLink from './app-footer-social-link.vue';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: ControlKey,
  hardLinks: boolean
}
defineProps<IProps>();

const { t, locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>
<template>
  <footer class="app-footer">
    <div class="app-footer-div">
      <SubscribeBox :ctrl-key="[...ctrlKey, 'SubscribeBox']" />
      <section class="app-footer-content">
        <section class="footer-section footer-section-main mb-xs-4">
          <NuxtLink class="footer-app-logo tabbable tabbable-group-footer-main-section brdr-1" :to="navLinkBuilder.buildPageLink(AppPage.Index, locale as Locale)" :aria-label="$t(getI18nResName2('ariaLabels', 'imgLinkMainPage'))" :external="hardLinks"/>
          <ol class="footer-social-links-list mt-xs-3 mt-m-4">
            <AppFooterSocialLink :ctrl-key="[...ctrlKey, 'SocialLink', 'Twitter']" icon="twitter" url="https://x.com" :aria-label-res-name="getI18nResName2('ariaLabels', 'footerSocialLinkTwitter')" />
            <AppFooterSocialLink :ctrl-key="[...ctrlKey, 'SocialLink', 'YouTube']" icon="youtube" url="https://www.youtube.com" :aria-label-res-name="getI18nResName2('ariaLabels', 'footerSocialLinkYoutube')" />
          </ol>
        </section>
        <nav id="nav-footer" :aria-label="t(getI18nResName2('ariaLabels', 'navFooter'))" class="app-footer-grid">
          <section class="footer-section footer-section-destination">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'destinations', 'title')) }}
                </h3>
              </li>
              <AppFooterItem :ctrl-key="[...ctrlKey, 'DestinationLink', 'Canada' as ArbitraryControlElementMarker]" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'canada')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'DestinationLink', 'Alaska' as ArbitraryControlElementMarker]" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'alaska')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'DestinationLink', 'France' as ArbitraryControlElementMarker]" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'france')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'DestinationLink', 'Iceland' as ArbitraryControlElementMarker]" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'iceland')" />
            </ol>
          </section>
          <section class="footer-section footer-section-activities">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'activities', 'title')) }}
                </h3>
              </li>
              <AppFooterItem :ctrl-key="[...ctrlKey, 'ActivitiesLink', 'NorthernLights' as ArbitraryControlElementMarker]" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'northernLights')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'ActivitiesLink', 'CruisingSailing' as ArbitraryControlElementMarker]" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'cruisingSailing')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'ActivitiesLink', 'ActivitiesMulti' as ArbitraryControlElementMarker]" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'multiactivities')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'ActivitiesLink', 'ActivitiesKayaking' as ArbitraryControlElementMarker]" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'kayaking')" />
            </ol>
          </section>
          <section class="footer-section footer-section-blogs">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'travelBlogs', 'title')) }}
                </h3>
              </li>
              <AppFooterItem :ctrl-key="[...ctrlKey, 'TravelBlogs', 'Bali' as ArbitraryControlElementMarker]" section-key="footerTravelBlogs" :label-res-name="getI18nResName3('footer', 'travelBlogs', 'bali')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'TravelBlogs', 'SriLanka' as ArbitraryControlElementMarker]" section-key="footerTravelBlogs" :label-res-name="getI18nResName3('footer', 'travelBlogs', 'sriLanka')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'TravelBlogs', 'Peru' as ArbitraryControlElementMarker]" section-key="footerTravelBlogs" :label-res-name="getI18nResName3('footer', 'travelBlogs', 'peru')" />
            </ol>
          </section>
          <section class="footer-section footer-section-about">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'aboutUs', 'title')) }}
                </h3>
              </li>
              <AppFooterItem :ctrl-key="[...ctrlKey, 'About', 'OurStory' as ArbitraryControlElementMarker]" section-key="footerAbout" :label-res-name="getI18nResName3('footer', 'aboutUs', 'ourStory')" />
              <AppFooterItem :ctrl-key="[...ctrlKey, 'About', 'WorkWithUs' as ArbitraryControlElementMarker]" section-key="footerAbout" :label-res-name="getI18nResName3('footer', 'aboutUs', 'workWithUs')" />
            </ol>
          </section>
          <section class="footer-section footer-section-contact">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'contactUs', 'title')) }}
                </h3>
              </li>
              <li class="footer-item">
                <NuxtLink :class="`footer-item-ctrl tabbable tabbable-group-footer-contact brdr-1`" :to="`mailto:${AppConfig.contactEmail}`">
                  {{ t(getI18nResName3('footer', 'contactUs', 'email')) }}
                </NuxtLink>
              </li>
            </ol>
          </section>
        </nav>
      </section>
    </div>
  </footer>
</template>
