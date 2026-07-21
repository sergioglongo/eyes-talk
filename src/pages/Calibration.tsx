import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';

const Calibration = () => {
  const navigate = useNavigate();
  const { rawGaze, calibration, saveCalibration } = useTrackingContext();

  const [step, setStep] = useState<'IDLE' | 'COUNTDOWN' | 'CALIBRATING' | 'DONE'>('IDLE');
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const samplesRef = useRef<{ x: number; y: number }[]>([]);

  // Start Calibration Procedure
  const startCalibration = () => {
    samplesRef.current = [];
    setStep('COUNTDOWN');
    setCountdown(3);
  };

  // Countdown timer
  useEffect(() => {
    if (step === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setStep('CALIBRATING');
        setProgress(0);
      }
    }
  }, [step, countdown]);

  const rawGazeRef = useRef(rawGaze);
  useEffect(() => {
    rawGazeRef.current = rawGaze;
  }, [rawGaze]);

  // Sampling procedure
  useEffect(() => {
    if (step === 'CALIBRATING') {
      const CALIBRATION_DURATION = 2500; // 2.5 seconds
      const SAMPLE_INTERVAL = 50;
      
      const interval = window.setInterval(() => {
        samplesRef.current.push({ x: rawGazeRef.current.x, y: rawGazeRef.current.y });
        
        setProgress(prev => {
          const next = prev + (SAMPLE_INTERVAL / CALIBRATION_DURATION) * 100;
          if (next >= 100) {
            clearInterval(interval);
            return 100;
          }
          return next;
        });
      }, SAMPLE_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (progress >= 100 && step === 'CALIBRATING') {
      finishCalibration();
    }
  }, [progress, step]);

  const finishCalibration = () => {
    if (samplesRef.current.length === 0) return;

    // Calculate averages
    const sumX = samplesRef.current.reduce((acc, s) => acc + s.x, 0);
    const sumY = samplesRef.current.reduce((acc, s) => acc + s.y, 0);
    
    const avgX = sumX / samplesRef.current.length;
    const avgY = sumY / samplesRef.current.length;

    saveCalibration({
      ...calibration,
      centerRawX: avgX,
      centerRawY: avgY,
    });

    setStep('DONE');
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative'
    }}>
      <h1 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Calibración de Mirada</h1>

      {step === 'IDLE' && (
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
            Ponte en tu postura natural y cómoda (no muevas la cabeza). 
            La aplicación registrará hacia dónde miran tus ojos cuando observas el centro.
          </p>
          <button 
            onClick={startCalibration}
            style={{ padding: '1rem 2.5rem', fontSize: '1.5rem', background: 'var(--accent-primary)', border: 'none' }}
          >
            Iniciar Calibración
          </button>
        </div>
      )}

      {step === 'COUNTDOWN' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Prepárate! Mira al centro de la pantalla en...</p>
          <span style={{ fontSize: '6rem', fontWeight: 'bold', color: 'var(--warning)' }}>{countdown}</span>
        </div>
      )}

      {step === 'CALIBRATING' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>
            <b>Mantén la mirada fija en el objetivo central</b>
          </p>
          
          {/* Target Dot */}
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'var(--danger)', 
            boxShadow: '0 0 20px var(--danger)',
            marginBottom: '2rem',
            animation: 'pulse 1s infinite alternate'
          }} />

          {/* Progress bar */}
          <div style={{ width: '300px', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.05s linear' }} />
          </div>
        </div>
      )}

      {step === 'DONE' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '2.5rem' }}>¡Calibración Completada! 🎉</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
            El centro de tus ojos ha sido registrado con éxito.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => navigate('/')}
              style={{ padding: '1rem 2rem', background: 'var(--accent-primary)', border: 'none', fontSize: '1.2rem' }}
            >
              Ir al Inicio
            </button>
            <button 
              onClick={startCalibration}
              style={{ padding: '1rem 2rem', background: 'var(--bg-tertiary)', border: 'none', fontSize: '1.2rem' }}
            >
              Volver a Calibrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calibration;
