import { useState, useEffect, useCallback } from 'react';
import { useTrackingContext } from '../context/TrackingContext';

export const useTTS = () => {
  const { calibration } = useTrackingContext();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const loadVoices = useCallback(() => {
    if ('speechSynthesis' in window) {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-Speech no está soportado en este navegador.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Default language
    utterance.rate = calibration?.speechRate ?? 1.0;
    utterance.volume = calibration?.speechVolume ?? 1.0;
    utterance.pitch = 1.0;

    const availableVoices = window.speechSynthesis.getVoices();
    
    if (calibration?.selectedVoiceURI) {
      const match = availableVoices.find(v => v.voiceURI === calibration.selectedVoiceURI || v.name === calibration.selectedVoiceURI);
      if (match) {
        utterance.voice = match;
      }
    }

    // Fallback if no specific voice selected: Find Microsoft Elena or es-AR voice first
    if (!utterance.voice) {
      const elenaOrArgVoice = availableVoices.find(v => 
        v.name.toLowerCase().includes('elena') || 
        v.lang.toLowerCase() === 'es-ar' || 
        v.lang.toLowerCase().replace('_', '-').startsWith('es-ar')
      );

      if (elenaOrArgVoice) {
        utterance.voice = elenaOrArgVoice;
      } else {
        const spanishVoice = availableVoices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }
      }
    }

    window.speechSynthesis.speak(utterance);
  }, [calibration]);

  return { speak, voices };
};
