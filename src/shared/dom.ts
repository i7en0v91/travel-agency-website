import orderBy from 'lodash-es/orderBy';
import zip from 'lodash-es/zip';
import range from 'lodash-es/range';
import throttle from 'lodash-es/throttle';
import groupBy from 'lodash-es/groupBy';
import keys from 'lodash-es/keys';
import flatten from 'lodash-es/flatten';
import { type Theme, DeviceSizeEnum, DeviceSizeS, getBreakpointForDevice } from './constants';
import AppConfig from './../appconfig';

export function isInViewport (element: HTMLElement, includeVeticallyScrollableTo = false) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  const separatedByXaxis = rect.bottom < 0 || rect.top > (window.innerHeight || html.clientHeight);
  const separatedByYaxis = rect.right < 0 || rect.left > (window.innerWidth || html.clientWidth);
  const res = (!separatedByXaxis || includeVeticallyScrollableTo) && !separatedByYaxis;
  return res;
}

function testRectIntersection (rect1: DOMRect, rect2: DOMRect): boolean {
  return !((rect1.left > rect2.right) || (rect1.bottom < rect2.top) || (rect1.right < rect2.left) || (rect1.top > rect2.bottom));
}

function isElementItselfVisible (element: HTMLElement) {
  const isTransparent = ((element.style.opacity?.length ?? 0) > 0) && element.style.opacity.split('.').every((p) => { return parseInt(p) === 0; });
  const isNotDisplayed = element.style.display === 'none' && !element.className.includes('nav-search-page-links'); // handle .nav-search-page-links separately because of 'display: none' style added by vue's Trransition
  const isInvisible = window.getComputedStyle(element).visibility === 'hidden';
  const isOutOfViewport = !isInViewport(element, true);
  return !(isNotDisplayed || isInvisible || isOutOfViewport || isTransparent);
}

function isElementHiddenOverflowVisible (testElement: HTMLElement, parentElement?: HTMLElement | null) : boolean {
  if (!parentElement) {
    if (!testElement.parentElement) {
      return true;
    }
    return isElementHiddenOverflowVisible(testElement, testElement.parentElement);
  }

  const parentClientRect = parentElement.getBoundingClientRect();
  const testElemRect = testElement.getBoundingClientRect();
  if (parentElement.className.includes('hidden-overflow-nontabbable') && !testRectIntersection(testElemRect, parentClientRect)) {
    return false;
  }

  if (!parentElement.parentElement) {
    return true;
  }
  return isElementHiddenOverflowVisible(testElement, parentElement.parentElement);
}

function hasHiddenParent (element: HTMLElement) : boolean {
  if (element.className.includes('app-track') || element.tagName.toLowerCase() === 'body') {
    return false;
  }
  if (element.className.includes('no-hidden-parent-tabulation-check')) {
    return false;
  }
  if (!isElementItselfVisible(element)) {
    return true;
  }
  if (!element.parentElement) {
    return false;
  }
  return hasHiddenParent(element.parentElement);
}

function hasParentWithClassName (element: HTMLElement, classNameLowerCase: string): boolean {
  if (element.className.includes('app-track') || element.tagName.toLowerCase() === 'body') {
    return false;
  }
  if (element.className.toLowerCase().includes(classNameLowerCase)) {
    return true;
  }
  if (!element.parentElement) {
    return false;
  }
  return hasParentWithClassName(element.parentElement, classNameLowerCase);
}

function hasModalParent (element: HTMLElement) : boolean {
  return hasParentWithClassName(element, 'modal-window');
}

function isReCAPTCHAElement (element: HTMLElement) : boolean {
  return hasParentWithClassName(element, 'grecaptcha');
}

export function isElementVisible (element: HTMLElement) {
  const isTransparent = ((element.style.opacity?.length ?? 0) > 0) && element.style.opacity.split('.').every((p) => { return parseInt(p) === 0; });
  const hiddenOverflowVisibilityCheck = !element.className.includes('hidden-overflow-nontabbable') || isElementHiddenOverflowVisible(element);
  const hasHiddenParentCheck = element.className.includes('no-hidden-parent-tabulation-check') || !hasHiddenParent(element);
  const viewportCheck = isInViewport(element, true);
  return viewportCheck && hasHiddenParentCheck && !isTransparent && hiddenOverflowVisibilityCheck;
}

export function calculateTabIndicies (rects: {x: number, y: number, width: number, height: number}[], snapSize = 1): number[] {
  function snapToGrid (value: number) {
    return Math.floor(value / snapSize) * snapSize;
  }

  return orderBy(
    zip(
      range(1, rects.length + 1),
      orderBy(rects.map((r, idx) => {
        return {
          idx,
          cx: snapToGrid(r.x + r.width / 2),
          cy: snapToGrid(r.y + r.height / 2)
        };
      }), ['cy', 'cx'], ['asc', 'asc']).map(r => r.idx + 1)
    ), ['1'], ['asc'])
    .map(r => r[0]!);
}

