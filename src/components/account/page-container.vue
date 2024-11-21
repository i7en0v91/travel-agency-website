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
const props = defineProps<IProps>();

</script>

<template>
  <div class="px-[14px] py-[27px] sm:px-[20px] md:px-[40px] xl:px-[104px]">
    <div :class="`md:flex md:flex-row md:flex-nowrap md:gap-[60px] xl:gap-[104px] ${props.ui?.wrapper ?? ''}`">
      <div class="w-full h-auto">
        <NavLogo ctrl-key="standaloneAppLogo" class="md:absolute md:mt-[77px] lg:mt-0 lg:!left-[-55px] xl:!left-[-55px]"/>
        <div class="w-auto h-auto flex-1 basis-auto md:pt-[77px] md:pb-[104px] md:mb-[123px]">
          <div class="w-full h-auto mt-[36px] md:mt-[102px] lg:mt-[64px]">
            <slot />
          </div>
        </div>
      </div>
      <AccountFormPhotos :ctrl-key="`${props.ctrlKey}-Photos`" :ui="{ wrapper: `md:mt-[77px] ${ ui?.height ?? '!h-[812px]' }`, image: { wrapper: `${ ui?.height ?? '!h-[812px]' }`, img: `${ ui?.height ?? '!h-[812px]' }` } }"/>
    </div>  
  </div>
</template>
