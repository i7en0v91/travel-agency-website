<script setup lang="ts">
import { AppConfig, AppPage, type Locale, getI18nResName2, getI18nResName3 } from '@golobe-demo/shared';
import { useNavLinkBuilder } from './../../composables/nav-link-builder';

interface IProps {
  ctrlKey: string
}
defineProps<IProps>();

const { locale, t } = useI18n();
const navLinkBuilder = useNavLinkBuilder();

function getFooterNavLinksInfo() {
  return [
    // Destinations
    [ 
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'destinations', 'title')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'destinations', 'canada')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'destinations', 'alaska')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'destinations', 'france')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'destinations', 'iceland')
      }
    ],

    // Activities
    [
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'activities', 'title')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'activities', 'northernLights')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'activities', 'cruisingSailing')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'activities', 'multiactivities')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'activities', 'kayaking')
      }
    ],

    // Travel Blogs
    [
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'travelBlogs', 'title')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'travelBlogs', 'bali')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'travelBlogs', 'sriLanka')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'travelBlogs', 'peru')
      }
    ],

    // About Us
    [
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'aboutUs', 'title')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'aboutUs', 'ourStory')
      },
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'aboutUs', 'workWithUs')
      }
    ],

    // Contact Us
    [
      { 
        special: false,
        labelResName: getI18nResName3('footer', 'contactUs', 'title')
      },
      { 
        special: 'email',
        labelResName: getI18nResName3('footer', 'contactUs', 'email')
      }
    ]
  ];
}

const navLinks = computed(() => {
  return getFooterNavLinksInfo()
    .map(group => group
      .map(li => {
        return {
          label: t(li.labelResName),
          disabled: li.special === 'email' ? false : true,
          active: false,
          to: li.special === 'email' ? `mailto:${AppConfig.contactEmail}` : 
            navLinkBuilder.buildPageLink(AppPage.Index, locale.value as Locale)
        };
      })
    );
});

const uiStyling = {
  wrapper: 'w-full max-w-[90vw] overflow-x-hidden grid gap-6 flex-grow flex-shrink basis-auto grid-flow-row auto-rows-auto grid-cols-1 sm:grid-cols-footernav items-start md:gap-[50px]',
  container: 'flex-col items-center content-start sm:items-start sm:justify-center *:text-center sm:*:text-start last:*:last:*:last-of-type:pointer-events-auto', //*:first-of-type:mb-4
  inactive: 'hover:bg-transparent dark:hover:bg-transparent text-primary-600 dark:text-gray-400',
  base: 'pointer-default pointer-events-none py-1 font-normal max-w-[290px] sm:max-w-[270px] truncate hover:underline',
  inner: 'first:*:first-of-type:font-bold first:*:first-of-type:text-black dark:first:*:first-of-type:text-white',

  before: 'hover:before:bg-transparent dark:hover:before:bg-transparent',
  active: 'after:bg-transparent dark:after:bg-transparent'
};

</script>

<template>
  <UHorizontalNavigation
    id="nav-footer" 
    :links="navLinks" 
    :aria-label="$t(getI18nResName2('ariaLabels', 'navFooter'))"
    :ui="uiStyling"
    class="pointer-events-auto"
  />
</template>
