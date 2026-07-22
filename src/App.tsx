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
      {/* Pause / Rest Mode Overlay Banner (Centered, Large & Prominent) */}
      {isPaused && (
        <div 
          onClick={togglePause}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
            cursor: 'pointer',
            padding: '2rem'
          }}
        >
          <div style={{
            background: 'var(--bg-secondary)',
            border: '4px solid var(--danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 4rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            boxShadow: '0 0 50px rgba(239, 68, 68, 0.6)',
            textAlign: 'center',
            maxWidth: '750px'
          }}>
            <div style={{ fontSize: '4.5rem', margin: 0, lineHeight: 1 }}>⏸️</div>
            <h1 style={{ fontSize: '3rem', color: '#ffffff', margin: 0, fontWeight: '900' }}>
              MODO PAUSA / DESCANSO
            </h1>
            <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', margin: 0 }}>
              El puntero y la selección por mirada están suspendidos.
            </p>
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid var(--danger)',
              color: '#ffffff',
              padding: '0.9rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              marginTop: '0.5rem'
            }}>
              👁️ Pestañea 3 veces rápidas (o haz clic aquí) para reanudar
            </div>
          </div>
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

      {/* Visual Cursor Dot (completely hidden when paused or in calibration) */}
      {location.pathname !== '/calibration' && location.pathname !== '/calibrate' && !isPaused && (
        <div 
          style={{
            position: 'fixed',
            left: `${cursor.x * 100}vw`,
            top: `${cursor.y * 100}vh`,
            width: '22px',
            height: '22px',
            background: 'var(--accent-hover)',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 99999,
            boxShadow: '0 0 15px rgba(96, 165, 250, 0.9)'
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
