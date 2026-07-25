import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { playChime } from '../utils/audio';
import { ROUTES, type AppRoute } from '../utils/routes';

// Cooldown compartido a nivel de módulo (no por componente) porque varios
// componentes reaccionan al MISMO parpadeo: en Home, la zona espacial izquierda
// y el DwellButton que la cubre disparaban ambos, generando dos pushState y dos
// entradas en el historial. La guarda tiene que ser global para colapsarlos.
const NAV_COOLDOWN_MS = 800;

let lastNavAt = 0;
let lastNavTarget: string | null = null;

export interface GoOptions {
  /** Emitir el chime de confirmación. Default true. */
  chime?: boolean;
  /** Reemplazar la entrada actual del historial en vez de apilar una nueva. */
  replace?: boolean;
  /** Ignorar el cooldown y el chequeo de "ya estoy ahí". */
  force?: boolean;
}

/**
 * Punto único de navegación de la app.
 *
 * Resuelve de entrada los problemas que antes había que recordar en cada call
 * site: doble disparo del mismo gesto, entradas duplicadas en el historial y
 * chimes superpuestos. Para agregar una navegación nueva sólo hace falta
 * `go(ROUTES.X)`.
 */
export const useAppNavigation = () => {
  const navigate = useNavigate();

  // navigate cambia de identidad en cada navegación (sus deps incluyen el
  // pathname actual). Guardarlo en un ref deja `go` estable de por vida, así no
  // invalida las deps de los efectos ni de los onClick que lo reciben.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const go = useCallback((to: AppRoute, options: GoOptions = {}): boolean => {
    const { chime = true, replace = false, force = false } = options;
    const now = Date.now();

    if (!force) {
      // window.location es la fuente de verdad: si el render de React quedara
      // atrasado, el pathname de useLocation() seguiría mostrando la pantalla
      // anterior y el dedupe daría un falso negativo.
      if (window.location.pathname === to) return false;
      if (lastNavTarget === to && now - lastNavAt < NAV_COOLDOWN_MS) return false;
    }

    lastNavAt = now;
    lastNavTarget = to;

    if (chime) playChime();

    try {
      navigateRef.current(to, { replace });
    } catch (e) {
      console.error('[nav] Error navegando a', to, e);
      return false;
    }

    return true;
  }, []);

  const goHome = useCallback(
    (options?: GoOptions) => go(ROUTES.HOME, options),
    [go]
  );

  return { go, goHome };
};
