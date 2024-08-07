import { type FloatingVueHydrationHints } from './../shared/interfaces';

const PopperClassNamePatches: { customTheme: string, extensionList: string[] }[] = [
  { customTheme: 'default-dropdown', extensionList: ['dropdown'] },
  { customTheme: 'default-menu', extensionList: ['menu'] },
  { customTheme: 'control-dropdown', extensionList: ['dropdown'] },
  { customTheme: 'options-button-dropdown', extensionList: ['dropdown', 'control-dropdown'] },
  { customTheme: 'secondary-dropdown', extensionList: ['dropdown', 'control-dropdown'] },
  { customTheme: 'default-tooltip', extensionList: ['tooltip'] },
  { customTheme: 'footer-item-tooltip', extensionList: ['tooltip', 'default-tooltip'] }
];

export function patchPopperComponent(el: HTMLElement, hints: FloatingVueHydrationHints) {
  const logger = (globalThis as any).CommonServicesLocator.getLogger();
  try {
    logger.debug(`(floating-vue) checking popper element, id=${el.id ?? ''}, className=${el.className}`);

    const targetElements = el.querySelectorAll('.v-popper, .v-popper__popper');
    let numPatched = 0;
    for(let i = 0; i < targetElements.length; i++) {
      const el = targetElements[i] as HTMLElement;
      for(let j = 0; j < PopperClassNamePatches.length; j++) {
        const classPatch = PopperClassNamePatches[j];
        const customThemeClass = `v-popper--theme-${classPatch.customTheme}`;

        if(el.className.includes(customThemeClass) && !el.className.includes(`v-popper--theme-${classPatch.extensionList[0]}`)) {
          logger.debug(`(floating-vue) patching popper element class name: id=${el.id ?? ''}, className=${el.className}`);
          const extensionListClassNames = classPatch.extensionList.map(x => `v-popper--theme-${x}`);
          extensionListClassNames.reverse();
          const inheritedThemeClasses = `${customThemeClass} ${extensionListClassNames.join(' ')}`;          
          el.className = el.className.replace(customThemeClass, inheritedThemeClasses);
          numPatched++;
          break;
        }
      }

      if(el.hasAttribute('tabIndex')) {
        if(el.tabIndex === undefined && hints.tabIndex !== undefined) {
          logger.debug(`(floating-vue) patching popper element tabIndex: id=${el.id ?? ''}, className=${el.className}, elTabIndex=${el.tabIndex ?? ''}, hintsTabIndex=${hints.tabIndex ?? ''}`);
          el.tabIndex = hints.tabIndex;
        } else if(el.tabIndex !== undefined && hints.tabIndex === undefined) {
          logger.debug(`(floating-vue) patching (removing) popper element tabIndex: id=${el.id ?? ''}, className=${el.className}, elTabIndex=${el.tabIndex ?? ''}, hintsTabIndex=${hints.tabIndex ?? ''}`);
          el.removeAttribute('tabIndex');
        } else if(hints.tabIndex !== undefined) {
          logger.debug(`(floating-vue) patching (setting) popper element tabIndex: id=${el.id ?? ''}, className=${el.className}, elTabIndex=${el.tabIndex ?? ''}, hintsTabIndex=${hints.tabIndex ?? ''}`);
          el.tabIndex = hints.tabIndex;
        }
      } else if(hints.tabIndex !== undefined) {
        logger.debug(`(floating-vue) patching (creating) popper element tabIndex: id=${el.id ?? ''}, className=${el.className}, elTabIndex=${el.tabIndex ?? ''}, hintsTabIndex=${hints.tabIndex ?? ''}`);
        el.tabIndex = hints.tabIndex;
      }
    }

    logger.debug(`(floating-vue) popper element patched:  id=${el.id ?? ''}, className=${el.className}, ${numPatched} out of ${targetElements.length}`);
  } catch(err: any) {
    logger.warn(`(floating-vue) failed to patch popper element, id=${el.id ?? ''}, className=${el.className}`, err);
  }
}