function getTabbableGroupId (elem: HTMLElement): string | undefined {
  if (!elem.classList) {
    return undefined;
  }

  for (let i = 0; i < elem.classList.length; i++) {
    const className = elem.classList[i];
    if (className.startsWith('tabbable-group-')) {
      return className.replace('tabbable-group-', '');
    }
  }

  return undefined;
}

function getPopperId (elem: HTMLElement): string | undefined {
  if (elem.classList.contains('v-popper__popper')) {
    return undefined;
  }

  const anchorAttr = elem.dataset.popperAnchor as string;
  if (anchorAttr?.length > 0) {
    return anchorAttr;
  }

  const parentElem = elem.parentElement as HTMLElement;
  if (!parentElem) {
    return undefined;
  }
  return getPopperId(parentElem);
}

/**
 * Processes focusable HTML elements on page and fills tabIndex property in order - first from left to right then top to bottom.
 * Handles dropdown menus, hidden parents e.t.c
 * @param excludeModalWindowElements Workaround to make modal window controls ( e.g. @see useConfirmBox ) tabbale when on webkit engine.
 * If true - autodetects modal container and excludes all inner controls from indexation
 */
function doUpdateTabIndices (excludeModalWindowElements: boolean = true) {
  const logger = CommonServicesLocator.getLogger();
  if (!document) {
    logger.verbose('tab indices - nothing to update');
    return;
  }

  const allPotentiallyTabbableElems = [
    ...document.getElementsByTagName('a'),
    ...([...document.getElementsByTagName('input')].filter(e => !e.className.includes('checkbox-input-val'))),
    ...document.getElementsByTagName('button'),
    ...([...document.getElementsByClassName('checkbox')].map(e => e as HTMLElement)),
    ...([...document.getElementsByClassName('tabbable')].map(e => e as HTMLElement))
  ].filter(e => e.className && (!e.hasAttribute('disabled') || e.getAttribute('disabled')?.toLowerCase() === 'false'));

  const unreachableElements = [] as HTMLElement[];
  const tabbableElements = [] as HTMLElement[];

  const disabledTabbableElements = allPotentiallyTabbableElems.filter(e => e.classList.contains('nontabbable') || e.classList.contains('disabled'));
  allPotentiallyTabbableElems.forEach((e) => {
    if ((excludeModalWindowElements && hasModalParent(e)) || isReCAPTCHAElement(e)) {
      return;
    }

    if (isElementVisible(e) && !disabledTabbableElements.includes(e)) {
      tabbableElements.push(e);
    } else {
      unreachableElements.push(e);
    }
  });

  if (!AppConfig.enableHtmlTabIndex) {
    allPotentiallyTabbableElems.forEach((e) => {
      if (e.attributes.getNamedItem('tabIndex')) {
        e.attributes.removeNamedItem('tabIndex');
      }
    });
    unreachableElements.forEach((e) => { e.tabIndex = -1; });
    logger.verbose(`tab indices - turned off in config, total elements = ${allPotentiallyTabbableElems.length}`);
    return;
  }

  /** Popper groupings - dropdowns & menus */
  const popperGroupings = groupBy(tabbableElements
    .map((e) => { return { e, groupId: getPopperId(e) }; })
    .filter(t => t.groupId), (i) => { return i.groupId!; });
  const allGroupIds = keys(popperGroupings);
  let popperGroupingsByAnchor = allGroupIds.map((gid) => {
    const groupElements = popperGroupings[gid].map((g) => { return { e: g.e, y: g.e.getBoundingClientRect().top }; });
    const anchorElement = document.getElementById(gid);
    return {
      anchor: anchorElement,
      groupElements
    };
  });
  popperGroupingsByAnchor = popperGroupingsByAnchor.filter(g => g.anchor);

  const allPopperElements = flatten(popperGroupingsByAnchor.map(g => g.groupElements));
  allPopperElements.forEach((e) => {
    let elemIdx = tabbableElements.indexOf(e.e);
    while (elemIdx >= 0) {
      tabbableElements.splice(elemIdx, 1);
      elemIdx = tabbableElements.indexOf(e.e);
    }
  });

  /** Abstract HTML element groupings - e.g. footer sections links */
  const tabbableGroupings = groupBy(tabbableElements
    .map((e) => { return { e, groupId: getTabbableGroupId(e) }; })
    .filter(t => t.groupId), (i) => { return i.groupId!; });
  const allTabbableGroupingIds = keys(tabbableGroupings);
  const allTabbableGroupingsElements = flatten(allTabbableGroupingIds.map(gid => tabbableGroupings[gid]));
  allTabbableGroupingsElements.forEach((e) => {
    let elemIdx = tabbableElements.indexOf(e.e);
    while (elemIdx >= 0) {
      tabbableElements.splice(elemIdx, 1);
      elemIdx = tabbableElements.indexOf(e.e);
    }
  });
  for (let i = 0; i < allTabbableGroupingIds.length; i++) {
    const groupElements = tabbableGroupings[allTabbableGroupingIds[i]];
    if (!groupElements.length) {
      continue;
    }
    let topElement = groupElements[0];
    let topY = topElement.e.getBoundingClientRect().y;
    for (let j = 1; j < groupElements.length; j++) {
      const nextTopY = groupElements[j].e.getBoundingClientRect().y;
      if (nextTopY < topY) {
        topY = nextTopY;
        topElement = groupElements[j];
      }
    }
    tabbableElements.push(topElement.e);
  }

  /** update tab indices */
  if (tabbableElements.length) {
    const elemRects = tabbableElements.map((e) => {
      const rect = e.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, e };
    });

    const tabbableLastIdx = range(0, tabbableElements.length).filter(idx => tabbableElements[idx].className.includes('tabbable-last'));

    const normallyTabbableRects = elemRects.filter((_, idx) => !tabbableLastIdx.includes(idx));
    const normallyTabbableIndices = calculateTabIndicies(normallyTabbableRects, 30);
    const lastTabbableRects = elemRects.filter((_, idx) => tabbableLastIdx.includes(idx));
    const tabbableLastIndices = calculateTabIndicies(lastTabbableRects, 30);
    if (tabbableLastIndices.length) {
      const tabbableLastIdxShift = Math.max(...normallyTabbableIndices);
      for (let i = 0; i < tabbableLastIndices.length; i++) {
        tabbableLastIndices[i] += tabbableLastIdxShift;
      }
    }

    const elemOrdered = orderBy(zip(
      [...normallyTabbableIndices, ...tabbableLastIndices],
      [...normallyTabbableRects, ...lastTabbableRects])
      .map((t) => { return { tabIndex: t[0], elemRect: t[1]! }; }), ['tabIndex'], ['asc']);

    let idxShiftCount = 1; // start tabindexes from 1 to deal with <body> focusing after navigating from tabindex="0"
    elemOrdered.forEach((e, idx) => {
      const popperGrouping = popperGroupingsByAnchor.find(a => a.anchor === e.elemRect.e);
      const tabbableGroupingId = getTabbableGroupId(e.elemRect.e);
      const tabbableGrouping = tabbableGroupingId ? tabbableGroupings[tabbableGroupingId] : undefined;
      const anchorIdx = idx + idxShiftCount;
      if (popperGrouping) {
        e.elemRect.e.tabIndex = idx + idxShiftCount;
        const groupElements = orderBy(popperGrouping.groupElements, ['y'], ['asc']);
        groupElements.forEach((ge, gidx) => { ge.e.tabIndex = gidx + anchorIdx + 1; });
        idxShiftCount += popperGrouping.groupElements.length;
      } else if (tabbableGrouping) {
        const groupElemRects = tabbableGrouping.map((e) => {
          const rect = e.e.getBoundingClientRect();
          return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, e };
        });
        const groupElemTabIndices = calculateTabIndicies(groupElemRects, 15); // 15px - for footer links
        groupElemTabIndices.forEach((elemIdx, tabIndex) => { groupElemRects[tabIndex].e.e.tabIndex = elemIdx - 1 + anchorIdx; });
        idxShiftCount += groupElemTabIndices.length;
      } else {
        e.elemRect.e.tabIndex = idx + idxShiftCount;
      }
    });
  }
  unreachableElements.forEach((e) => { e.tabIndex = -1; });
  const totalGroups = popperGroupingsByAnchor.length + allTabbableGroupingIds.length;
  logger.verbose(`tab indices - total elements = ${tabbableElements.length}, groups = ${totalGroups}`);
}

