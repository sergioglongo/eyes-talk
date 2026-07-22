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
  const { cursor } = useTrackingContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Back Button (hidden on Home, LookMode, and T9Mode which have integrated back bars) */}
      {location.pathname !== '/' && location.pathname !== '/look' && location.pathname !== '/t9' && (
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

      {/* Visual Cursor Dot (hidden during calibration to avoid distraction/head strain) */}
      {location.pathname !== '/calibrate' && (
        <div 
          style={{
            position: 'fixed',
            left: `${cursor.x * 100}vw`,
            top: `${cursor.y * 100}vh`,
            width: '20px',
            height: '20px',
            background: 'var(--accent-hover)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', // Critical so it doesn't block hover
            zIndex: 1000,
            boxShadow: '0 0 10px rgba(96, 165, 250, 0.8)'
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
          <Route path="/calibrate" element={<Calibration />} />
        </Routes>
      </div>
    </TrackingProvider>
  );
}

export default App;
