import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type TrackingDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER';
export type TrackingMode = 'HEAD' | 'GAZE';
export type SelectionMethod = 'DWELL' | 'BLINK' | 'BOTH';

export interface CalibrationData {
  centerRawX: number;
  centerRawY: number;
  sensitivity: number;
  mode: TrackingMode;
  selectionMethod: SelectionMethod;
  blinkDuration: number; // in seconds (e.g. 0.4)
  speechRate: number; // 0.5 to 1.5
  speechVolume: number; // 0.1 to 1.0
  selectedVoiceURI: string; // Voice URI or name
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
  sensitivity: 3.5,
  mode: 'HEAD', // Default to HEAD tracking for reliable webcam testing
  selectionMethod: 'BOTH', // Default to BOTH (Dwell or Blink)
  blinkDuration: 0.4, // Default to 0.4 seconds (400ms)
  speechRate: 1.0, // Default to normal speed (1.0x)
  speechVolume: 1.0, // Default to 100% volume
  selectedVoiceURI: '', // Default to auto-detected Spanish voice
};

export const useEyeTracking = (): TrackingData => {
  const [isReady, setIsReady] = useState(false);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const [rawGaze, setRawGaze] = useState({ x: 0.5, y: 0.5 });
  const [direction, setDirection] = useState<TrackingDirection>('CENTER');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isIntentionalBlink, setIsIntentionalBlink] = useState(false);
  const [isEyesClosedLong, setIsEyesClosedLong] = useState(false);

  // Calibration state loaded from localStorage
  const [calibration, setCalibrationState] = useState<CalibrationData>(() => {
    const saved = localStorage.getItem('eyes_talk_calibration');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CALIBRATION, ...parsed };
      } catch (e) { console.error(e); }
    }
    return DEFAULT_CALIBRATION;
  });

  const saveCalibration = useCallback((newCalib: CalibrationData) => {
    setCalibrationState(newCalib);
    localStorage.setItem('eyes_talk_calibration', JSON.stringify(newCalib));
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const eyesClosedStartTime = useRef<number | null>(null);
  const hasTriggeredIntentionalBlink = useRef<boolean>(false);
  const lastMouseTime = useRef<number>(0);

  // Fallback / Hardware Eye Tracker support: Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Ignore mouse on calibration page so mouse clicks don't override the camera sampling
      if (window.location.pathname === '/calibrate') return;

      lastMouseTime.current = Date.now();
      // Map mouse position to 0-1
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setCursor({ x, y });

      // Determine direction based on quadrants
      if (x < 0.3) setDirection('LEFT');
      else if (x > 0.7) setDirection('RIGHT');
      else if (y < 0.3) setDirection('UP');
      else if (y > 0.7) setDirection('DOWN');
      else setDirection('CENTER');
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const initializeMediaPipe = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });
      
      landmarkerRef.current = landmarker;
      
      // Setup webcam
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      videoRef.current = video;

      video.addEventListener('loadeddata', () => {
        setIsReady(true);
        predictWebcam();
      });

    } catch (err) {
      console.error('Error initializing MediaPipe or Webcam:', err);
      // Even if webcam fails, we have mouse tracking ready
      setIsReady(true); 
    }
  }, []);

  const predictWebcam = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    
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
              // Valid Intentional Blink released within strict [MIN, MAX] window!
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

          // Apply Calibration offset & sensitivity
          const deltaX = rawX - calibration.centerRawX;
          const deltaY = rawY - calibration.centerRawY;

          // Mode multiplier: HEAD tracking needs a moderate boost (~2.5x) so head movement is natural and settings are effective.
          const modeMultiplier = calibration.mode === 'HEAD' ? 2.5 : 1.0;
          const yMultiplier = calibration.mode === 'GAZE' ? 2.5 : 1.2;

          let x = 0.5 + deltaX * (calibration.sensitivity * modeMultiplier);
          let y = 0.5 + deltaY * (calibration.sensitivity * modeMultiplier * yMultiplier);
          
          // Clamp to screen bounds
          x = Math.max(0, Math.min(1, x));
          y = Math.max(0, Math.min(1, y));

          // Throttle state updates to prevent re-rendering the entire React tree 60 times per second
          const lerpFactor = calibration.mode === 'HEAD' ? 0.2 : 0.12;

          setCursor(prev => {
            const smoothedX = prev.x + (x - prev.x) * lerpFactor;
            const smoothedY = prev.y + (y - prev.y) * lerpFactor;
            
            let newDir: TrackingDirection = 'CENTER';
            if (smoothedX < 0.3) newDir = 'LEFT';
            else if (smoothedX > 0.7) newDir = 'RIGHT';
            else if (smoothedY < 0.3) newDir = 'UP';
            else if (smoothedY > 0.7) newDir = 'DOWN';

            // Only update direction state if it actually changed
            setDirection(prevDir => (prevDir !== newDir ? newDir : prevDir));

            // Only update cursor state if it moved significantly (> 0.003 normalized)
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
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  useEffect(() => {
    initializeMediaPipe();
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, [initializeMediaPipe]);

  return { 
    cursor, 
    rawGaze, 
    direction, 
    isBlinking, 
    isIntentionalBlink,
    isEyesClosedLong, 
    isReady, 
    calibration, 
    saveCalibration 
  };
};
