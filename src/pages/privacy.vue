<script setup lang="ts">

import { joinURL } from 'ufo';
import { getI18nResName2, getI18nResName3 } from './../shared/i18n';
import { type Locale } from './../shared/constants';
import AppConfig from './../appconfig';
import { useNavLinkBuilder } from './../composables/nav-link-builder';

definePageMeta({
  title: { resName: getI18nResName2('privacyPage', 'title'), resArgs: undefined }
});
useOgImage();

const route = useRoute();
const siteConfig = useSiteConfig();
const { locale } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <article class="privacy-page no-hidden-parent-tabulation-check">
    <h1 class="privacy-title font-h3">
      <strong>{{ $t(getI18nResName2('privacyPage', 'documentHeader')) }}</strong>
    </h1>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section1', 'header')) }}</h2>
      <div class="privacy-paragraph" v-html="$t(getI18nResName3('privacyPage', 'section1', 'text'))" />
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section1', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section1', 'paragraph2'), { siteUrl: siteConfig.url })" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section2', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph2'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph3'), { siteUrl: siteConfig.url })" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph4'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph5'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph6'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph7'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph8'), { siteUrl: siteConfig.url })" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph9'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph10'), { siteUrl: siteConfig.url })" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph11'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph12'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph13'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section2', 'paragraph14'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section3', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph1Header'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph1Item1'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph1Item2'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph1Item3'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Header'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item1'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item2'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item3'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item4'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item5'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item6'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item7'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section3', 'paragraph2Item8'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section4', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Header'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Item1'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Item2'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Item3'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Item4'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Item5'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph1Item6'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph2Header'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph2Item1'))" />
        <li class="privacy-paragraph-statement-dashed" v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph2Item2'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section4', 'paragraph3Header'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section5', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph2'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph3'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph4'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph5'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph6'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section5', 'paragraph7'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section6', 'header')) }}</h2>
      <div class="privacy-paragraph">
        <table class="privacy-purpose-table">
          <tbody>
            <tr>
              <td>{{ $t(getI18nResName3('privacyPage', 'section6', 'row1Name')) }}</td>
              <td>{{ $t(getI18nResName3('privacyPage', 'section6', 'row1Value')) }}</td>
            </tr>
            <tr>
              <td>{{ $t(getI18nResName3('privacyPage', 'section6', 'row2Name')) }}</td>
              <td>
                <ul class="privacy-purpose-table-listvalues">
                  <li>{{ $t(getI18nResName3('privacyPage', 'section6', 'row2Value1')) }}</li>
                  <li>{{ $t(getI18nResName3('privacyPage', 'section6', 'row2Value2')) }}</li>
                  <li>{{ $t(getI18nResName3('privacyPage', 'section6', 'row2Value3')) }}</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td>{{ $t(getI18nResName3('privacyPage', 'section6', 'row3Name')) }}</td>
              <td>{{ $t(getI18nResName3('privacyPage', 'section6', 'row3Value')) }}</td>
            </tr>
            <tr>
              <td>{{ $t(getI18nResName3('privacyPage', 'section6', 'row4Name')) }}</td>
              <td>
                <ul class="privacy-purpose-table-listvalues">
                  <li>{{ $t(getI18nResName3('privacyPage', 'section6', 'row4Value1')) }}</li>
                  <li>{{ $t(getI18nResName3('privacyPage', 'section6', 'row4Value2')) }}</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section7', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph2'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph3'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph4'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph5'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph6'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section7', 'paragraph7'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">
        {{ $t(getI18nResName3('privacyPage', 'section8', 'header')) }}
      </h2>
      <div class="privacy-paragraph" v-html="$t(getI18nResName3('privacyPage', 'section8', 'text'))" />
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph2'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph3'), { contactEmail : AppConfig.contactEmail })" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph4'), { contactEmail : AppConfig.contactEmail })" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph5'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph6'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph7'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph8'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section8', 'paragraph9'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">
        {{ $t(getI18nResName3('privacyPage', 'section9', 'header')) }}
      </h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section9', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section9', 'paragraph2'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section10', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section10', 'paragraph1'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section10', 'paragraph2'))" />
      </ol>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section11', 'header')) }}</h2>
      <div class="privacy-paragraph">
        {{ $t(getI18nResName3('privacyPage', 'section11', 'text')) }}
      </div>
    </div>
    <div class="privacy-section">
      <h2 class="font-h5">{{ $t(getI18nResName3('privacyPage', 'section12', 'header')) }}</h2>
      <ol class="privacy-paragraph">
        <li v-html="$t(getI18nResName3('privacyPage', 'section12', 'paragraph1'), { contactEmail : AppConfig.contactEmail })" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section12', 'paragraph2'))" />
        <li v-html="$t(getI18nResName3('privacyPage', 'section12', 'paragraph3'), { privacyUrl : joinURL(siteConfig.url, navLinkBuilder.buildLink(route.path, locale as Locale)) })" />
      </ol>
    </div>
  </article>
</template>
