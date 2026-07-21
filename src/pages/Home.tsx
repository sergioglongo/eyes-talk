import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';
import { Settings as SettingsIcon } from 'lucide-react';
import { playChime } from '../utils/audio';
import { safeNavigate } from '../utils/navigation';

const Home = () => {
  const navigate = useNavigate();
  const { direction, isReady, isIntentionalBlink, calibration } = useTrackingContext();
  const [dwellProgressUp, setDwellProgressUp] = useState(0);
  const [dwellProgressDown, setDwellProgressDown] = useState(0);
  
  // Dwell time to select a mode (in ms)
  const DWELL_TIME = 1500;
  // Interval for updating the progress bar
  const UPDATE_INTERVAL = 50;

  const allowBlink = calibration.selectionMethod !== 'DWELL';
  const allowDwell = calibration.selectionMethod !== 'BLINK';

  // Instant selection via Intentional Blink ONLY if pointing at a valid direction (UP or DOWN)
  useEffect(() => {
    if (allowBlink && isIntentionalBlink) {
      if (direction === 'UP') {
        playChime();
        safeNavigate(navigate, '/look');
      } else if (direction === 'DOWN') {
        playChime();
        safeNavigate(navigate, '/t9');
      }
    }
  }, [isIntentionalBlink, direction, allowBlink, navigate]);

  useEffect(() => {
    let interval: number;

    if (allowDwell && direction === 'UP') {
      setDwellProgressDown(0);
      interval = window.setInterval(() => {
        setDwellProgressUp(prev => {
          const next = prev + (UPDATE_INTERVAL / DWELL_TIME) * 100;
          if (next >= 100) {
            clearInterval(interval);
            safeNavigate(navigate, '/look');
            return 100;
          }
          return next;
        });
      }, UPDATE_INTERVAL);
    } else if (allowDwell && direction === 'DOWN') {
      setDwellProgressUp(0);
      interval = window.setInterval(() => {
        setDwellProgressDown(prev => {
          const next = prev + (UPDATE_INTERVAL / DWELL_TIME) * 100;
          if (next >= 100) {
            clearInterval(interval);
            safeNavigate(navigate, '/t9');
            return 100;
          }
          return next;
        });
      }, UPDATE_INTERVAL);
    } else {
      setDwellProgressUp(0);
      setDwellProgressDown(0);
    }

    return () => clearInterval(interval);
  }, [direction, allowDwell, navigate]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Section - Look Mode */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: direction === 'UP' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
        transition: 'background 0.3s ease',
        position: 'relative'
      }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--accent-primary)' }}>Modo Look</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Mira hacia <b>arriba</b> para seleccionar</p>
        
        {/* Progress Bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '8px', background: 'var(--accent-primary)', width: `${dwellProgressUp}%`, transition: 'width 0.1s linear' }} />
      </div>

      {/* Divider */}
      <div style={{ height: '4px', background: 'var(--bg-tertiary)' }} />

      {/* Bottom Section - T9 Mode */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: direction === 'DOWN' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
        transition: 'background 0.3s ease',
        position: 'relative'
      }}>
        {/* Progress Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, height: '8px', background: 'var(--success)', width: `${dwellProgressDown}%`, transition: 'width 0.1s linear' }} />
        
        <h1 style={{ fontSize: '3rem', color: 'var(--success)' }}>Modo T9 (Teclado)</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Mira hacia <b>abajo</b> para seleccionar</p>
      </div>

      {/* Settings Button */}
      <button 
        onClick={() => navigate('/settings')}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          padding: '1rem',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '2px solid var(--bg-tertiary)'
        }}
      >
        <SettingsIcon size={24} />
      </button>

      {/* Camera Status */}
      {!isReady && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--warning)', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
          Cargando cámara y modelos...
        </div>
      )}
    </div>
  );
};

export default Home;
