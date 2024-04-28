<script setup lang="ts">

import SubscribeBox from './subscribe-box.vue';
import AppFooterItem from './app-footer-item.vue';
import AppFooterSocialLink from './app-footer-social-link.vue';
import { getI18nResName2, getI18nResName3 } from './../../shared/i18n';
import AppConfig from './../../appconfig';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const { t } = useI18n();
const localePath = useLocalePath();

</script>
<template>
  <footer class="app-footer">
    <div class="app-footer-div">
      <SubscribeBox ctrl-key="subscribeBox" />
      <section class="app-footer-content">
        <section class="footer-section footer-section-main mb-xs-4">
          <NuxtLink class="footer-app-logo tabbable tabbable-group-footer-main-section brdr-1" :to="localePath('/')" :aria-label="$t(getI18nResName2('ariaLabels', 'imgLinkMainPage'))" />
          <ol class="footer-social-links-list mt-xs-3 mt-m-4">
            <AppFooterSocialLink ctrl-key="footerSocialLinkTwitter" icon="twitter" url="https://x.com" :aria-label-res-name="getI18nResName2('ariaLabels', 'footerSocialLinkTwitter')" />
            <AppFooterSocialLink ctrl-key="footerSocialLinkYoutube" icon="youtube" url="https://www.youtube.com" :aria-label-res-name="getI18nResName2('ariaLabels', 'footerSocialLinkYoutube')" />
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
              <AppFooterItem ctrl-key="footerDestinationCanada" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'canada')" />
              <AppFooterItem ctrl-key="footerDestinationAlaska" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'alaska')" />
              <AppFooterItem ctrl-key="footerDestinationFrance" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'france')" />
              <AppFooterItem ctrl-key="footerDestinationIceland" section-key="footerDestinations" :label-res-name="getI18nResName3('footer', 'destinations', 'iceland')" />
            </ol>
          </section>
          <section class="footer-section footer-section-activities">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'activities', 'title')) }}
                </h3>
              </li>
              <AppFooterItem ctrl-key="footerActivitiesNorthernLights" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'northernLights')" />
              <AppFooterItem ctrl-key="footerActivitiesCruisingSailing" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'cruisingSailing')" />
              <AppFooterItem ctrl-key="footerActivitiesMulti" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'multiactivities')" />
              <AppFooterItem ctrl-key="footerActivitiesKayaking" section-key="footerActivities" :label-res-name="getI18nResName3('footer', 'activities', 'kayaking')" />
            </ol>
          </section>
          <section class="footer-section footer-section-blogs">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'travelBlogs', 'title')) }}
                </h3>
              </li>
              <AppFooterItem ctrl-key="footerTravelBlogsBali" section-key="footerTravelBlogs" :label-res-name="getI18nResName3('footer', 'travelBlogs', 'bali')" />
              <AppFooterItem ctrl-key="footerTravelBlogsSriLanka" section-key="footerTravelBlogs" :label-res-name="getI18nResName3('footer', 'travelBlogs', 'sriLanka')" />
              <AppFooterItem ctrl-key="footerTravelBlogsPeru" section-key="footerTravelBlogs" :label-res-name="getI18nResName3('footer', 'travelBlogs', 'peru')" />
            </ol>
          </section>
          <section class="footer-section footer-section-about">
            <ol>
              <li>
                <h3 class="footer-section-header">
                  {{ t(getI18nResName3('footer', 'aboutUs', 'title')) }}
                </h3>
              </li>
              <AppFooterItem ctrl-key="footerAboutOurStory" section-key="footerAbout" :label-res-name="getI18nResName3('footer', 'aboutUs', 'ourStory')" />
              <AppFooterItem ctrl-key="footerAboutWorkWithUs" section-key="footerAbout" :label-res-name="getI18nResName3('footer', 'aboutUs', 'workWithUs')" />
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
