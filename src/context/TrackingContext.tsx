import { createContext, useContext, type ReactNode } from 'react';
import { useEyeTracking } from '../hooks/useEyeTracking';
import type { TrackingData } from '../hooks/useEyeTracking';

const TrackingContext = createContext<TrackingData | null>(null);

export const TrackingProvider = ({ children }: { children: ReactNode }) => {
  const trackingData = useEyeTracking();

  return (
    <TrackingContext.Provider value={trackingData}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTrackingContext = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTrackingContext must be used within TrackingProvider');
  }
  return context;
};