export const updateTabIndices = throttle(doUpdateTabIndices, 1000, { leading: true, trailing: true });

export function getPreferredTheme (): Theme | undefined {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    } else {
      return 'dark';
    }
  }
  return undefined;
};

export function isPrefersReducedMotionEnabled (): boolean {
  const mediaQueryResult = window.matchMedia ? window.matchMedia('(prefers-reduced-motion)') : undefined;
  return mediaQueryResult !== undefined && (mediaQueryResult.media === 'reduce' || (mediaQueryResult.matches && mediaQueryResult.media === '(prefers-reduced-motion)'));
}

export async function callForCurrentDeviceSize<TResult> (fn: (currentSize: DeviceSizeEnum, breakpoint: number) => Promise<TResult>): Promise<TResult> {
  const allDeviceSizes = orderBy(Object.values(DeviceSizeEnum).map((x) => { return { value: x, width: getBreakpointForDevice(DeviceSizeEnum[x] as DeviceSizeEnum) }; }), ['width'], ['desc']);
  for (let i = 0; i < allDeviceSizes.length; i++) {
    const deviceSize = allDeviceSizes[i];
    const mediaQuery = window.matchMedia(`only screen and (min-width: ${deviceSize.width}px)`);
    if (mediaQuery.matches) {
      return await fn(deviceSize.value, deviceSize.width);
    }
  }
  return await fn(DeviceSizeEnum.S, DeviceSizeS);
}
