// Constantes inyectadas por Vite en tiempo de build (ver `define` en
// vite.config.ts). No editar valores acá: la versión se cambia únicamente en el
// campo "version" de package.json y la fecha se genera sola en cada build.
//
// Antes este archivo repetía los valores como fallback y ya se habían
// desincronizado ('1.2.0' contra el 1.2.3 real de package.json).
declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

/** Versión de la app, tal cual está en package.json. */
export const APP_VERSION: string = __APP_VERSION__;

/** Fecha del último commit en formato YYYY-MM-DD. */
export const APP_BUILD_DATE: string = __APP_BUILD_DATE__;
