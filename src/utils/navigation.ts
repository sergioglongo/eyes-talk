import { flushSync } from 'react-dom';

/**
 * Safe navigation utility that forces React DOM to synchronously flush
 * route transitions AND dispatches a native browser compositor event to prevent
 * React 18 from deferring route paints during high-frequency camera tracking updates.
 */
export const safeNavigate = (navigateFn: (path: string) => void, path: string) => {
  try {
    flushSync(() => {
      navigateFn(path);
    });
  } catch (e) {
    navigateFn(path);
  }

  // Force browser compositor frame paint
  requestAnimationFrame(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, bubbles: true }));
    window.dispatchEvent(new Event('resize'));
  });
};
