import { useEffect, useRef } from 'react';
import { useTracking, useCursor } from '../context/TrackingContext';
import { Settings as SettingsIcon, Eye, Keyboard } from 'lucide-react';
import { DwellButton } from '../components/DwellButton';
import { FullscreenToggle } from '../components/FullscreenToggle';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { ROUTES } from '../utils/routes';

const MOUNT_GRACE_MS = 600;

const Home = () => {
  const { go } = useAppNavigation();
  const { direction, isReady, isIntentionalBlink, calibration } = useTracking();
  const cursor = useCursor();
  const mountTimeRef = useRef<number>(Date.now());

  const allowBlink = calibration.selectionMethod !== 'DWELL';

  // Selección por zona espacial. Estas zonas se solapan con los DwellButton que
  // las cubren, así que un mismo parpadeo dispara los dos caminos; el cooldown
  // global de useAppNavigation colapsa el segundo. Antes cada parpadeo generaba
  // dos pushState y dos entradas en el historial.
  useEffect(() => {
    if (Date.now() - mountTimeRef.current < MOUNT_GRACE_MS) return;
    if (!allowBlink || !isIntentionalBlink) return;

    // Zone 3: Bottom Dock -> Configuración
    // When the Fullscreen button is visible it shares the right half of the
    // dock, so this shortcut must only fire on the left half. When it's
    // hidden, Configuración spans the full dock width.
    if (cursor.y >= 0.85) {
      if (!calibration.showFullscreenButton || cursor.x < 0.5) {
        go(ROUTES.SETTINGS);
      }
      return;
    }

    // Zone 1: Left Half (x < 50% or spatial LEFT) -> Modo Mirada
    if (cursor.x < 0.5 || direction === 'LEFT') {
      go(ROUTES.LOOK);
      return;
    }

    // Zone 2: Right Half (x >= 50% or spatial RIGHT) -> Modo T9
    if (cursor.x >= 0.5 || direction === 'RIGHT') {
      go(ROUTES.T9);
    }
  }, [isIntentionalBlink, cursor, direction, allowBlink, go, calibration.showFullscreenButton]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', gap: '0.5rem', padding: '0.5rem 0.5rem 0 0.5rem' }}>
      
      {/* Top Row - Modo Mirada (Izquierda) & Modo T9 (Derecha) */}
      <div style={{ flex: 1, width: '100%', display: 'flex', gap: '0.5rem' }}>

        {/* Left Card - Modo Look */}
        <DwellButton
          onClick={() => go(ROUTES.LOOK)}
          hoverScale={1.015}
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '3px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            gap: '0.6rem',
            padding: '1rem'
          }}
        >
          <Eye size={56} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '2.2rem', color: 'var(--accent-primary)', margin: 0, textAlign: 'center' }}>Modo Mirada (Frases)</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
            Mira aquí o hacia <b>la izquierda</b> para ingresar al panel de frases rápidas
          </p>
        </DwellButton>

        {/* Right Card - Modo T9 */}
        <DwellButton
          onClick={() => go(ROUTES.T9)}
          hoverScale={1.015}
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '3px solid var(--success)',
            borderRadius: 'var(--radius-md)',
            gap: '0.6rem',
            padding: '1rem'
          }}
        >
          <Keyboard size={56} color="var(--success)" />
          <h1 style={{ fontSize: '2.2rem', color: 'var(--success)', margin: 0, textAlign: 'center' }}>Modo T9 (Teclado Predictivo)</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
            Mira aquí o hacia <b>la derecha</b> para ingresar al teclado de escritura rápida
          </p>
        </DwellButton>

      </div>

      {/* Bottom Section Dock - Configuración (+ Pantalla Completa si está habilitado) */}
      <div style={{ display: 'flex', width: '100%', gap: '0.5rem', minHeight: '110px' }}>
        <DwellButton
          onClick={() => go(ROUTES.SETTINGS)}
          hoverScale={1.015}
          style={{
            flex: calibration.showFullscreenButton ? '0 1 calc(50% - 0.25rem)' : 1,
            minHeight: '110px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '3px solid var(--accent-hover)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.8rem',
            fontSize: '1.4rem',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            boxShadow: '0 0 20px rgba(0,0,0,0.4)'
          }}
        >
          <SettingsIcon size={30} color="var(--accent-hover)" /> Configuración
        </DwellButton>

        {calibration.showFullscreenButton && (
          <FullscreenToggle hoverScale={1.015} style={{ flex: '0 1 calc(50% - 0.25rem)', minHeight: '110px' }} />
        )}
      </div>

      {/* Camera Status */}
      {!isReady && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--warning)', background: 'rgba(15, 23, 42, 0.95)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)', zIndex: 1000 }}>
          Cargando cámara y modelos...
        </div>
      )}

    </div>
  );
};

export default Home;
