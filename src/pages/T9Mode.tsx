import { useState, useRef, useEffect, useMemo } from 'react';
import { DwellButton } from '../components/DwellButton';
import { useTTS } from '../hooks/useTTS';
import { useTrackingContext } from '../context/TrackingContext';
import { playChime } from '../utils/audio';
import { getT9Predictions, learnCustomWord } from '../services/t9Predictor';
import { Delete, Trash2, X, ArrowLeft, Volume2, Pause, Play, Sparkles, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../utils/navigation';
import type { T9InputMode } from '../hooks/useEyeTracking';

const MAIN_T9_KEYS = [
  { id: '1', chars: '.,!?' }, { id: '2', chars: 'ABC' }, { id: '3', chars: 'DEF' },
  { id: '4', chars: 'GHI' }, { id: '5', chars: 'JKL' }, { id: '6', chars: 'MNOÑ' },
  { id: '7', chars: 'PQRS' }, { id: '8', chars: 'TUV' }, { id: '9', chars: 'WXYZ' }
];

const T9Mode = () => {
  const [text, setText] = useState('');
  const [t9Sequence, setT9Sequence] = useState<string>(''); // For PREDICTIVE 1-tap mode (e.g. "4652")
  const { speak } = useTTS();
  const { calibration, saveCalibration } = useTrackingContext();
  const navigate = useNavigate();

  const t9InputMode: T9InputMode = calibration.t9InputMode || 'PREDICTIVE';
  const showPauseButton = calibration.selectionMethod !== 'BLINK'; // Only show PAUSE if DWELL is active

  // Cycle to next T9 input mode on the fly
  const toggleT9InputMode = () => {
    const modes: T9InputMode[] = ['PREDICTIVE', 'EXTENDED_WINDOW', 'SUBMENU', 'CAROUSEL'];
    const currentIndex = modes.indexOf(t9InputMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    // Reset transient mode states
    setT9Sequence('');
    setActiveSubmenuKey(null);
    setActiveCarouselState(null);
    
    playChime();
    saveCalibration({
      ...calibration,
      t9InputMode: nextMode
    });
  };

  // Pause / Rest state
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Suggestion Selection Cooldown state
  const [isSuggestionCooldown, setIsSuggestionCooldown] = useState<boolean>(false);

  // Submenu overlay state (Mode 2)
  const [activeSubmenuKey, setActiveSubmenuKey] = useState<typeof MAIN_T9_KEYS[0] | null>(null);
  const [isModalOpening, setIsModalOpening] = useState<boolean>(false);
  const isCooldownRef = useRef<boolean>(false);

  // Multi-tap state (Mode 1)
  const [lastPress, setLastPress] = useState<{ id: string, time: number, charIndex: number } | null>(null);

  // Carousel continuous state (Mode 3)
  const [activeCarouselState, setActiveCarouselState] = useState<{ keyId: string; chars: string; index: number } | null>(null);

  const MULTI_TAP_TIMEOUT = t9InputMode === 'EXTENDED_WINDOW' ? 3500 : 1500;

  // Extract previous word for bi-gram next-word prediction
  const previousWord = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    const words = trimmed.split(/\s+/);
    return words[words.length - 1] || '';
  }, [text]);

  // Compute live predictive candidates (top 6 candidate words)
  const predictions = useMemo(() => {
    return getT9Predictions(t9Sequence, previousWord);
  }, [t9Sequence, previousWord]);

  // Handle continuous rotation in CAROUSEL MODE
  useEffect(() => {
    let interval: number;

    if (t9InputMode === 'CAROUSEL' && activeCarouselState && !isPaused) {
      interval = window.setInterval(() => {
        setActiveCarouselState(prev => {
          if (!prev) return null;
          const nextIndex = (prev.index + 1) % prev.chars.length;
          const nextChar = prev.chars[nextIndex];
          
          setText(t => t.slice(0, -1) + nextChar);
          playChime();
          
          return { ...prev, index: nextIndex };
        });
      }, 850);
    }

    return () => clearInterval(interval);
  }, [t9InputMode, activeCarouselState, isPaused]);

  const handleKeyHoverState = (keyId: string, isHovered: boolean) => {
    if (!isHovered && activeCarouselState?.keyId === keyId) {
      setActiveCarouselState(null);
    }
  };

  const openSubmenu = (key: typeof MAIN_T9_KEYS[0]) => {
    if (isPaused) return;
    setActiveSubmenuKey(key);
    setIsModalOpening(true);
    setTimeout(() => {
      setIsModalOpening(false);
    }, 600);
  };

  const handleKeyPress = (key: typeof MAIN_T9_KEYS[0]) => {
    if (isCooldownRef.current || isPaused) return;

    // MODE 4: PREDICTIVE 1-TAP MODE
    if (t9InputMode === 'PREDICTIVE') {
      if (key.id === '1') {
        setText(t => t + '. ');
        setT9Sequence('');
        return;
      }
      setT9Sequence(prev => prev + key.id);
      return;
    }

    // MODE 2: SUBMENU MODE
    if (t9InputMode === 'SUBMENU') {
      if (key.chars.length === 1) {
        setText(t => t + key.chars);
      } else {
        openSubmenu(key);
      }
      return;
    }

    // MODE 3: CAROUSEL MODE
    if (t9InputMode === 'CAROUSEL') {
      const firstChar = key.chars[0];
      setText(t => t + firstChar);
      if (key.chars.length > 1) {
        setActiveCarouselState({ keyId: key.id, chars: key.chars, index: 0 });
      }
      return;
    }

    // MODE 1: EXTENDED WINDOW (Default Multi-Tap)
    const now = Date.now();
    if (lastPress && lastPress.id === key.id && now - lastPress.time < MULTI_TAP_TIMEOUT) {
      const nextIndex = (lastPress.charIndex + 1) % key.chars.length;
      setText(t => t.slice(0, -1) + key.chars[nextIndex]);
      setLastPress({ id: key.id, time: now, charIndex: nextIndex });
    } else {
      setText(t => t + key.chars[0]);
      setLastPress({ id: key.id, time: now, charIndex: 0 });
    }
  };

  const handleSelectPrediction = (word: string) => {
    if (isCooldownRef.current || isPaused || isSuggestionCooldown) return;
    
    // Automatically learn word into local memory
    learnCustomWord(word);

    setText(prev => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return word + ' ';
      return trimmed + ' ' + word + ' ';
    });
    setT9Sequence('');

    setIsSuggestionCooldown(true);
    setTimeout(() => {
      setIsSuggestionCooldown(false);
    }, 550);
  };

  const handleSpace = () => {
    if (isCooldownRef.current || isPaused) return;
    setActiveCarouselState(null);

    if (t9InputMode === 'PREDICTIVE' && t9Sequence.length > 0) {
      if (predictions.length > 0) {
        handleSelectPrediction(predictions[0]);
        return;
      }
    } else {
      // Auto-learn last written word in letter-by-letter modes (Submenu / Carousel)
      const lastWord = text.trim().split(/\s+/).pop();
      if (lastWord && lastWord.length >= 2) {
        learnCustomWord(lastWord);
      }
    }

    setText(t => t + ' ');
    setT9Sequence('');
  };

  const handleSpeakText = () => {
    if (isCooldownRef.current || isPaused) return;
    setActiveCarouselState(null);

    if (t9InputMode === 'PREDICTIVE' && t9Sequence.length > 0 && predictions.length > 0) {
      const fullText = (text.trimEnd() + ' ' + predictions[0]).trim();
      speak(fullText);
      setText(fullText + ' ');
      setT9Sequence('');
      return;
    }

    if (text.trim()) {
      // Auto-learn all custom words in current sentence
      const words = text.trim().split(/\s+/);
      words.forEach(w => {
        if (w.length >= 2) learnCustomWord(w);
      });
      speak(text);
    }
  };

  const handleSubmenuCharSelect = (char: string) => {
    if (isModalOpening || isPaused) return;
    setText(t => t + char);
    closeSubmenu();
  };

  const closeSubmenu = () => {
    isCooldownRef.current = true;
    setActiveSubmenuKey(null);
    setIsModalOpening(false);
    setTimeout(() => {
      isCooldownRef.current = false;
    }, 500);
  };

  const deleteChar = () => {
    if (isCooldownRef.current || isPaused) return;
    setActiveCarouselState(null);

    if (t9InputMode === 'PREDICTIVE' && t9Sequence.length > 0) {
      setT9Sequence(prev => prev.slice(0, -1));
      return;
    }

    setText(t => t.slice(0, -1));
  };

  const clearAllText = () => {
    if (isCooldownRef.current || isPaused) return;
    setActiveCarouselState(null);
    setT9Sequence('');
    setText('');
  };

  const quickSpeak = (phrase: string) => {
    if (isCooldownRef.current || isPaused) return;
    setActiveCarouselState(null);
    speak(phrase);
  };

  const isModalOpen = !!activeSubmenuKey;
  const isButtonsDisabled = isModalOpen || isPaused;

  const modeBadgeText = t9InputMode === 'PREDICTIVE' ? '🧠 Predictivo' : t9InputMode === 'EXTENDED_WINDOW' ? '⏱️ Extendido' : t9InputMode === 'SUBMENU' ? '🔤 Desplegable' : '🔄 Carrusel';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 0.75rem 0.75rem 0.75rem', gap: '0.5rem', position: 'relative' }}>
      
      {/* Top Action Bar (Flush to top) */}
      <div style={{ display: 'flex', gap: '0.5rem', minHeight: '85px', margin: 0, borderBottom: '2px solid var(--bg-tertiary)' }}>
        
        {/* Integrated Back Button */}
        <DwellButton 
          disabled={isButtonsDisabled} 
          onClick={() => safeNavigate(navigate, '/')} 
          style={{ 
            flex: '1.2', 
            borderRadius: 0,
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}
        >
          <ArrowLeft size={28} /> Volver
        </DwellButton>

        {/* Quick Responses */}
        <DwellButton disabled={isButtonsDisabled} onClick={() => quickSpeak('Sí')} style={{ flex: '1.2', borderRadius: 0, background: 'var(--success)', fontSize: '1.4rem', fontWeight: 'bold' }}>
          SÍ
        </DwellButton>

        <DwellButton disabled={isButtonsDisabled} onClick={() => quickSpeak('No')} style={{ flex: '1.2', borderRadius: 0, background: 'var(--danger)', fontSize: '1.4rem', fontWeight: 'bold' }}>
          NO
        </DwellButton>

        <DwellButton disabled={isButtonsDisabled} onClick={() => quickSpeak('Necesito ayuda')} style={{ flex: '2', borderRadius: 0, background: 'var(--warning)', color: '#000', fontSize: '1.2rem', fontWeight: 'bold' }}>
          Necesito ayuda
        </DwellButton>

        {/* TOGGLE T9 MODE BUTTON (Allows Alejandra to cycle modes independently on the fly!) */}
        <DwellButton 
          disabled={isButtonsDisabled} 
          onClick={toggleT9InputMode} 
          style={{ 
            flex: '1.8', 
            borderRadius: 0,
            background: 'var(--accent-primary)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            padding: '0.3rem',
            border: '3px solid var(--accent-hover)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', opacity: 0.9 }}>
            <RefreshCw size={18} /> MODO T9:
          </div>
          <span style={{ 
            fontSize: '1.3rem', 
            fontWeight: '900', 
            color: '#FACC15', 
            textShadow: '0 0 12px rgba(250, 204, 21, 0.6)',
            letterSpacing: '0.5px'
          }}>
            {modeBadgeText}
          </span>
        </DwellButton>

      </div>

      {/* UNIFIED HEADER BAR FOR PREDICTIVE MODE (Text Row + Taller Suggestion Row + Full-Height LIMPIAR Button) */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderRadius: 'var(--radius-md)', 
        display: 'flex',
        alignItems: 'stretch',
        border: '2px solid var(--bg-tertiary)',
        overflow: 'hidden'
      }}>
        
        {/* Left Column: Text Row + Suggestions Row */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Text Display Row (Reduced Height for more suggestion space) */}
          <div style={{ 
            height: t9InputMode === 'PREDICTIVE' ? '60px' : '85px', 
            padding: '0.5rem 1rem', 
            fontSize: t9InputMode === 'PREDICTIVE' ? '1.7rem' : '2rem', 
            fontWeight: 'bold', 
            overflowX: 'auto', 
            whiteSpace: 'nowrap', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.8rem',
            borderBottom: t9InputMode === 'PREDICTIVE' ? '1px solid var(--bg-tertiary)' : 'none'
          }}>
            <span>{text || <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>Tu texto aparecerá aquí...</span>}</span>
            {t9Sequence && (
              <span style={{ 
                background: 'var(--accent-hover)', 
                color: '#000', 
                padding: '0.1rem 0.6rem', 
                borderRadius: 'var(--radius-md)',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}>
                [{t9Sequence}]
              </span>
            )}
          </div>

          {/* Taller Suggestion Row for 6 Candidate Words */}
          {t9InputMode === 'PREDICTIVE' && (
            <div style={{ 
              minHeight: '80px', 
              background: 'rgba(30, 41, 59, 0.95)',
              padding: '0.4rem 0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0 0.3rem', color: 'var(--accent-hover)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <Sparkles size={18} />
              </div>

              {/* 6 Grid Slots for Candidate Words */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem', height: '100%' }}>
                {predictions.length > 0 ? (
                  predictions.map((word, idx) => (
                    <DwellButton
                      key={word + idx}
                      disabled={isButtonsDisabled || isSuggestionCooldown}
                      onClick={() => handleSelectPrediction(word)}
                      style={{
                        height: '100%',
                        fontSize: word.length > 7 ? '1.05rem' : '1.2rem',
                        fontWeight: 'bold',
                        padding: '0.2rem',
                        background: idx === 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        border: idx === 0 ? '2px solid var(--accent-hover)' : '1px solid var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isSuggestionCooldown ? 0.7 : 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {word.toUpperCase()}
                    </DwellButton>
                  ))
                ) : (
                  <div style={{ gridColumn: 'span 6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Continúa mirando números para ver palabras sugeridas...
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Giant Full-Height LIMPIAR Button Spanning BOTH Rows (Text + Suggestions) */}
        <DwellButton 
          disabled={isButtonsDisabled}
          onClick={clearAllText}
          style={{
            minWidth: '260px',
            borderRadius: 0,
            borderLeft: '3px solid var(--bg-tertiary)',
            background: 'rgba(239, 68, 68, 0.45)',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <Trash2 size={32} />
          <span>LIMPIAR</span>
        </DwellButton>

      </div>

      {/* PAUSE / REST MODE OVERLAY MODAL */}
      {isPaused && (
        <div style={{ 
          position: 'absolute',
          top: '185px',
          left: '1rem',
          right: '1rem',
          bottom: '1rem',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-md)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          border: '3px solid var(--warning)',
          boxShadow: '0 0 50px rgba(245, 158, 11, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--warning)', marginBottom: '1rem' }}>
            <Pause size={48} />
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>TECLADO EN REPOSO</h2>
          </div>
          <p style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '2.5rem' }}>
            Puedes descansar la mirada a gusto. Los botones están congelados para que no se active nada sin querer.
          </p>

          <DwellButton
            onClick={() => setIsPaused(false)}
            style={{
              padding: '1.5rem 3rem',
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'var(--success)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: '3px solid var(--accent-hover)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 0 30px var(--success)'
            }}
          >
            <Play size={40} /> REANUDAR ESCRITURA
          </DwellButton>
        </div>
      )}

      {/* Mode 2: SUBMENU Overlay Modal */}
      {activeSubmenuKey && !isPaused && (
        <div style={{ 
          position: 'absolute',
          top: '185px',
          left: '1rem',
          right: '1rem',
          bottom: '1rem',
          background: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-md)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          border: '3px solid var(--accent-hover)',
          boxShadow: '0 0 40px rgba(0,0,0,0.8)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--accent-hover)', margin: 0 }}>
              Selecciona una letra para Tecla {activeSubmenuKey.id}
            </h2>
            <DwellButton 
              disabled={isModalOpening}
              onClick={closeSubmenu}
              style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}
            >
              <X size={24} /> Volver
            </DwellButton>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${activeSubmenuKey.chars.length}, 1fr)`, gap: '1rem' }}>
            {activeSubmenuKey.chars.split('').map((char) => (
              <DwellButton
                key={char}
                disabled={isModalOpening}
                onClick={() => handleSubmenuCharSelect(char)}
                style={{
                  fontSize: '5rem',
                  fontWeight: 'bold',
                  background: 'var(--bg-secondary)',
                  color: 'var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--accent-hover)'
                }}
              >
                {char}
              </DwellButton>
            ))}
          </div>
        </div>
      )}

      {/* Main T9 Number Keys Grid (3 columns x 3 rows) */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gridTemplateRows: 'repeat(3, 1fr)', 
        gap: '0.5rem' 
      }}>
        {MAIN_T9_KEYS.map((key) => {
          const isCarouselActive = activeCarouselState?.keyId === key.id;
          const activeCharIndex = isCarouselActive ? activeCarouselState.index : -1;

          return (
            <DwellButton 
              key={key.id} 
              disabled={isButtonsDisabled}
              onClick={() => handleKeyPress(key)}
              onHoverStateChange={(isHovered) => handleKeyHoverState(key.id, isHovered)}
              style={{ 
                fontSize: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.2rem',
                border: isCarouselActive ? '3px solid var(--warning)' : undefined,
                boxShadow: isCarouselActive ? '0 0 25px var(--warning)' : undefined
              }}
            >
              <b style={{ fontSize: '2.5rem', color: isCarouselActive ? 'var(--warning)' : undefined, lineHeight: 1 }}>
                {key.id}
              </b>
              
              {/* Larger letters with dynamic carousel character highlighting */}
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                {key.chars.split('').map((char, idx) => {
                  const isCharActive = idx === activeCharIndex;
                  return (
                    <span
                      key={idx}
                      style={{
                        fontSize: isCharActive ? '1.8rem' : '1.45rem',
                        fontWeight: '800',
                        color: isCharActive ? 'var(--warning)' : isCarouselActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        textShadow: isCharActive ? '0 0 12px var(--warning)' : 'none',
                        transform: isCharActive ? 'scale(1.25)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

            </DwellButton>
          );
        })}
      </div>

      {/* Dedicated Bottom Action Row: Conditional grid depending on showPauseButton */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: showPauseButton ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
        gap: '0.5rem', 
        minHeight: '95px' 
      }}>
        
        {/* 1. ESPACIO */}
        <DwellButton 
          disabled={isButtonsDisabled}
          onClick={handleSpace}
          style={{ 
            fontSize: '1.4rem', 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span>ESPACIO</span>
        </DwellButton>

        {/* 2. BORRAR */}
        <DwellButton 
          disabled={isButtonsDisabled}
          onClick={deleteChar}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'rgba(239, 68, 68, 0.3)',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Delete size={26} />
          <span>BORRAR</span>
        </DwellButton>

        {/* 3. PAUSAR (Only shown if selection method includes DWELL/Time) */}
        {showPauseButton && (
          <DwellButton 
            disabled={isModalOpen}
            onClick={() => setIsPaused(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'var(--warning)',
              color: '#000',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <Pause size={28} />
            <span>PAUSAR</span>
          </DwellButton>
        )}

        {/* 4. HABLAR */}
        <DwellButton 
          disabled={isButtonsDisabled}
          onClick={handleSpeakText}
          style={{ 
            fontSize: '1.4rem', 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'var(--accent-primary)',
            color: 'white',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Volume2 size={28} />
          <span>HABLAR</span>
        </DwellButton>

      </div>

    </div>
  );
};

export default T9Mode;
