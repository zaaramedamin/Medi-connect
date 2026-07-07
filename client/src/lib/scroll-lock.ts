// Reference-counted body scroll lock so overlapping overlays (cart drawer,
// product quick-view) don't clear each other's lock when one closes.
let count = 0;

export function lockScroll() {
  count += 1;
  document.documentElement.style.overflow = 'hidden';
}

export function unlockScroll() {
  count = Math.max(0, count - 1);
  if (count === 0) document.documentElement.style.overflow = '';
}
