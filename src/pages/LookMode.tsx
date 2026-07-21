import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';
import { useTTS } from '../hooks/useTTS';
import { usePhrases } from '../hooks/usePhrases';
import { playChime } from '../utils/audio';
import { safeNavigate } from '../utils/navigation';
import { type PhraseItem } from '../services/db';
import { DwellButton } from '../components/DwellButton';
import { ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';

const LookMode = () => {
  const navigate = useNavigate();
  const { cursor, isIntentionalBlink, calibration } = useTrackingContext();
  const { speak } = useTTS();
  const { phrases, pageNames, loading, incrementUsage } = usePhrases();
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentSubList, setCurrentSubList] = useState<PhraseItem[]>([]);
  const [selectionTime, setSelectionTime] = useState(0);
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);

  const DWELL_TIME = 1500;
  const UPDATE_INTERVAL = 50;

  // Custom spatial zones for Look Mode (middle Y area only: y between 15% and 85%)
  const activeDirection: 'LEFT' | 'RIGHT' | 'CENTER' = (() => {
    const x = cursor.x;
    const y = cursor.y;

    // If cursor is in top header (y < 0.15) or bottom footer (y > 0.85), deactivate phrase selection
    if (y < 0.15 || y > 0.85) return 'CENTER';

    if (x >= 0.166 && x <= 0.416) return 'LEFT';  // 2/6 left active zone (16.6% to 41.6%)
    if (x >= 0.583 && x <= 0.833) return 'RIGHT'; // 2/6 right active zone (58.3% to 83.3%)
    return 'CENTER'; // 1/6 outer margins and 1/6 center neutral zone
  })();

  // Filter phrases for the active page
  const pagePhrases = phrases.filter(p => (p.page || 1) === currentPage);
  const totalPages = Math.max(1, ...phrases.map(p => p.page || 1));

  // Compute previous and next page numbers and titles
  const prevPageNum = currentPage > 1 ? currentPage - 1 : totalPages;
  const nextPageNum = currentPage < totalPages ? currentPage + 1 : 1;

  const prevPageTitle = pageNames[prevPageNum] || `Página ${prevPageNum}`;
  const nextPageTitle = pageNames[nextPageNum] || `Página ${nextPageNum}`;

  // Reset sublist when changing pages or loading phrases
  useEffect(() => {
    setCurrentSubList(pagePhrases);
  }, [currentPage, phrases]);

  const allowBlink = calibration.selectionMethod !== 'DWELL';
  const allowDwell = calibration.selectionMethod !== 'BLINK';

  const lastSelectionTimeRef = useRef<number>(0);

  // Instant selection via Intentional Blink
  useEffect(() => {
    if (allowBlink && isIntentionalBlink && (activeDirection === 'LEFT' || activeDirection === 'RIGHT') && !selectedPhrase && currentSubList.length > 0) {
      handleSelection(activeDirection);
    }
  }, [isIntentionalBlink, activeDirection, allowBlink, selectedPhrase, currentSubList]);

  // Reset selectionTime whenever phrase sub-list changes
  useEffect(() => {
    setSelectionTime(0);
  }, [currentSubList]);

  // Compute halves
  const activeList = currentSubList.length > 0 ? currentSubList : pagePhrases;
  const mid = Math.ceil(activeList.length / 2);
  const leftHalf = activeList.slice(0, mid);
  const rightHalf = activeList.slice(mid);

  useEffect(() => {
    let interval: number;

    if (allowDwell && (activeDirection === 'LEFT' || activeDirection === 'RIGHT') && !selectedPhrase && activeList.length > 0) {
      interval = window.setInterval(() => {
        setSelectionTime(prev => {
          const next = prev + (UPDATE_INTERVAL / DWELL_TIME) * 100;
          if (next >= 100) {
            clearInterval(interval);
            handleSelection(activeDirection);
            return 0;
          }
          return next;
        });
      }, UPDATE_INTERVAL);
    } else {
      setSelectionTime(0);
    }

    return () => clearInterval(interval);
  }, [activeDirection, activeList, selectedPhrase, allowDwell]);

  const handleSelection = (dir: 'LEFT' | 'RIGHT') => {
    // Prevent cascading selections within 800ms of a previous selection
    if (Date.now() - lastSelectionTimeRef.current < 800) return;
    lastSelectionTimeRef.current = Date.now();

    const selectedHalf = dir === 'LEFT' ? leftHalf : rightHalf;
    if (selectedHalf.length === 0) return;

    // Play acceptance sound immediately
    playChime();

    if (selectedHalf.length === 1) {
      // Final selection reached
      const chosenItem = selectedHalf[0];
      setSelectedPhrase(chosenItem.text);
      speak(chosenItem.text);
      incrementUsage(chosenItem.id);

      // Show selected phrase for 3 seconds then reset back to full page list
      setTimeout(() => {
        setSelectedPhrase(null);
        setCurrentSubList(pagePhrases);
      }, 3000);
    } else if (selectedHalf.length > 1) {
      // Narrow down to sub-list
      setCurrentSubList(selectedHalf);
    }
  };

  const nextPage = () => {
    setCurrentPage(nextPageNum);
  };

  const prevPage = () => {
    setCurrentPage(prevPageNum);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%' }}>
        <h2>Cargando frases...</h2>
      </div>
    );
  }

  if (selectedPhrase) {
    return (
      <div className="flex-center" style={{ height: '100%', flexDirection: 'column', padding: '2rem', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Frase seleccionada:</h2>
        <h1 style={{ fontSize: '4rem', color: 'var(--success)', textAlign: 'center' }}>"{selectedPhrase}"</h1>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header Bar: 1/8 Back Button + 7/8 Page Up Button showing destination page title */}
      <div style={{ display: 'flex', width: '100%', minHeight: '90px', background: 'var(--bg-secondary)', borderBottom: '3px solid var(--bg-tertiary)' }}>
        
        {/* Integrated Back Button (1/8th = 12.5% width) */}
        <DwellButton 
          onClick={() => safeNavigate(navigate, '/')}
          style={{ 
            width: '12.5%', 
            minWidth: '110px',
            minHeight: '90px', 
            borderRadius: 0,
            border: 'none',
            borderRight: '3px solid var(--bg-tertiary)',
            background: 'var(--bg-tertiary)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.5rem', 
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}
        >
          <ArrowLeft size={32} /> Volver
        </DwellButton>

        {/* Page Up Button (7/8ths width) showing target page name and counts */}
        <DwellButton 
          onClick={prevPage}
          style={{ 
            flex: 1, 
            minHeight: '90px', 
            borderRadius: 0,
            border: 'none',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '1.2rem', 
            fontSize: '1.6rem',
            fontWeight: '800',
            letterSpacing: '0.5px',
            background: 'var(--bg-secondary)'
          }}
        >
          <ChevronUp size={44} /> PÁG. ANTERIOR: {prevPageTitle} ({prevPageNum} / {totalPages})
        </DwellButton>

      </div>

      {/* Main Grid split with 1/6 margins, 2/6 selection panels, 1/6 center deadzone */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Left Deadzone Margin (1/6th) */}
        <div style={{ width: '16.66%', background: 'rgba(0,0,0,0.1)' }} />

        {/* Left Active Selection Panel (2/6ths) */}
        <div style={{ 
          width: '33.33%', 
          borderRight: '2px solid var(--bg-tertiary)',
          borderLeft: '2px solid var(--bg-tertiary)',
          background: activeDirection === 'LEFT' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
          boxShadow: activeDirection === 'LEFT' ? 'inset 0 0 25px var(--accent-hover)' : 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          position: 'relative',
          transition: 'background 0.2s ease, box-shadow 0.2s ease'
        }}>
          {activeDirection === 'LEFT' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '8px', background: 'var(--accent-primary)', width: `${selectionTime}%`, transition: 'width 0.1s linear' }} />
          )}
          {leftHalf.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.5rem' }}>Sin frases en esta página</p>
          ) : (
            <ul style={{ listStyle: 'none', fontSize: '2.4rem', textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
              {leftHalf.map((item) => <li key={item.id} style={{ marginBottom: '1rem' }}>{item.text}</li>)}
            </ul>
          )}
        </div>

        {/* Center Deadzone Neutral Gap (1/6th) displaying current page title */}
        <div style={{ width: '16.68%', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-hover)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Página Actual</span>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 'bold', textAlign: 'center' }}>
            {pageNames[currentPage] || `Página ${currentPage}`}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '0.4rem' }}>({currentPage} de {totalPages})</span>
        </div>

        {/* Right Active Selection Panel (2/6ths) */}
        <div style={{ 
          width: '33.33%', 
          borderLeft: '2px solid var(--bg-tertiary)',
          borderRight: '2px solid var(--bg-tertiary)',
          background: activeDirection === 'RIGHT' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
          boxShadow: activeDirection === 'RIGHT' ? 'inset 0 0 25px var(--accent-hover)' : 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          position: 'relative',
          transition: 'background 0.2s ease, box-shadow 0.2s ease'
        }}>
          {activeDirection === 'RIGHT' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '8px', background: 'var(--accent-primary)', width: `${selectionTime}%`, transition: 'width 0.1s linear' }} />
          )}
          {rightHalf.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.5rem' }}>Sin frases en esta página</p>
          ) : (
            <ul style={{ listStyle: 'none', fontSize: '2.4rem', textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
              {rightHalf.map((item) => <li key={item.id} style={{ marginBottom: '1rem' }}>{item.text}</li>)}
            </ul>
          )}
        </div>

        {/* Right Deadzone Margin (1/6th) */}
        <div style={{ width: '16.66%', background: 'rgba(0,0,0,0.1)' }} />

      </div>

      {/* Bottom Page Control showing destination page title */}
      <DwellButton 
        onClick={nextPage}
        style={{ 
          width: '100%',
          minHeight: '90px', 
          borderRadius: 0,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '1.2rem', 
          fontSize: '1.6rem',
          fontWeight: '800',
          letterSpacing: '0.5px',
          background: 'var(--bg-secondary)',
          border: 'none',
          borderTop: '3px solid var(--bg-tertiary)'
        }}
      >
        <ChevronDown size={44} /> PÁG. SIGUIENTE: {nextPageTitle} ({nextPageNum} / {totalPages})
      </DwellButton>

    </div>
  );
};

export default LookMode;
