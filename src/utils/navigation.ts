import type { NavigateFunction } from 'react-router-dom';

export const safeNavigate = (navigateFn: NavigateFunction, path: string) => {
  try {
    navigateFn(path, { flushSync: true });
  } catch (e) {
    console.error('Error navigating:', e);
  }
};
