import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useEyeTracking } from '../hooks/useEyeTracking';
import type { CursorPosition, TrackingState } from '../hooks/useEyeTracking';

/**
 * El estado de tracking está partido en dos contextos a propósito.
 *
 * El cursor cambia hasta 60 veces por segundo. Cuando todo viajaba en un solo
 * contexto (y encima con un objeto nuevo en cada render, sin memo), cada frame
 * re-renderizaba TODOS los consumidores: los ~30 DwellButton de T9Mode, Settings
 * y T9Mode completos, aunque esos dos sólo leen `calibration`.
 *
 * Ahora quien necesita la posición usa useCursor() y quien no, useTracking().
 */
const CursorContext = createContext<CursorPosition | null>(null);
const TrackingStateContext = createContext<TrackingState | null>(null);

export const TrackingProvider = ({ children }: { children: ReactNode }) => {
  const {
    cursor,
    rawGazeRef,
    direction,
    isBlinking,
    isIntentionalBlink,
    isEyesClosedLong,
    isPaused,
    togglePause,
    isReady,
    calibration,
    saveCalibration,
    hoveredElement,
  } = useEyeTracking();

  const state = useMemo<TrackingState>(
    () => ({
      rawGazeRef,
      direction,
      isBlinking,
      isIntentionalBlink,
      isEyesClosedLong,
      isPaused,
      togglePause,
      isReady,
      calibration,
      saveCalibration,
      hoveredElement,
    }),
    [
      rawGazeRef,
      direction,
      isBlinking,
      isIntentionalBlink,
      isEyesClosedLong,
      isPaused,
      togglePause,
      isReady,
      calibration,
      saveCalibration,
      hoveredElement,
    ]
  );

  return (
    <TrackingStateContext.Provider value={state}>
      <CursorContext.Provider value={cursor}>
        {children}
      </CursorContext.Provider>
    </TrackingStateContext.Provider>
  );
};

/** Estado de tracking sin la posición del puntero. Cambia con poca frecuencia. */
export const useTracking = (): TrackingState => {
  const context = useContext(TrackingStateContext);
  if (!context) {
    throw new Error('useTracking must be used within TrackingProvider');
  }
  return context;
};

/**
 * Posición del puntero virtual. Sólo usarlo donde la posición se necesite de
 * verdad: suscribirse acá implica re-renderizar mientras el puntero se mueve.
 */
export const useCursor = (): CursorPosition => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursor must be used within TrackingProvider');
  }
  return context;
};
