import orderBy from 'lodash/orderBy';
import zip from 'lodash/zip';
import range from 'lodash/range';
import throttle from 'lodash/throttle';
import groupBy from 'lodash/groupBy';
import keys from 'lodash/keys';
import flatten from 'lodash/flatten';
import { type Theme } from './constants';

export function isInViewport (element: HTMLElement, includeVeticallyScrollableTo = false) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  const res = (rect.top >= 0 || includeVeticallyScrollableTo) &&
    rect.left >= 0 &&
    (rect.bottom <= (window.innerHeight || html.clientHeight) || includeVeticallyScrollableTo) &&
    rect.right <= (window.innerWidth || html.clientWidth);
  return res;
}

function testRectIntersection (rect1: DOMRect, rect2: DOMRect): boolean {
  return !((rect1.left > rect2.right) || (rect1.bottom < rect2.top) || (rect1.right < rect2.left) || (rect1.top > rect2.bottom));
}

function isElementItselfVisible (element: HTMLElement) {
  const isTransparent = element.style.opacity && element.style.opacity.split('.').every(p => parseInt(p) === 0);
  return !(element.style.display === 'none' ||
          window.getComputedStyle(element).visibility === 'hidden' ||
          !isInViewport(element, true) ||
          isTransparent);
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

export function isElementVisible (element: HTMLElement) {
  const isTransparent = element.style.opacity && element.style.opacity.split('.').every(p => parseInt(p) === 0);
  const hiddenOverflowVisibilityCheck = !element.className.includes('hidden-overflow-nontabbable') || isElementHiddenOverflowVisible(element);
  const hasHiddenParentCheck = element.className.includes('no-hidden-parent-tabulation-check') || !hasHiddenParent(element);
  return isInViewport(element, true) && hasHiddenParentCheck && !isTransparent && hiddenOverflowVisibilityCheck;
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

function doUpdateTabIndices () {
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
    if (isElementVisible(e) && !disabledTabbableElements.includes(e)) {
      tabbableElements.push(e);
    } else {
      unreachableElements.push(e);
    }
  });

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
