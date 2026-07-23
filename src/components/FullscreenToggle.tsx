import { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { DwellButton } from './DwellButton';

interface FullscreenToggleProps {
  style?: React.CSSProperties;
  compact?: boolean;
  hoverScale?: number;
}

export const FullscreenToggle = ({ style, hoverScale }: FullscreenToggleProps) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = !!document.fullscreenElement;
      setIsFullscreen(isNative);
      if (isNative) {
        document.body.classList.add('pseudo-fullscreen');
      } else {
        document.body.classList.remove('pseudo-fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
          document.body.classList.add('pseudo-fullscreen');
        } catch (err) {
          console.warn('Native requestFullscreen blocked by browser policy:', err);
          
          const nextState = !isFullscreen;
          setIsFullscreen(nextState);
          if (nextState) {
            document.body.classList.add('pseudo-fullscreen');
            showToast('🖥️ Modo Kiosco activado por mirada (Para pantalla completa nativa del sistema haz clic con el mouse o presiona F11)');
          } else {
            document.body.classList.remove('pseudo-fullscreen');
          }
        }
      } else {
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (e) {}
        }
        setIsFullscreen(false);
        document.body.classList.remove('pseudo-fullscreen');
      }
    } catch (e) {
      console.error('Error toggling fullscreen:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <>
      <DwellButton
        onClick={toggleFullscreen}
        hoverScale={hoverScale}
        style={{
          padding: '0.8rem 1.8rem',
          background: isFullscreen ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
          color: '#ffffff',
          borderTop: isFullscreen ? '3px solid var(--accent-hover)' : '2px solid var(--accent-hover)',
          borderBottom: isFullscreen ? '3px solid var(--accent-hover)' : '2px solid var(--accent-hover)',
          borderLeft: isFullscreen ? '3px solid var(--accent-hover)' : '2px solid var(--accent-hover)',
          borderRight: isFullscreen ? '3px solid var(--accent-hover)' : '2px solid var(--accent-hover)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontSize: '1.2rem',
          fontWeight: '900',
          cursor: 'pointer',
          boxShadow: '0 0 15px rgba(0,0,0,0.3)',
          ...style
        }}
      >
        {isFullscreen ? (
          <>
            <Minimize2 size={28} />
            <span>SALIR PANTALLA COMPLETA</span>
          </>
        ) : (
          <>
            <Maximize2 size={28} />
            <span>PANTALLA COMPLETA</span>
          </>
        )}
      </DwellButton>

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          border: '2px solid var(--accent-hover)',
          padding: '0.8rem 1.8rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          zIndex: 999999,
          boxShadow: '0 0 25px rgba(0,0,0,0.8)',
          textAlign: 'center'
        }}>
          {toastMessage}
        </div>
      )}
    </>
  );
};
