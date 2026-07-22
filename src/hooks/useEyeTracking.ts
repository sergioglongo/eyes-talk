import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type TrackingDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER';
export type TrackingMode = 'HEAD' | 'GAZE';
export type SelectionMethod = 'DWELL' | 'BLINK' | 'BOTH';

export type T9InputMode = 'EXTENDED_WINDOW' | 'SUBMENU' | 'CAROUSEL' | 'PREDICTIVE';

export interface CalibrationData {
  centerRawX: number;
  centerRawY: number;
  minRawX: number;
  maxRawX: number;
  minRawY: number;
  maxRawY: number;
  sensitivity: number;
  mode: TrackingMode;
  selectionMethod: SelectionMethod;
  blinkDuration: number; // in seconds (e.g. 0.4)
  speechRate: number; // 0.5 to 1.5
  speechVolume: number; // 0.1 to 1.0
  selectedVoiceURI: string; // Voice URI or name
  t9InputMode: T9InputMode;
}

export interface TrackingData {
  cursor: { x: number; y: number }; // 0 to 1 relative to screen (calibrated)
  rawGaze: { x: number; y: number }; // Uncalibrated raw values for calibration sampling
  direction: TrackingDirection;
  isBlinking: boolean;
  isIntentionalBlink: boolean; // Triggered when closing eyes for configured duration
  isEyesClosedLong: boolean; // For 3-second escape
  isReady: boolean;
  calibration: CalibrationData;
  saveCalibration: (newCalib: CalibrationData) => void;
}

const DEFAULT_CALIBRATION: CalibrationData = {
  centerRawX: 0.5,
  centerRawY: 0.5,
  minRawX: 0.3,
  maxRawX: 0.7,
  minRawY: 0.3,
  maxRawY: 0.7,
  sensitivity: 3.5,
  mode: 'HEAD', // Default to HEAD tracking for reliable webcam testing
  selectionMethod: 'BOTH', // Default to BOTH (Dwell or Blink)
  blinkDuration: 0.4,
  speechRate: 1.0, // Default to normal speed (1.0x)
  speechVolume: 1.0, // Default to 100% volume
  selectedVoiceURI: '', // Default to auto-detected Spanish voice
  t9InputMode: 'PREDICTIVE', // Default to Predictive T9 1-Tap mode
};

