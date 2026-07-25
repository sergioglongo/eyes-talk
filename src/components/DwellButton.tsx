import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTracking } from '../context/TrackingContext';
import { playChime } from '../utils/audio';

interface DwellButtonProps {
  onClick: () => void;
  children: ReactNode;
  dwellTime?: number; // ms
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onHoverStateChange?: (isHovered: boolean) => void;
  hoverScale?: number; // Scale applied on hover highlight (default 1.03). Lower it for tightly packed buttons to avoid visual collision with neighbors.
}

const UPDATE_INTERVAL = 50;
// Ignora selecciones justo después de montar, para que el parpadeo que activó la
// pantalla anterior no se propague a esta. Antes eran 500ms acá y 600ms en Home;
// un solo valor evita que un gesto caiga en la ventana de uno y no del otro.
const MOUNT_GRACE_MS = 600;
const SELECTION_COOLDOWN_MS = 800;

export const DwellButton = ({
  onClick,
  children,
  dwellTime = 1500,
  className = '',
  style = {},
  disabled = false,
  onHoverStateChange,
  hoverScale = 1.03
}: DwellButtonProps) => {
  const { isIntentionalBlink, isPaused, calibration, hoveredElement } = useTracking();
  const allowBlink = calibration.selectionMethod !== 'DWELL';
  const allowDwell = calibration.selectionMethod !== 'BLINK';

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const lastSelectionRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());

  // Callbacks en refs para que los efectos de abajo no se recreen en cada render
  // del padre (los call sites pasan arrow functions inline).
  const onClickRef = useRef(onClick);
  const onHoverStateChangeRef = useRef(onHoverStateChange);
  useEffect(() => {
    onClickRef.current = onClick;
    onHoverStateChangeRef.current = onHoverStateChange;
  }, [onClick, onHoverStateChange]);

  // El hover se deriva del hit-test único que hace el loop de tracking, en vez
  // de medir este botón con getBoundingClientRect() en cada frame. Además, al
  // basarse en elementFromPoint respeta el z-order: un botón tapado por el
  // overlay de pausa ya no puede activarse.
  const isHovered =
    !disabled &&
    !isPaused &&
    !!hoveredElement &&
    !!buttonRef.current &&
    buttonRef.current.contains(hoveredElement);

  const prevHoveredRef = useRef(false);
  useEffect(() => {
    if (prevHoveredRef.current === isHovered) return;
    prevHoveredRef.current = isHovered;
    onHoverStateChangeRef.current?.(isHovered);
  }, [isHovered]);

  const fireSelection = useCallback(() => {
    const now = Date.now();
    if (now - mountTimeRef.current < MOUNT_GRACE_MS) return;
    if (now - lastSelectionRef.current < SELECTION_COOLDOWN_MS) return;

    lastSelectionRef.current = now;
    setProgress(0);
    playChime();
    onClickRef.current();
  }, []);

  // Selección por parpadeo intencional
  useEffect(() => {
    if (allowBlink && isIntentionalBlink && isHovered && !disabled) {
      fireSelection();
    }
  }, [isIntentionalBlink, allowBlink, isHovered, disabled, fireSelection]);

  // Temporizador de dwell. `progress` ya no está en las deps: antes el intervalo
  // se destruía y recreaba en cada tick de 50ms.
  useEffect(() => {
    if (!allowDwell || !isHovered || disabled) {
      setProgress(0);
      return;
    }

    const interval = window.setInterval(() => {
      setProgress(prev => Math.min(100, prev + (UPDATE_INTERVAL / dwellTime) * 100));
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [allowDwell, isHovered, disabled, dwellTime]);

  // Ejecuta la selección al completarse el dwell
  useEffect(() => {
    if (progress < 100) return;
    fireSelection();
  }, [progress, fireSelection]);

  return (
    <button
      ref={buttonRef}
      className={className}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        opacity: disabled ? 0.5 : 1,
        // High-contrast visual highlight when hovered by gaze/head cursor
        border: isHovered ? '3px solid var(--accent-hover)' : (style.border || '2px solid var(--bg-tertiary)'),
        boxShadow: isHovered ? '0 0 15px var(--accent-hover)' : 'none',
        transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
        transition: 'transform 0.15s ease, border 0.15s ease, box-shadow 0.15s ease',
      }}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      {/* Dwell Progress Bar */}
      {allowDwell && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '7px',
            background: '#FACC15',
            boxShadow: '0 0 12px #FACC15',
            width: `${progress}%`,
            transition: 'width 0.1s linear',
            zIndex: 5
          }}
        />
      )}
      {children}
    </button>
  );
};
