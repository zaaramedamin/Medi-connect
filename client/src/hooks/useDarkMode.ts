import { useEffect, useState } from 'react';

/**
 * Tracks the `dark` class the header toggles on <html>.
 *
 * The theme isn't held in a store, so we watch the element itself — that stays
 * correct no matter who flips it, and needs no refactor of the header.
 */
export function useDarkMode(): boolean {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