export const useEyeTracking = (): TrackingData => {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const [rawGaze, setRawGaze] = useState({ x: 0.5, y: 0.5 });
  const [direction, setDirection] = useState<TrackingDirection>('CENTER');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isIntentionalBlink, setIsIntentionalBlink] = useState(false);
  const [isEyesClosedLong, setIsEyesClosedLong] = useState(false);
  
  const [calibration, setCalibration] = useState<CalibrationData>(() => {
    const saved = localStorage.getItem('eyes_talk_calibration');
    if (saved) {
      try {
        return { ...DEFAULT_CALIBRATION, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse calibration', e);
      }
    }
    return DEFAULT_CALIBRATION;
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const eyesClosedStartTime = useRef<number | null>(null);

  const saveCalibration = useCallback((newCalib: CalibrationData) => {
    setCalibration(newCalib);
    localStorage.setItem('eyes_talk_calibration', JSON.stringify(newCalib));
  }, []);

  // Track physical mouse movement to allow mouse override
  const lastMouseTime = useRef<number>(0);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMouseTime.current = Date.now();
      setCursor({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });

        if (isMounted) {
          setLandmarker(faceLandmarker);
        }
      } catch (error) {
        console.error('Error initializing MediaPipe:', error);
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
    };
  }, []);

  // Start Webcam
  useEffect(() => {
    if (!landmarker) return;

    const video = document.createElement('video');
    video.style.display = 'none';
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;
    document.body.appendChild(video);

    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 1280, 
        height: 720, 
        facingMode: 'user' 
      } 
    }).then((stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        setIsReady(true);
      };
    }).catch(err => {
      console.error('Webcam access error:', err);
    });

    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
    };
  }, [landmarker]);

  // Main Detection Loop
  useEffect(() => {
    if (!isReady || !landmarker || !videoRef.current) return;

    const video = videoRef.current;

    const detectFrame = () => {
      if (video && landmarker && video.currentTime > 0) {
        const results = landmarker.detectForVideo(video, performance.now());
        
        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          const shapes = results.faceBlendshapes[0].categories;
          
          // Find blink values (threshold 0.35 for better sensitivity)
          const leftBlink = shapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score || 0;
          const rightBlink = shapes.find(s => s.categoryName === 'eyeBlinkRight')?.score || 0;
          
          const eyesClosed = leftBlink > 0.35 && rightBlink > 0.35;
          setIsBlinking(eyesClosed);

          // Handle eyes closed (Intentional blink within strict [MIN, MAX] window vs 3-second escape)
          const minBlinkMs = (calibration.blinkDuration || 0.4) * 1000;
          const maxBlinkMs = minBlinkMs + 400; // e.g. 0.4s to 0.8s max window

          if (eyesClosed) {
            if (!eyesClosedStartTime.current) {
              eyesClosedStartTime.current = Date.now();
            } else {
              const duration = Date.now() - eyesClosedStartTime.current;
              if (duration >= 3000) {
                setIsEyesClosedLong(true);
              }
            }
          } else {
            if (eyesClosedStartTime.current) {
              const duration = Date.now() - eyesClosedStartTime.current;
              if (duration >= minBlinkMs && duration <= maxBlinkMs && !isEyesClosedLong) {
                setIsIntentionalBlink(true);
                setTimeout(() => setIsIntentionalBlink(false), 50);
              }
            }
            eyesClosedStartTime.current = null;
            setIsEyesClosedLong(false);
          }

          // --- Tracking Logic (HEAD vs GAZE) ---
          if (Date.now() - lastMouseTime.current > 2000) {
            let rawX = 0.5;
            let rawY = 0.5;

            if (calibration.mode === 'HEAD' && results.faceLandmarks && results.faceLandmarks.length > 0) {
              // Head Tracking using Nose Landmark (index 1)
              const nose = results.faceLandmarks[0][1];
              // Mirror X because camera is mirrored
              rawX = 1.0 - nose.x;
              rawY = nose.y;
            } else {
              // Gaze Tracking via Eye Blendshapes
              const getShape = (name: string) => shapes.find(s => s.categoryName === name)?.score || 0;
              
              const lookLeft = (getShape('eyeLookOutLeft') + getShape('eyeLookInRight')) / 2;
              const lookRight = (getShape('eyeLookInLeft') + getShape('eyeLookOutRight')) / 2;
              const lookUp = (getShape('eyeLookUpLeft') + getShape('eyeLookUpRight')) / 2;
              const lookDown = (getShape('eyeLookDownLeft') + getShape('eyeLookDownRight')) / 2;

              rawX = 0.5 - lookLeft + lookRight;
              rawY = 0.5 - lookUp + lookDown;
            }

            setRawGaze({ x: rawX, y: rawY });

            // Apply Multi-Point Calibration bounds (minRawX/maxRawX, minRawY/maxRawY)
            const minX = calibration.minRawX ?? (calibration.centerRawX - 0.2);
            const maxX = calibration.maxRawX ?? (calibration.centerRawX + 0.2);
            const minY = calibration.minRawY ?? (calibration.centerRawY - 0.15);
            const maxY = calibration.maxRawY ?? (calibration.centerRawY + 0.15);

            const rangeX = Math.max(0.04, maxX - minX);
            const rangeY = Math.max(0.04, maxY - minY);

            // Normalize raw coordinate within calibrated bounding box -> [0, 1]
            let normX = (rawX - minX) / rangeX;
            let normY = (rawY - minY) / rangeY;

            // Apply sensitivity multiplier centered at 0.5
            const deltaX = normX - 0.5;
            const deltaY = normY - 0.5;
            const sensFactor = (calibration.sensitivity || 3.5) / 3.5;

            let x = 0.5 + deltaX * sensFactor;
            let y = 0.5 + deltaY * sensFactor;

            // Clamp to screen bounds
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));

            // Smooth interpolation
            const lerpFactor = calibration.mode === 'HEAD' ? 0.22 : 0.15;

            setCursor(prev => {
              const smoothedX = prev.x + (x - prev.x) * lerpFactor;
              const smoothedY = prev.y + (y - prev.y) * lerpFactor;
              
              let newDir: TrackingDirection = 'CENTER';
              if (smoothedX < 0.3) newDir = 'LEFT';
              else if (smoothedX > 0.7) newDir = 'RIGHT';
              else if (smoothedY < 0.3) newDir = 'UP';
              else if (smoothedY > 0.7) newDir = 'DOWN';

              setDirection(prevDir => (prevDir !== newDir ? newDir : prevDir));

              const movedX = Math.abs(prev.x - smoothedX) > 0.003;
              const movedY = Math.abs(prev.y - smoothedY) > 0.003;
              
              if (movedX || movedY) {
                return { x: smoothedX, y: smoothedY };
              }
              return prev;
            });
          }
        }
      }

      animFrameId.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isReady, landmarker, calibration, isEyesClosedLong]);

  return {
    cursor,
    rawGaze,
    direction,
    isBlinking,
    isIntentionalBlink,
    isEyesClosedLong,
    isReady,
    calibration,
    saveCalibration,
  };
};
