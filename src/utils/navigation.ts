import { startTransition } from 'react';

/**
 * Safe navigation utility using React 18 startTransition to guarantee
 * immediate DOM route re-renders during high-frequency camera tracking loops.
 */
export const safeNavigate = (navigateFn: (path: string) => void, path: string) => {
  startTransition(() => {
    try {
      navigateFn(path);
    } catch (e) {
      console.error('Error navigating:', e);
    }
  });
};
