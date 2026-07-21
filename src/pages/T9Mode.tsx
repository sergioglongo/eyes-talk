import { useState } from 'react';
import { DwellButton } from '../components/DwellButton';
import { useTTS } from '../hooks/useTTS';
import { Settings, Delete, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../utils/navigation';

const T9_KEYS = [
  { id: '1', chars: '.,!?' }, { id: '2', chars: 'ABC' }, { id: '3', chars: 'DEF' },
  { id: '4', chars: 'GHI' }, { id: '5', chars: 'JKL' }, { id: '6', chars: 'MNO' },
  { id: '7', chars: 'PQRS' }, { id: '8', chars: 'TUV' }, { id: '9', chars: 'WXYZ' },
  { id: 'SPACE', chars: 'ESPACIO' }, { id: 'DEL_SPLIT', chars: 'DELETE_SECTION' }, { id: 'SPEAK', chars: 'HABLAR' }
];

const T9Mode = () => {
  const [text, setText] = useState('');
  const { speak } = useTTS();
  const navigate = useNavigate();

  // Basic Multi-tap logic
  const [lastPress, setLastPress] = useState<{ id: string, time: number, charIndex: number } | null>(null);

  const handleKeyPress = (key: typeof T9_KEYS[0]) => {
    if (key.id === 'SPACE') {
      setText(t => t + ' ');
      return;
    }
    if (key.id === 'SPEAK') {
      if (text.trim()) speak(text);
      return;
    }

    const now = Date.now();
    if (lastPress && lastPress.id === key.id && now - lastPress.time < 1500) {
      // Rotate character
      const nextIndex = (lastPress.charIndex + 1) % key.chars.length;
      setText(t => t.slice(0, -1) + key.chars[nextIndex]);
      setLastPress({ id: key.id, time: now, charIndex: nextIndex });
    } else {
      // First press of this key
      setText(t => t + key.chars[0]);
      setLastPress({ id: key.id, time: now, charIndex: 0 });
    }
  };

  const deleteChar = () => {
    setText(t => t.slice(0, -1));
  };

  const clearAllText = () => {
    setText('');
  };

  const quickSpeak = (phrase: string) => {
    speak(phrase);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem' }}>
      
      {/* Top Action Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', height: '60px' }}>
        <DwellButton onClick={() => quickSpeak('Sí')} style={{ flex: 1, background: 'var(--success)' }}>
          SÍ
        </DwellButton>
        <DwellButton onClick={() => quickSpeak('No')} style={{ flex: 1, background: 'var(--danger)' }}>
          NO
        </DwellButton>
        <DwellButton onClick={() => quickSpeak('Estoy escribiendo')} style={{ flex: 2 }}>
          Estoy escribiendo
        </DwellButton>
        <DwellButton onClick={() => quickSpeak('Necesito ayuda')} style={{ flex: 2, background: 'var(--warning)', color: '#000' }}>
          Necesito ayuda
        </DwellButton>
        <DwellButton onClick={() => safeNavigate(navigate, '/settings')} style={{ width: '60px' }}>
          <Settings />
        </DwellButton>
      </div>

      {/* Text Display */}
      <div style={{ 
        flex: '0 0 100px', 
        background: 'var(--bg-secondary)', 
        borderRadius: 'var(--radius-md)', 
        padding: '1rem',
        fontSize: '2rem',
        display: 'flex',
        alignItems: 'center',
        border: '2px solid var(--bg-tertiary)'
      }}>
        {text || <span style={{ color: 'var(--text-secondary)' }}>Tu texto aparecerá aquí...</span>}
      </div>

      {/* T9 Grid */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gridTemplateRows: 'repeat(4, 1fr)', 
        gap: '0.5rem' 
      }}>
        {T9_KEYS.map((key) => {
          if (key.id === 'DEL_SPLIT') {
            return (
              <div key={key.id} style={{ display: 'flex', gap: '0.25rem' }}>
                <DwellButton 
                  onClick={deleteChar}
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    background: 'rgba(239, 68, 68, 0.2)',
                    fontSize: '1.1rem'
                  }}
                >
                  <Delete size={22} />
                  <span>Borrar</span>
                </DwellButton>
                
                <DwellButton 
                  onClick={clearAllText}
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    background: 'rgba(239, 68, 68, 0.4)',
                    fontSize: '1.1rem'
                  }}
                >
                  <Trash2 size={22} />
                  <span>Limpiar</span>
                </DwellButton>
              </div>
            );
          }

          return (
            <DwellButton 
              key={key.id} 
              onClick={() => handleKeyPress(key)}
              style={{ fontSize: '1.5rem', display: 'flex', flexDirection: 'column' }}
            >
              {['SPACE', 'SPEAK'].includes(key.id) ? (
                <span>{key.chars}</span>
              ) : (
                <>
                  <b style={{ fontSize: '2rem' }}>{key.id}</b>
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{key.chars}</span>
                </>
              )}
            </DwellButton>
          );
        })}
      </div>

    </div>
  );
};

export default T9Mode;
