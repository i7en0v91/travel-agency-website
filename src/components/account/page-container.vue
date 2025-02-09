<script setup lang="ts">
import NavLogo from './../../components/navbar/nav-logo.vue';
import AccountFormPhotos from './../../components/account/form-photos.vue';


interface IProps {
  ctrlKey: string,
  ui?: {
    wrapper?: string,
    height?: string
  }
}
const { ui } = defineProps<IProps>();

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px] group account-page-group">
    <NavLogo ctrl-key="standaloneAppLogo" class="min-h-20 *:-translate-y-1/4 lg:*:translate-y-[-10%] lg:translate-x-[0.5rem] md:block md:w-min md:mx-auto"/>
    <div :class="`md:flex md:flex-row md:flex-nowrap md:gap-[60px] xl:gap-[104px] ${ui?.wrapper ?? ''}`">
      <div class="contents">
        <div class="w-auto h-auto flex-1 basis-auto md:pt-[77px] md:pb-[104px] md:mb-[123px]">
          <div class="w-full h-auto mt-[36px] md:mt-[102px] lg:mt-[64px]">
            <slot />
          </div>
        </div>
      </div>
      <AccountFormPhotos :ctrl-key="`${ctrlKey}-Photos`" :ui="{ wrapper: `md:mt-[77px] ${ ui?.height ?? '!h-[50rem]' }`, image: { wrapper: `${ ui?.height ?? '!h-[50rem]' }`, img: `${ ui?.height ?? '!h-[50rem]' }` } }"/>
    </div>  
  </div>
</template>
