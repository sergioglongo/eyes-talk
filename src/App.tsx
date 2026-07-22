import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { TrackingProvider, useTrackingContext } from './context/TrackingContext';
import Home from './pages/Home';
import LookMode from './pages/LookMode';
import T9Mode from './pages/T9Mode';
import Settings from './pages/Settings';
import Calibration from './pages/Calibration';
import { ArrowLeft } from 'lucide-react';
import { DwellButton } from './components/DwellButton';
import { playChime } from './utils/audio';
import { safeNavigate } from './utils/navigation';

// Global escape listener component
const GlobalEscapeHandler = () => {
  const navigate = useNavigate();
  const { isEyesClosedLong } = useTrackingContext();

  useEffect(() => {
    if (isEyesClosedLong) {
      playChime();
      safeNavigate(navigate, '/');
    }
  }, [isEyesClosedLong, navigate]);

  return null;
};

// Global UI Overlays (Cursor and Back Button)
const GlobalUI = () => {
  const { cursor, isPaused, togglePause } = useTrackingContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Pause / Rest Mode Overlay Banner */}
      {isPaused && (
        <div 
          onClick={togglePause}
          style={{
            position: 'fixed',
            top: '1.2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '0.8rem 2.2rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            cursor: 'pointer',
            border: '2px solid #ffffff'
          }}
        >
          <span>⏸️ MODO PAUSA / DESCANSO ACTIVADO</span>
          <span style={{ fontSize: '0.95rem', opacity: 0.9, background: 'rgba(0,0,0,0.2)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            Pestañea 3 veces rápidas para reanudar
          </span>
        </div>
      )}

      {/* Floating Back Button */}
      {location.pathname !== '/' && location.pathname !== '/look' && location.pathname !== '/t9' && location.pathname !== '/settings' && location.pathname !== '/calibration' && location.pathname !== '/calibrate' && (
        <DwellButton 
          onClick={() => safeNavigate(navigate, '/')}
          dwellTime={1500}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            zIndex: 999
          }}
        >
          <ArrowLeft size={32} />
        </DwellButton>
      )}

      {/* Visual Cursor Dot */}
      {location.pathname !== '/calibration' && location.pathname !== '/calibrate' && (
        <div 
          style={{
            position: 'fixed',
            left: `${cursor.x * 100}vw`,
            top: `${cursor.y * 100}vh`,
            width: '22px',
            height: '22px',
            background: isPaused ? 'rgba(239, 68, 68, 0.5)' : 'var(--accent-hover)',
            border: isPaused ? '2px solid #ef4444' : '2px solid #ffffff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 99999,
            boxShadow: isPaused ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(96, 165, 250, 0.9)',
            opacity: isPaused ? 0.6 : 1
          }}
        />
      )}
    </>
  );
};

function App() {
  return (
    <TrackingProvider>
      <div className="app-container">
        <GlobalEscapeHandler />
        <GlobalUI />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/look" element={<LookMode />} />
          <Route path="/t9" element={<T9Mode />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/calibration" element={<Calibration />} />
          <Route path="/calibrate" element={<Calibration />} />
        </Routes>
      </div>
    </TrackingProvider>
  );
}

export default App;
