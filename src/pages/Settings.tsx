import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';
import { usePhrases } from '../hooks/usePhrases';
import { useTTS } from '../hooks/useTTS';
import { safeNavigate } from '../utils/navigation';
import { DwellButton } from '../components/DwellButton';
import { type T9InputMode } from '../hooks/useEyeTracking';
import { 
  getCustomWordsDB, 
  addCustomWordDB, 
  deleteCustomWordDB, 
  clearCustomWordsBySourceDB,
  bulkImportWordsDB,
  type CustomWordItem 
} from '../services/db';
import { 
  Trash2, Plus, RefreshCw, Edit2, Check, X, AlertCircle, Bookmark, 
  MoveRight, Volume2, Mic, Keyboard, Settings as SettingsIcon, Sliders, 
  Target, Eye, Brain, Upload, Search, BookOpen, ArrowLeft
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { calibration, saveCalibration } = useTrackingContext();
  const { phrases, pageNames, savePageName, addPhrase, updatePhrase, deletePhrase, resetDefaults } = usePhrases();
  const { speak, voices } = useTTS();

  // Top Section Tab ('SYSTEM' | 'DICTIONARY' | 'PHRASES')
  const [activeSettingsTab, setActiveSettingsTab] = useState<'SYSTEM' | 'DICTIONARY' | 'PHRASES'>('SYSTEM');

  // Custom Words DB State & Sub-Tab ('MANUAL' | 'IMPORTED' | 'AUTO_LEARNED')
  const [customWords, setCustomWords] = useState<CustomWordItem[]>([]);
  const [wordSourceTab, setWordSourceTab] = useState<'MANUAL' | 'IMPORTED' | 'AUTO_LEARNED'>('MANUAL');
  const [newWordInput, setNewWordInput] = useState('');
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [wordSearchQuery, setWordSearchQuery] = useState('');
  const [wordSuccessMsg, setWordSuccessMsg] = useState<string | null>(null);
  const [wordErrorMsg, setWordErrorMsg] = useState<string | null>(null);

  // Active Selected Page Tab (1 to 6) in Phrase Manager
  const [selectedPageTab, setSelectedPageTab] = useState<number>(1);

  // Phrase Inputs
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [editingPageTitle, setEditingPageTitle] = useState(false);
  const [pageTitleInput, setPageTitleInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit phrase state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editTargetPage, setEditTargetPage] = useState<number>(1);

  // Load Custom Words from IndexedDB
  const loadCustomWords = async () => {
    const list = await getCustomWordsDB();
    setCustomWords(list);
    // Sync to localStorage for zero-latency T9 predictor reading
    const wordsOnly = list.map(w => w.word);
    localStorage.setItem('eyes_talk_learned_words', JSON.stringify(wordsOnly));
  };

  useEffect(() => {
    if (activeSettingsTab === 'DICTIONARY') {
      loadCustomWords();
    }
  }, [activeSettingsTab]);

  const handleAddSingleWord = async (e: React.FormEvent) => {
    e.preventDefault();
    setWordSuccessMsg(null);
    setWordErrorMsg(null);

    if (!newWordInput.trim()) return;

    const added = await addCustomWordDB(newWordInput.trim());
    if (added) {
      setNewWordInput('');
      setWordSuccessMsg(`¡Palabra "${added.word}" agregada al diccionario predictivo!`);
      await loadCustomWords();
    } else {
      setWordErrorMsg('Por favor ingresa una palabra válida.');
    }
  };

  const handleBulkImport = async () => {
    setWordSuccessMsg(null);
    setWordErrorMsg(null);

    if (!bulkTextInput.trim()) return;

    const count = await bulkImportWordsDB(bulkTextInput);
    if (count > 0) {
      setBulkTextInput('');
      setWordSuccessMsg(`🎉 ¡Se agregaron ${count} palabras únicas nuevas a la base de datos predictiva!`);
      await loadCustomWords();
    } else {
      setWordErrorMsg('No se encontraron palabras nuevas en el texto ingresado.');
    }
  };

  const handleDeleteWord = async (id: string) => {
    await deleteCustomWordDB(id);
    await loadCustomWords();
  };

  const handleClearSourceWords = async (source: 'MANUAL' | 'IMPORTED' | 'AUTO_LEARNED') => {
    const labelMap = { MANUAL: 'agregadas manualmente', IMPORTED: 'importadas masivamente', AUTO_LEARNED: 'aprendidas automáticamente' };
    if (window.confirm(`¿Estás seguro de que deseas vaciar la lista de palabras ${labelMap[source]}?`)) {
      await clearCustomWordsBySourceDB(source);
      setWordSuccessMsg(`Lista de palabras ${labelMap[source]} vaciada correctamente.`);
      await loadCustomWords();
    }
  };

  const manualWords = customWords.filter(w => (w.source || 'MANUAL') === 'MANUAL');
  const importedWords = customWords.filter(w => w.source === 'IMPORTED');
  const learnedWords = customWords.filter(w => w.source === 'AUTO_LEARNED');

  const filteredCustomWords = customWords.filter(w => 
    (w.source || 'MANUAL') === wordSourceTab &&
    w.word.toLowerCase().includes(wordSearchQuery.trim().toLowerCase())
  );

  const handleSensitivityChange = (delta: number) => {
    const newSens = Math.max(1, Math.min(10, calibration.sensitivity + delta));
    saveCalibration({ ...calibration, sensitivity: newSens });
  };

  const handleModeChange = (mode: 'HEAD' | 'GAZE') => {
    saveCalibration({ ...calibration, mode });
  };

  const handleSelectionMethodChange = (selectionMethod: 'DWELL' | 'BLINK' | 'BOTH') => {
    saveCalibration({ ...calibration, selectionMethod });
  };

  const handleT9InputModeChange = (t9InputMode: T9InputMode) => {
    saveCalibration({ ...calibration, t9InputMode });
  };

  const handleBlinkDurationChange = (delta: number) => {
    const current = calibration.blinkDuration || 0.4;
    const newDur = Math.max(0.2, Math.min(0.8, Number((current + delta).toFixed(2))));
    saveCalibration({ ...calibration, blinkDuration: newDur });
  };

  const handleSpeechRateChange = (delta: number) => {
    const current = calibration.speechRate ?? 1.0;
    const newRate = Math.max(0.5, Math.min(1.5, Number((current + delta).toFixed(1))));
    saveCalibration({ ...calibration, speechRate: newRate });
  };

  const handleSpeechVolumeChange = (delta: number) => {
    const current = calibration.speechVolume ?? 1.0;
    const newVol = Math.max(0.2, Math.min(1.0, Number((current + delta).toFixed(1))));
    saveCalibration({ ...calibration, speechVolume: newVol });
  };

  const handleVoiceChange = (voiceURI: string) => {
    saveCalibration({ ...calibration, selectedVoiceURI: voiceURI });
  };

  // Phrases filtered for the selected page tab
  const currentTabPhrases = phrases.filter(p => (p.page || 1) === selectedPageTab);

  const handleAddPhraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPhraseInput.trim()) return;

    if (currentTabPhrases.length >= 12) {
      setErrorMsg(`La Página ${selectedPageTab} ya alcanzó el límite máximo de 12 frases.`);
      return;
    }

    addPhrase(newPhraseInput.trim(), selectedPageTab);
    setNewPhraseInput('');
  };

  const startEditingPhrase = (id: string, currentText: string, currentPage: number) => {
    setErrorMsg(null);
    setEditingId(id);
    setEditText(currentText);
    setEditTargetPage(currentPage || selectedPageTab);
  };

  const saveEditPhrase = (id: string) => {
    setErrorMsg(null);
    if (!editText.trim()) return;

    if (editTargetPage !== selectedPageTab) {
      const targetCount = phrases.filter(p => p.id !== id && (p.page || 1) === editTargetPage).length;
      if (targetCount >= 12) {
        setErrorMsg(`La Página ${editTargetPage} ya alcanzó el máximo de 12 frases.`);
        return;
      }
    }

    updatePhrase(id, editText.trim(), editTargetPage);
    setEditingId(null);
  };

  const cancelEditPhrase = () => {
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleStartEditingTitle = () => {
    setEditingPageTitle(true);
    setPageTitleInput(pageNames[selectedPageTab] || `Página ${selectedPageTab}`);
  };

  const handleSavePageTitle = () => {
    if (pageTitleInput.trim()) {
      savePageName(selectedPageTab, pageTitleInput.trim());
      setEditingPageTitle(false);
    }
  };

  const sortedVoices = [...voices].sort((a, b) => {
    const aIsEs = a.lang.startsWith('es') ? 0 : 1;
    const bIsEs = b.lang.startsWith('es') ? 0 : 1;
    return aIsEs - bIsEs;
  });

  return (
    <div style={{ height: '100%', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
      
      {/* Header with Integrated Back Button, Title and Panel Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px solid var(--bg-tertiary)', paddingBottom: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          {/* Giant Integrated Back DwellButton */}
          <DwellButton 
            onClick={() => safeNavigate(navigate, '/')}
            style={{ 
              padding: '0.8rem 1.8rem', 
              background: 'var(--bg-tertiary)', 
              color: '#ffffff',
              border: '2px solid var(--accent-hover)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem', 
              fontSize: '1.3rem', 
              fontWeight: '900',
              boxShadow: '0 0 15px rgba(0,0,0,0.3)'
            }}
          >
            <ArrowLeft size={28} /> VOLVER
          </DwellButton>

          <h1 style={{ margin: 0, color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.8rem' }}>
            <SettingsIcon size={32} /> Panel de Configuración
          </h1>
        </div>

        {/* Top Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
          
          <button
            onClick={() => setActiveSettingsTab('SYSTEM')}
            style={{
              padding: '0.7rem 1.2rem',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              borderRadius: 'var(--radius-md)',
              background: activeSettingsTab === 'SYSTEM' ? 'var(--accent-primary)' : 'transparent',
              color: activeSettingsTab === 'SYSTEM' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sliders size={20} /> Ajustes del Sistema
          </button>

          <button
            onClick={() => setActiveSettingsTab('DICTIONARY')}
            style={{
              padding: '0.7rem 1.2rem',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              borderRadius: 'var(--radius-md)',
              background: activeSettingsTab === 'DICTIONARY' ? 'var(--accent-primary)' : 'transparent',
              color: activeSettingsTab === 'DICTIONARY' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Brain size={20} /> Diccionario T9 (DB)
          </button>

          <button
            onClick={() => setActiveSettingsTab('PHRASES')}
            style={{
              padding: '0.7rem 1.2rem',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              borderRadius: 'var(--radius-md)',
              background: activeSettingsTab === 'PHRASES' ? 'var(--accent-primary)' : 'transparent',
              color: activeSettingsTab === 'PHRASES' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Bookmark size={20} /> Frases y Páginas
          </button>

        </div>
      </div>

      {/* PANEL 1: SYSTEM SETTINGS */}
      {activeSettingsTab === 'SYSTEM' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Tracking & Calibration Card */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
                <Target size={24} /> Tracking y Calibración
              </h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Modo de Captura de Movimiento</h3>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button 
                    onClick={() => handleModeChange('HEAD')}
                    style={{ 
                      flex: 1, 
                      padding: '0.8rem', 
                      background: calibration.mode === 'HEAD' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      border: calibration.mode === 'HEAD' ? '2px solid var(--accent-hover)' : 'none',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    👤 Movimiento de Cabeza
                  </button>
                  <button 
                    onClick={() => handleModeChange('GAZE')}
                    style={{ 
                      flex: 1, 
                      padding: '0.8rem', 
                      background: calibration.mode === 'GAZE' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      border: calibration.mode === 'GAZE' ? '2px solid var(--accent-hover)' : 'none',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    👁️ Seguimiento Ocular (Mirada)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Sensibilidad del Puntero</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => handleSensitivityChange(-0.5)} style={{ width: '45px', height: '45px', fontSize: '1.4rem', background: 'var(--bg-tertiary)' }}>-</button>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>{calibration.sensitivity}</span>
                  <button onClick={() => handleSensitivityChange(0.5)} style={{ width: '45px', height: '45px', fontSize: '1.4rem', background: 'var(--bg-tertiary)' }}>+</button>
                </div>
              </div>

              <button 
                onClick={() => navigate('/calibration')}
                style={{ width: '100%', padding: '0.9rem', background: 'var(--accent-primary)', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
              >
                🎯 Iniciar Calibración de 5 Puntos
              </button>
            </div>

            {/* Selection Methods Card */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
                <Eye size={24} /> Método de Selección de Botones
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.2rem' }}>
                <button 
                  onClick={() => handleSelectionMethodChange('BOTH')}
                  style={{ 
                    padding: '0.8rem 0.4rem', 
                    background: calibration.selectionMethod === 'BOTH' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: calibration.selectionMethod === 'BOTH' ? '2px solid var(--accent-hover)' : 'none',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  ⏱️ + 👁️ Ambos
                </button>

                <button 
                  onClick={() => handleSelectionMethodChange('DWELL')}
                  style={{ 
                    padding: '0.8rem 0.4rem', 
                    background: calibration.selectionMethod === 'DWELL' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: calibration.selectionMethod === 'DWELL' ? '2px solid var(--accent-hover)' : 'none',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  ⏱️ Tiempo
                </button>

                <button 
                  onClick={() => handleSelectionMethodChange('BLINK')}
                  style={{ 
                    padding: '0.8rem 0.4rem', 
                    background: calibration.selectionMethod === 'BLINK' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: calibration.selectionMethod === 'BLINK' ? '2px solid var(--accent-hover)' : 'none',
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  👁️ Pestañeo
                </button>
              </div>

              {calibration.selectionMethod !== 'DWELL' && (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Sensibilidad de Pestañeo Intencional</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => handleBlinkDurationChange(-0.05)} style={{ width: '40px', height: '40px', fontSize: '1.2rem', background: 'var(--bg-tertiary)' }}>-</button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
                      {calibration.blinkDuration || 0.4}s
                    </span>
                    <button onClick={() => handleBlinkDurationChange(0.05)} style={{ width: '40px', height: '40px', fontSize: '1.2rem', background: 'var(--bg-tertiary)' }}>+</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Voice Settings Card */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
                <Volume2 size={24} /> Voz y Pronunciación (TTS)
              </h2>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Mic size={18} /> Selección de Voz del Sistema:
                </label>
                <select 
                  value={calibration.selectedVoiceURI || ''} 
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    fontSize: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--bg-tertiary)'
                  }}
                >
                  <option value="">-- Detección Automática (Español) --</option>
                  {sortedVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}) {v.lang.startsWith('es') ? ' 🇪🇸 [Recomendada]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>Velocidad</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handleSpeechRateChange(-0.1)} style={{ width: '35px', height: '35px', fontSize: '1.2rem', background: 'var(--bg-tertiary)' }}>-</button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
                      {(calibration.speechRate ?? 1.0).toFixed(1)}x
                    </span>
                    <button onClick={() => handleSpeechRateChange(0.1)} style={{ width: '35px', height: '35px', fontSize: '1.2rem', background: 'var(--bg-tertiary)' }}>+</button>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>Volumen</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handleSpeechVolumeChange(-0.1)} style={{ width: '35px', height: '35px', fontSize: '1.2rem', background: 'var(--bg-tertiary)' }}>-</button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
                      {Math.round((calibration.speechVolume ?? 1.0) * 100)}%
                    </span>
                    <button onClick={() => handleSpeechVolumeChange(0.1)} style={{ width: '35px', height: '35px', fontSize: '1.2rem', background: 'var(--bg-tertiary)' }}>+</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => speak('Hola, esta es una prueba de voz en Eyes Talk.')}
                style={{ width: '100%', padding: '0.7rem', background: 'var(--accent-primary)', border: 'none', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                🔊 Probar Voz Ahora
              </button>
            </div>

            {/* T9 Input Mode Card */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
              <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
                <Keyboard size={24} /> Modos de Escritura T9
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <button 
                  onClick={() => handleT9InputModeChange('PREDICTIVE')}
                  style={{ 
                    padding: '0.8rem', 
                    background: (calibration.t9InputMode || 'PREDICTIVE') === 'PREDICTIVE' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: (calibration.t9InputMode || 'PREDICTIVE') === 'PREDICTIVE' ? '2px solid var(--accent-hover)' : 'none',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>🧠 Predictivo (1 toque)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sugerencias inteligentes</div>
                </button>

                <button 
                  onClick={() => handleT9InputModeChange('EXTENDED_WINDOW')}
                  style={{ 
                    padding: '0.8rem', 
                    background: calibration.t9InputMode === 'EXTENDED_WINDOW' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: calibration.t9InputMode === 'EXTENDED_WINDOW' ? '2px solid var(--accent-hover)' : 'none',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>⏱️ Ventana Extendida</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Multi-tap clásico 3.5s</div>
                </button>

                <button 
                  onClick={() => handleT9InputModeChange('SUBMENU')}
                  style={{ 
                    padding: '0.8rem', 
                    background: calibration.t9InputMode === 'SUBMENU' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: calibration.t9InputMode === 'SUBMENU' ? '2px solid var(--accent-hover)' : 'none',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>🔤 Desplegable</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Letras flotantes gigantes</div>
                </button>

                <button 
                  onClick={() => handleT9InputModeChange('CAROUSEL')}
                  style={{ 
                    padding: '0.8rem', 
                    background: calibration.t9InputMode === 'CAROUSEL' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: calibration.t9InputMode === 'CAROUSEL' ? '2px solid var(--accent-hover)' : 'none',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>🔄 Carrusel</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rotación continua 0.8s</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: PREDICTIVE DICTIONARY MANAGER (IndexedDB) */}
      {activeSettingsTab === 'DICTIONARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top Info Banner */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-primary)' }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Brain size={28} /> Gestor de Diccionario Predictivo Personalizado (IndexedDB)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0, lineHeight: 1.5 }}>
              Agrega nombres de familiares, términos médicos o frases cotidianas. Todas las palabras guardadas aquí tienen <b>Prioridad Máxima #1</b> en la barra de sugerencias T9.
            </p>
          </div>

          {/* Messages Banner */}
          {wordSuccessMsg && (
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '2px solid var(--success)', color: 'var(--success)', padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={20} /> {wordSuccessMsg}
            </div>
          )}
          {wordErrorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '2px solid var(--danger)', color: 'var(--danger)', padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} /> {wordErrorMsg}
            </div>
          )}

          {/* 2-Column Action Cards: Add Single Word vs Bulk Text Importer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            
            {/* Card 1: Add Single Word */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={22} color="var(--accent-hover)" /> Agregar Palabra Suelta
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
                Escribe una palabra individual para integrarla de inmediato al teclado predictivo.
              </p>

              <form onSubmit={handleAddSingleWord} style={{ display: 'flex', gap: '0.8rem' }}>
                <input 
                  type="text" 
                  placeholder="Ej: Alejandra, Raúl, Kinesiólogo..." 
                  value={newWordInput}
                  onChange={(e) => setNewWordInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.8rem 1rem',
                    fontSize: '1.1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--bg-tertiary)'
                  }}
                />
                <button 
                  type="submit"
                  disabled={!newWordInput.trim()}
                  style={{ 
                    padding: '0.8rem 1.4rem', 
                    background: 'var(--accent-primary)', 
                    border: 'none', 
                    fontSize: '1.05rem', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Plus size={20} /> Agregar
                </button>
              </form>
            </div>

            {/* Card 2: Bulk Text / Story Importer */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={22} color="var(--accent-hover)" /> Importador Masivo de Vocabulario
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
                Pega cualquier documento, carta o lista. Extraeremos todas las palabras únicas automáticamente.
              </p>

              <textarea 
                rows={3}
                placeholder="Pega un texto largo aquí para indexar sus palabras..."
                value={bulkTextInput}
                onChange={(e) => setBulkTextInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  fontSize: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--bg-tertiary)',
                  resize: 'vertical'
                }}
              />

              <button 
                onClick={handleBulkImport}
                disabled={!bulkTextInput.trim()}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  background: 'var(--accent-primary)', 
                  border: 'none', 
                  fontSize: '1.05rem', 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <BookOpen size={20} /> Extraer e Importar Palabras al Diccionario
              </button>
            </div>

          </div>

          {/* Word Category Sub-Tabs (Manuales, Importadas, Auto-Aprendidas) */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
            
            {/* 3 Sub-Tabs Navigation */}
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '2px solid var(--bg-tertiary)', paddingBottom: '1rem' }}>
              
              <button
                onClick={() => setWordSourceTab('MANUAL')}
                style={{
                  padding: '0.8rem 1.4rem',
                  borderRadius: 'var(--radius-md)',
                  background: wordSourceTab === 'MANUAL' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: wordSourceTab === 'MANUAL' ? '#ffffff' : 'var(--text-secondary)',
                  border: wordSourceTab === 'MANUAL' ? '2px solid var(--accent-hover)' : '1px solid var(--bg-tertiary)',
                  fontSize: '1.05rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Plus size={18} /> 📝 Agregadas Manualmente ({manualWords.length})
              </button>

              <button
                onClick={() => setWordSourceTab('IMPORTED')}
                style={{
                  padding: '0.8rem 1.4rem',
                  borderRadius: 'var(--radius-md)',
                  background: wordSourceTab === 'IMPORTED' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: wordSourceTab === 'IMPORTED' ? '#ffffff' : 'var(--text-secondary)',
                  border: wordSourceTab === 'IMPORTED' ? '2px solid var(--accent-hover)' : '1px solid var(--bg-tertiary)',
                  fontSize: '1.05rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Upload size={18} /> 📦 Importadas Masivamente ({importedWords.length})
              </button>

              <button
                onClick={() => setWordSourceTab('AUTO_LEARNED')}
                style={{
                  padding: '0.8rem 1.4rem',
                  borderRadius: 'var(--radius-md)',
                  background: wordSourceTab === 'AUTO_LEARNED' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: wordSourceTab === 'AUTO_LEARNED' ? '#ffffff' : 'var(--text-secondary)',
                  border: wordSourceTab === 'AUTO_LEARNED' ? '2px solid var(--accent-hover)' : '1px solid var(--bg-tertiary)',
                  fontSize: '1.05rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Brain size={18} /> 🧠 Aprendidas Automáticamente ({learnedWords.length})
              </button>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              
              {/* Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', minWidth: '280px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input 
                  type="text" 
                  placeholder={`Buscar en listado de ${wordSourceTab.toLowerCase()}...`} 
                  value={wordSearchQuery}
                  onChange={(e) => setWordSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '1rem', outline: 'none' }}
                />
              </div>

              {/* Clear Current List Button */}
              {filteredCustomWords.length > 0 && (
                <button
                  onClick={() => handleClearSourceWords(wordSourceTab)}
                  style={{
                    padding: '0.5rem 1.2rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Trash2 size={16} /> Vaciar esta lista ({wordSourceTab === 'MANUAL' ? 'Manuales' : wordSourceTab === 'IMPORTED' ? 'Importadas' : 'Aprendidas'})
                </button>
              )}

            </div>

            {/* List Grid */}
            {filteredCustomWords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                {customWords.length === 0 ? 'Aún no hay palabras registradas en esta categoría.' : 'No se encontraron palabras que coincidan con la búsqueda.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {filteredCustomWords.map(wItem => (
                  <div 
                    key={wItem.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '0.6rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', textTransform: 'uppercase' }}>
                      {wItem.word}
                    </span>
                    <button 
                      onClick={() => handleDeleteWord(wItem.id)}
                      title="Eliminar palabra"
                      style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: 'none', padding: '0.4rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* PANEL 3: DEDICATED PHRASE & PAGE MANAGEMENT */}
      {activeSettingsTab === 'PHRASES' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-primary)' }}>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bookmark size={24} /> Gestión de Páginas y Frases para Modo Mirada
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>
            Selecciona una página para gestionar sus frases, personalizar el título o agregar nuevas categorías.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map(num => {
              const count = phrases.filter(p => (p.page || 1) === num).length;
              const isSelected = selectedPageTab === num;
              const pTitle = pageNames[num] || `Página ${num}`;
              return (
                <button
                  key={num}
                  onClick={() => {
                    setSelectedPageTab(num);
                    setEditingId(null);
                    setEditingPageTitle(false);
                    setErrorMsg(null);
                  }}
                  style={{
                    padding: '0.8rem 1.2rem',
                    fontSize: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                    color: isSelected ? 'white' : 'var(--text-secondary)',
                    border: isSelected ? '2px solid var(--accent-hover)' : '1px solid var(--bg-tertiary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Página {num} ({count}/12)</span>
                  <span style={{ fontWeight: 'bold' }}>{pTitle}</span>
                </button>
              );
            })}
          </div>

          <div style={{ 
            background: 'var(--bg-primary)', 
            padding: '1.2rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--bg-tertiary)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              {editingPageTitle ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-hover)' }}>Pág {selectedPageTab}:</span>
                  <input 
                    type="text" 
                    value={pageTitleInput}
                    onChange={(e) => setPageTitleInput(e.target.value)}
                    style={{
                      flex: 1,
                      maxWidth: '350px',
                      padding: '0.5rem 0.8rem',
                      fontSize: '1.1rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--accent-hover)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  />
                  <button onClick={handleSavePageTitle} style={{ background: 'var(--success)', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Check size={18} /> Guardar Título
                  </button>
                  <button onClick={() => setEditingPageTitle(false)} style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
                    Página {selectedPageTab}: <span style={{ color: 'var(--accent-hover)' }}>{pageNames[selectedPageTab] || `Página ${selectedPageTab}`}</span>
                  </h3>
                  <button 
                    onClick={handleStartEditingTitle}
                    style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Edit2 size={16} /> Renombrar Página
                  </button>
                </div>
              )}

              <div style={{ fontSize: '0.9rem', color: currentTabPhrases.length >= 12 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                {currentTabPhrases.length} de 12 frases en esta página
              </div>
            </div>
          </div>

          <form onSubmit={handleAddPhraseSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder={`Escribe una nueva frase para "${pageNames[selectedPageTab] || `Página ${selectedPageTab}`}"...`}
              value={newPhraseInput}
              onChange={(e) => setNewPhraseInput(e.target.value)}
              disabled={currentTabPhrases.length >= 12}
              style={{ 
                flex: 1, 
                padding: '0.8rem 1rem', 
                fontSize: '1.1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '2px solid var(--bg-tertiary)',
                opacity: currentTabPhrases.length >= 12 ? 0.6 : 1
              }}
            />
            <button 
              type="submit"
              disabled={currentTabPhrases.length >= 12 || !newPhraseInput.trim()}
              style={{ 
                padding: '0.8rem 1.5rem', 
                background: currentTabPhrases.length >= 12 ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                border: 'none', 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={20} /> Agregar Frase
            </button>
          </form>

          {errorMsg && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              border: '2px solid var(--danger)', 
              color: 'var(--danger)', 
              padding: '0.8rem 1rem', 
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}

          {currentTabPhrases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.2rem' }}>Esta página está vacía por el momento. Agrega tu primera frase arriba.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {currentTabPhrases.map((phrase) => {
                const isEditing = editingId === phrase.id;

                if (isEditing) {
                  return (
                    <div 
                      key={phrase.id} 
                      style={{ 
                        background: 'var(--bg-primary)', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-md)', 
                        border: '2px solid var(--accent-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem'
                      }}
                    >
                      <input 
                        type="text" 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          fontSize: '1.1rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--accent-hover)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MoveRight size={14} /> Mover a:
                        </span>
                        <select 
                          value={editTargetPage}
                          onChange={(e) => setEditTargetPage(Number(e.target.value))}
                          style={{
                            flex: 1,
                            padding: '0.4rem',
                            fontSize: '0.9rem',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6].map(pNum => (
                            <option key={pNum} value={pNum}>
                              Página {pNum}: {pageNames[pNum] || `Pág ${pNum}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => saveEditPhrase(phrase.id)}
                          style={{ background: 'var(--success)', border: 'none', padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Check size={16} /> Guardar
                        </button>
                        <button 
                          onClick={cancelEditPhrase}
                          style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.5rem', fontSize: '0.9rem' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={phrase.id}
                    style={{ 
                      background: 'var(--bg-primary)', 
                      padding: '1rem 1.2rem', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', flex: 1 }}>{phrase.text}</span>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        onClick={() => startEditingPhrase(phrase.id, phrase.text, phrase.page)}
                        title="Editar o mover frase"
                        style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
                      >
                        <Edit2 size={18} />
                      </button>

                      <button 
                        onClick={() => deletePhrase(phrase.id)}
                        title="Eliminar frase"
                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '1.2rem' }}>
            <button 
              onClick={resetDefaults}
              style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.8rem 1.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} /> Restablecer Frases Predeterminadas de Fábrica
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
