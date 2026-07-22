import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';
import { Settings as SettingsIcon, Eye, Keyboard } from 'lucide-react';
import { playChime } from '../utils/audio';
import { safeNavigate } from '../utils/navigation';
import { DwellButton } from '../components/DwellButton';

const Home = () => {
  const navigate = useNavigate();
  const { cursor, direction, isReady, isIntentionalBlink, calibration } = useTrackingContext();
  const mountTimeRef = useRef<number>(Date.now());

  const allowBlink = calibration.selectionMethod !== 'DWELL';

  // Spatial & Zone Selection via Intentional Blink or Head Tilt
  useEffect(() => {
    // Ignore blinks during the first 600ms of page mount to prevent blink bleed from previous page
    if (Date.now() - mountTimeRef.current < 600) return;

    if (allowBlink && isIntentionalBlink) {
      // Zone 3: Bottom Dock (y >= 85%) -> Configuración
      if (cursor.y >= 0.85) {
        playChime();
        safeNavigate(navigate, '/settings');
        return;
      }

      // Zone 1: Upper Section (y < 425% or spatial UP) -> Modo Mirada
      if (cursor.y < 0.425 || direction === 'UP') {
        playChime();
        safeNavigate(navigate, '/look');
        return;
      }

      // Zone 2: Middle Section (y >= 425% and y < 85% or spatial DOWN) -> Modo T9
      if ((cursor.y >= 0.425 && cursor.y < 0.85) || direction === 'DOWN') {
        playChime();
        safeNavigate(navigate, '/t9');
        return;
      }
    }
  }, [isIntentionalBlink, cursor, direction, allowBlink, navigate]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', gap: '0.5rem', padding: '0.5rem' }}>
      
      {/* Top Section Card - Modo Look */}
      <DwellButton 
        onClick={() => safeNavigate(navigate, '/look')}
        style={{ 
          flex: 1, 
          width: '100%',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: '3px solid var(--accent-primary)',
          borderRadius: 'var(--radius-md)',
          gap: '0.6rem'
        }}
      >
        <Eye size={56} color="var(--accent-primary)" />
        <h1 style={{ fontSize: '2.8rem', color: 'var(--accent-primary)', margin: 0 }}>Modo Mirada (Frases)</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', margin: 0 }}>
          Mira aquí o hacia <b>arriba</b> para ingresar al panel de frases rápidas
        </p>
      </DwellButton>

      {/* Middle Section Card - Modo T9 */}
      <DwellButton 
        onClick={() => safeNavigate(navigate, '/t9')}
        style={{ 
          flex: 1, 
          width: '100%',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: '3px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          gap: '0.6rem'
        }}
      >
        <Keyboard size={56} color="var(--success)" />
        <h1 style={{ fontSize: '2.8rem', color: 'var(--success)', margin: 0 }}>Modo T9 (Teclado Predictivo)</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', margin: 0 }}>
          Mira aquí o hacia <b>abajo</b> para ingresar al teclado de escritura rápida
        </p>
      </DwellButton>

      {/* Bottom Section Docked Bar - Configuración (Centrada horizontalmente y más alta) */}
      <DwellButton 
        onClick={() => safeNavigate(navigate, '/settings')}
        style={{
          width: '100%',
          minHeight: '75px',
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
