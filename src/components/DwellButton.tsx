import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTrackingContext } from '../context/TrackingContext';
import { playChime } from '../utils/audio';

interface DwellButtonProps {
  onClick: () => void;
  children: ReactNode;
  dwellTime?: number; // ms
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onHoverStateChange?: (isHovered: boolean) => void;
}

export const DwellButton = ({ 
  onClick, 
  children, 
  dwellTime = 1500, 
  className = '', 
  style = {},
  disabled = false,
  onHoverStateChange
}: DwellButtonProps) => {
  const { cursor, isIntentionalBlink, calibration } = useTrackingContext();
  const allowBlink = calibration.selectionMethod !== 'DWELL';
  const allowDwell = calibration.selectionMethod !== 'BLINK';

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const lastClickTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());

  // Check if virtual cursor is over the button (runs in ALL modes)
  useEffect(() => {
    if (disabled) {
      if (isHovered) {
        setIsHovered(false);
        onHoverStateChange?.(false);
      }
      setProgress(0);
      return;
    }

    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const cursorPxX = cursor.x * window.innerWidth;
    const cursorPxY = cursor.y * window.innerHeight;

    const inside = 
      cursorPxX >= rect.left && 
      cursorPxX <= rect.right && 
      cursorPxY >= rect.top && 
      cursorPxY <= rect.bottom;

    if (inside && !isHovered) {
      setIsHovered(true);
      onHoverStateChange?.(true);
    } else if (!inside && isHovered) {
      setIsHovered(false);
      onHoverStateChange?.(false);
      setProgress(0);
    }
  }, [cursor, disabled, isHovered, onHoverStateChange]);

  // Handle Intentional Blink selection
  useEffect(() => {
    // Ignore blinks for 500ms after button mounts to prevent bleed from previous screen
    if (Date.now() - mountTimeRef.current < 500) return;

    if (allowBlink && isIntentionalBlink && isHovered && !disabled) {
      if (Date.now() - lastClickTimeRef.current < 800) return;
      lastClickTimeRef.current = Date.now();
      setProgress(0);
      playChime();
      onClick();
    }
  }, [isIntentionalBlink, allowBlink, isHovered, onClick, disabled]);

  // Handle Dwell Timer selection
  useEffect(() => {
    let interval: number;
    const UPDATE_INTERVAL = 50;

    if (allowDwell && isHovered && progress < 100 && !disabled) {
      interval = window.setInterval(() => {
        setProgress(prev => {
          const next = prev + (UPDATE_INTERVAL / dwellTime) * 100;
          if (next >= 100) {
            return 100;
          }
          return next;
        });
      }, UPDATE_INTERVAL);
    } else if (!isHovered) {
      setProgress(0);
    }

    return () => clearInterval(interval);
  }, [progress, dwellTime, disabled, allowDwell, isHovered]);

  // Execute Dwell completion
  useEffect(() => {
    if (progress >= 100) {
      setProgress(0);
      playChime();
      onClick();
    }
  }, [progress, onClick]);

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
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
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
