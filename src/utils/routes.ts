// Rutas canónicas de la app. Usar estas constantes en vez de strings sueltos
// para que TypeScript detecte destinos inexistentes al agregar navegaciones.
export const ROUTES = {
  HOME: '/',
  LOOK: '/look',
  T9: '/t9',
  SETTINGS: '/settings',
  CALIBRATION: '/calibration',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

// Alias histórico que sigue registrado en el router pero no se navega desde el
// código; queda fuera de ROUTES para tener un único destino canónico.
export const CALIBRATION_ALIAS = '/calibrate';
