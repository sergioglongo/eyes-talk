import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';
import { playChime } from '../utils/audio';
import { CheckCircle2, ArrowLeft, Target, Play, RotateCcw } from 'lucide-react';
import { DwellButton } from '../components/DwellButton';

interface CalibrationPoint {
  id: string;
  name: string;
  xPct: number; // % of screen width (e.g. 50, 12, 88)
  yPct: number; // % of screen height
}

const CALIBRATION_POINTS: CalibrationPoint[] = [
  { id: 'CENTER', name: '🎯 1/5: CENTRO DE LA PANTALLA', xPct: 50, yPct: 50 },
  { id: 'TOP_LEFT', name: '↖️ 2/5: ESQUINA SUPERIOR IZQUIERDA', xPct: 15, yPct: 18 },
  { id: 'TOP_RIGHT', name: '↗️ 3/5: ESQUINA SUPERIOR DERECHA', xPct: 85, yPct: 18 },
  { id: 'BOTTOM_RIGHT', name: '↘️ 4/5: ESQUINA INFERIOR DERECHA', xPct: 85, yPct: 82 },
  { id: 'BOTTOM_LEFT', name: '↙️ 5/5: ESQUINA INFERIOR IZQUIERDA', xPct: 15, yPct: 82 },
];

const Calibration = () => {
  const navigate = useNavigate();
  const { rawGaze, calibration, saveCalibration } = useTrackingContext();

  const [step, setStep] = useState<'IDLE' | 'COUNTDOWN' | 'SAMPLING' | 'DONE'>('IDLE');
  const [pointIndex, setPointIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);

  // Store raw samples per calibration point
  const pointSamplesRef = useRef<Record<string, { x: number; y: number }[]>>({});
  const rawGazeRef = useRef(rawGaze);

  useEffect(() => {
    rawGazeRef.current = rawGaze;
  }, [rawGaze]);

  const startCalibration = () => {
    pointSamplesRef.current = {};
    setPointIndex(0);
    setStep('COUNTDOWN');
    setCountdown(3);
    setProgress(0);
  };

  // Countdown timer for target start
  useEffect(() => {
    if (step === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setStep('SAMPLING');
        setProgress(0);
      }
    }
  }, [step, countdown]);

  // Sampling procedure for current point
  useEffect(() => {
    if (step === 'SAMPLING') {
      const currentPoint = CALIBRATION_POINTS[pointIndex];
      if (!pointSamplesRef.current[currentPoint.id]) {
        pointSamplesRef.current[currentPoint.id] = [];
      }

      const DURATION = 2000; // 2.0s per point
      const INTERVAL = 40;

      const intervalId = window.setInterval(() => {
        pointSamplesRef.current[currentPoint.id].push({
          x: rawGazeRef.current.x,
          y: rawGazeRef.current.y
        });

        setProgress(prev => {
          const next = prev + (INTERVAL / DURATION) * 100;
          if (next >= 100) {
            clearInterval(intervalId);
            return 100;
          }
          return next;
        });
      }, INTERVAL);

      return () => clearInterval(intervalId);
    }
  }, [step, pointIndex]);

  // Handle completion of current point
  useEffect(() => {
    if (progress >= 100 && step === 'SAMPLING') {
      playChime();
      if (pointIndex < CALIBRATION_POINTS.length - 1) {
        setPointIndex(prev => prev + 1);
        setStep('COUNTDOWN');
        setCountdown(2);
        setProgress(0);
      } else {
        finishMultiPointCalibration();
      }
    }
  }, [progress, step, pointIndex]);

  const finishMultiPointCalibration = () => {
    const samples = pointSamplesRef.current;

    const getAvg = (ptId: string) => {
      const arr = samples[ptId] || [];
      if (arr.length === 0) return { x: 0.5, y: 0.5 };
      const sx = arr.reduce((a, b) => a + b.x, 0);
      const sy = arr.reduce((a, b) => a + b.y, 0);
      return { x: sx / arr.length, y: sy / arr.length };
    };

    const center = getAvg('CENTER');
    const topLeft = getAvg('TOP_LEFT');
    const topRight = getAvg('TOP_RIGHT');
    const bottomRight = getAvg('BOTTOM_RIGHT');
    const bottomLeft = getAvg('BOTTOM_LEFT');

    const minRawX = Math.min(topLeft.x, bottomLeft.x);
    const maxRawX = Math.max(topRight.x, bottomRight.x);

    const minRawY = Math.min(topLeft.y, topRight.y);
    const maxRawY = Math.max(bottomLeft.y, bottomRight.y);

    saveCalibration({
      ...calibration,
      centerRawX: center.x,
      centerRawY: center.y,
      minRawX: Number.isFinite(minRawX) ? minRawX : center.x - 0.2,
      maxRawX: Number.isFinite(maxRawX) ? maxRawX : center.x + 0.2,
      minRawY: Number.isFinite(minRawY) ? minRawY : center.y - 0.15,
      maxRawY: Number.isFinite(maxRawY) ? maxRawY : center.y + 0.15,
    });

    setStep('DONE');
  };

  const activePoint = CALIBRATION_POINTS[pointIndex];

  return (
    <div style={{ 
      height: '100%', 
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--bg-tertiary)', zIndex: 500 }}>
        <DwellButton 
          onClick={() => navigate('/')}
          style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.6rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}
        >
          <ArrowLeft size={24} /> Volver
        </DwellButton>

        <h2 style={{ margin: 0, color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
          <Target size={28} /> Calibración Multipunto (5 Puntos de Mirada)
        </h2>

        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--warning)' }}>
          {step === 'SAMPLING' || step === 'COUNTDOWN' ? `Punto ${pointIndex + 1} de 5` : ''}
        </div>
      </div>

      {/* Main Body Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* State 1: IDLE WELCOME SCREEN WITH GIANT DWELLBUTTON */}
        {step === 'IDLE' && (
          <div style={{ textAlign: 'center', maxWidth: '650px', background: 'var(--bg-secondary)', padding: '3rem', borderRadius: 'var(--radius-md)', border: '3px solid var(--accent-hover)', boxShadow: '0 0 40px rgba(0,0,0,0.6)', zIndex: 1000 }}>
            <Target size={70} color="var(--accent-hover)" style={{ marginBottom: '1rem' }} />
            
            <h2 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Calibración de Márgenes y Centro
            </h2>

            <p style={{ fontSize: '1.25rem', lineHeight: '1.6', marginBottom: '2.5rem', color: 'var(--text-secondary)' }}>
              Te guiaremos por <b>5 puntos diana</b> en la pantalla (Centro, Arriba-Izq, Arriba-Der, Abajo-Der, Abajo-Izq) para medir la amplitud exacta de tu mirada.
            </p>

            <DwellButton 
              onClick={startCalibration}
              style={{ 
                padding: '1.5rem 3rem', 
                fontSize: '1.8rem', 
                fontWeight: '900', 
                background: 'var(--accent-primary)', 
                color: '#ffffff',
                border: '3px solid var(--accent-hover)', 
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 0 25px var(--accent-primary)'
              }}
            >
              <Play size={36} /> 🎯 INICIAR CALIBRACIÓN (5 PUNTOS)
            </DwellButton>
          </div>
        )}

        {/* State 2: COUNTDOWN */}
        {step === 'COUNTDOWN' && (
          <div style={{ 
            position: 'absolute',
            left: `${activePoint.xPct}%`,
            top: `${activePoint.yPct}%`,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 1000
          }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-hover)', marginBottom: '0.5rem', whiteSpace: 'nowrap', background: 'rgba(15, 23, 42, 0.9)', padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-hover)' }}>
              {activePoint.name}
            </p>
            <span style={{ fontSize: '6rem', fontWeight: '900', color: 'var(--warning)', textShadow: '0 0 20px rgba(245, 158, 11, 0.8)' }}>
              {countdown}
            </span>
          </div>
        )}

        {/* State 3: SAMPLING */}
        {step === 'SAMPLING' && (
          <div style={{ 
            position: 'absolute',
            left: `${activePoint.xPct}%`,
            top: `${activePoint.yPct}%`,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '1rem', whiteSpace: 'nowrap', background: 'rgba(15, 23, 42, 0.95)', padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-hover)' }}>
              Fija tu mirada aquí 🎯
            </p>

            {/* Target Ring Dot */}
            <div style={{ 
              width: '85px', 
              height: '85px', 
              borderRadius: '50%', 
              background: 'var(--danger)', 
              boxShadow: '0 0 40px var(--danger)',
              border: '5px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#ffffff' }} />
            </div>

            {/* Progress bar */}
            <div style={{ width: '260px', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '7px', overflow: 'hidden', border: '2px solid var(--accent-hover)' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#FACC15', boxShadow: '0 0 10px #FACC15', transition: 'width 0.04s linear' }} />
            </div>
          </div>
        )}

        {/* State 4: DONE COMPLETION SCREEN */}
        {step === 'DONE' && (
          <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '3rem', borderRadius: 'var(--radius-md)', border: '3px solid var(--success)', maxWidth: '650px', zIndex: 1000 }}>
            <CheckCircle2 size={80} color="var(--success)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '2.5rem' }}>
              ¡Calibración Multipunto Completada! 🎉
            </h2>
            <p style={{ fontSize: '1.3rem', marginBottom: '2.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Registramos los 4 márgenes de tu pantalla y el centro exacto de tu mirada.
              El puntero ahora se desplazará con total precisión de esquina a esquina.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
              <DwellButton 
                onClick={() => navigate('/t9')}
                style={{ padding: '1.2rem 2.5rem', background: 'var(--accent-primary)', border: 'none', fontSize: '1.3rem', fontWeight: 'bold', borderRadius: 'var(--radius-md)' }}
              >
                🚀 Ir a Escribir (T9)
              </DwellButton>

              <DwellButton 
                onClick={startCalibration}
                style={{ padding: '1.2rem 2.5rem', background: 'var(--bg-tertiary)', border: 'none', fontSize: '1.3rem', fontWeight: 'bold', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RotateCcw size={22} /> Recalibrar
              </DwellButton>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Controls Bar (Visible during sampling/countdown to allow reset) */}
      {(step === 'COUNTDOWN' || step === 'SAMPLING') && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderTop: '2px solid var(--bg-tertiary)', zIndex: 500 }}>
          <DwellButton
            onClick={() => setStep('IDLE')}
            style={{ padding: '0.7rem 2rem', fontSize: '1.2rem', background: 'var(--bg-tertiary)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RotateCcw size={22} /> Reiniciar Calibración
          </DwellButton>
        </div>
      )}

    </div>
  );
};

export default Calibration;
