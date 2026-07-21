import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackingContext } from '../context/TrackingContext';
import { usePhrases } from '../hooks/usePhrases';
import { useTTS } from '../hooks/useTTS';
import { Trash2, Plus, RefreshCw, Edit2, Check, X, AlertCircle, Bookmark, MoveRight, Volume2, Mic } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { calibration, saveCalibration } = useTrackingContext();
  const { phrases, pageNames, savePageName, addPhrase, updatePhrase, deletePhrase, resetDefaults } = usePhrases();
  const { speak, voices } = useTTS();

  // Active Selected Page Tab (1 to 6)
  const [selectedPageTab, setSelectedPageTab] = useState<number>(1);

  // Inputs
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [editingPageTitle, setEditingPageTitle] = useState(false);
  const [pageTitleInput, setPageTitleInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit phrase state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editTargetPage, setEditTargetPage] = useState<number>(1);

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

  // Sort Spanish voices first
  const sortedVoices = [...voices].sort((a, b) => {
    const aIsEs = a.lang.startsWith('es') ? 0 : 1;
    const bIsEs = b.lang.startsWith('es') ? 0 : 1;
    return aIsEs - bIsEs;
  });

  return (
    <div style={{ height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
      <h1>Configuración y Ajustes</h1>

      {/* Voice & TTS Settings Section */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-hover)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Volume2 size={24} /> Ajustes de Voz (Voz, Velocidad y Volumen)
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Elige la voz del sistema y personaliza el ritmo y la intensidad con la que se leen las frases.
        </p>

        {/* Voice Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Mic size={20} /> Selección de Voz del Sistema:
          </label>
          <select 
            value={calibration.selectedVoiceURI || ''} 
            onChange={(e) => handleVoiceChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              fontSize: '1.1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '2px solid var(--bg-tertiary)'
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* Speed / Rate */}
          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Velocidad de Lectura</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Disminuye para hablar más pausado o aumenta para hablar más rápido.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => handleSpeechRateChange(-0.1)}
                style={{ width: '45px', height: '45px', fontSize: '1.4rem', background: 'var(--bg-tertiary)' }}
              >
                -
              </button>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
                {(calibration.speechRate ?? 1.0).toFixed(1)}x
              </span>
              <button 
                onClick={() => handleSpeechRateChange(0.1)}
                style={{ width: '45px', height: '45px', fontSize: '1.4rem', background: 'var(--bg-tertiary)' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Volume */}
          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Volumen de Voz</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ajusta la potencia del altavoz (20% a 100%).</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => handleSpeechVolumeChange(-0.1)}
                style={{ width: '45px', height: '45px', fontSize: '1.4rem', background: 'var(--bg-tertiary)' }}
              >
                -
              </button>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
                {Math.round((calibration.speechVolume ?? 1.0) * 100)}%
              </span>
              <button 
                onClick={() => handleSpeechVolumeChange(0.1)}
                style={{ width: '45px', height: '45px', fontSize: '1.4rem', background: 'var(--bg-tertiary)' }}
              >
                +
              </button>
            </div>
          </div>

        </div>

        <button 
          onClick={() => speak('Hola, esta es una prueba de la voz seleccionada en Eyes Talk.')}
          style={{ padding: '0.8rem 1.5rem', background: 'var(--accent-primary)', border: 'none', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🔊 Probar Voz Ahora
        </button>
      </div>

      {/* Dedicated Tabbed Phrase & Page Management */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-primary)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bookmark size={24} /> Gestión de Páginas y Frases
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>
          Selecciona una página para ver sus frases, cambiar el nombre de la categoría o agregar nuevas palabras.
        </p>

        {/* Page Selector Tabs */}
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

        {/* Selected Page Header & Title Editor */}
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
                  <Edit2 size={16} /> Renombrar Categoría
                </button>
              </div>
            )}

            <span style={{ fontSize: '1rem', color: currentTabPhrases.length >= 12 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
              {currentTabPhrases.length} / 12 frases utilizadas
            </span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> {errorMsg}
          </div>
        )}

        {/* Add Phrase Form to Selected Page */}
        <form onSubmit={handleAddPhraseSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder={`Agregar nueva frase a "${pageNames[selectedPageTab] || `Página ${selectedPageTab}`}"...`}
            value={newPhraseInput}
            onChange={(e) => setNewPhraseInput(e.target.value)}
            disabled={currentTabPhrases.length >= 12}
            style={{
              flex: 1,
              padding: '0.8rem 1rem',
              fontSize: '1.1rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--bg-tertiary)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              opacity: currentTabPhrases.length >= 12 ? 0.5 : 1
            }}
          />
          <button 
            type="submit" 
            disabled={currentTabPhrases.length >= 12}
            style={{ 
              padding: '0.8rem 1.5rem', 
              background: currentTabPhrases.length >= 12 ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
              color: 'white', 
              border: 'none', 
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: currentTabPhrases.length >= 12 ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus size={20} /> Agregar a Pág {selectedPageTab}
          </button>
        </form>

        {/* List of Phrases for THIS Selected Page */}
        <div style={{ border: '1px solid var(--bg-tertiary)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', overflow: 'hidden' }}>
          {currentTabPhrases.length === 0 ? (
            <p style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '1.1rem' }}>
              No hay frases en la Página {selectedPageTab} ({pageNames[selectedPageTab]}). ¡Escribe una arriba para agregarla!
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {currentTabPhrases.map((p, i) => (
                <li 
                  key={p.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1rem',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderBottom: i === currentTabPhrases.length - 1 ? 'none' : '1px solid var(--bg-tertiary)',
                    gap: '1rem'
                  }}
                >
                  {editingId === p.id ? (
                    // Inline Edit Form
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                      <input 
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.8rem',
                          fontSize: '1.1rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '2px solid var(--accent-hover)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><MoveRight size={16} /> Mover a:</span>
                        <select 
                          value={editTargetPage} 
                          onChange={(e) => setEditTargetPage(Number(e.target.value))}
                          style={{
                            padding: '0.6rem',
                            fontSize: '1rem',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '2px solid var(--accent-hover)',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6].map(num => (
                            <option key={num} value={num}>Pág {num}: {pageNames[num]}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={() => saveEditPhrase(p.id)}
                        style={{ background: 'var(--success)', border: 'none', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)' }}
                        title="Guardar cambios"
                      >
                        <Check size={20} />
                      </button>
                      <button 
                        onClick={cancelEditPhrase}
                        style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}
                        title="Cancelar"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <span style={{ fontSize: '1.3rem', fontWeight: '500', flex: 1 }}>"{p.text}"</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Usada {p.usageCount} veces</span>
                        <button 
                          onClick={() => startEditingPhrase(p.id, p.text, p.page || selectedPageTab)}
                          style={{ 
                            background: 'var(--bg-tertiary)', 
                            border: 'none', 
                            padding: '0.5rem 0.8rem', 
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.95rem'
                          }}
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        <button 
                          onClick={() => deletePhrase(p.id)}
                          style={{ 
                            background: 'var(--danger)', 
                            border: 'none', 
                            padding: '0.5rem 0.8rem', 
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.95rem'
                          }}
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={resetDefaults}
            style={{ 
              background: 'var(--bg-tertiary)', 
              border: 'none', 
              padding: '0.6rem 1.2rem', 
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} /> Restablecer Frases Predeterminadas
          </button>
        </div>

      </div>

      {/* Tracking Mode Selection */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)' }}>Modo de Rastreo de Cámara</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Elige qué parte del rostro rastreará la cámara web. Para pruebas en PC con cámara estándar, el seguimiento por Cabeza es mucho más estable.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleModeChange('HEAD')}
            style={{ 
              padding: '1rem 1.5rem', 
              background: calibration.mode === 'HEAD' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: calibration.mode === 'HEAD' ? '2px solid var(--accent-hover)' : 'none',
              fontSize: '1.1rem'
            }}
          >
            🧑 Cabeza (Navegación por nariz) - RECOMENDADO
          </button>
          <button 
            onClick={() => handleModeChange('GAZE')}
            style={{ 
              padding: '1rem 1.5rem', 
              background: calibration.mode === 'GAZE' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: calibration.mode === 'GAZE' ? '2px solid var(--accent-hover)' : 'none',
              fontSize: '1.1rem'
            }}
          >
            👀 Mirada (Pupilas / Ojos)
          </button>
        </div>
      </div>

      {/* Selection Method */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)' }}>Método de Activación / Confirmación</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Elige cómo deseas confirmar las selecciones al apuntar a una opción o botón.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleSelectionMethodChange('BOTH')}
            style={{ 
              padding: '1rem 1.5rem', 
              background: calibration.selectionMethod === 'BOTH' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: calibration.selectionMethod === 'BOTH' ? '2px solid var(--accent-hover)' : 'none',
              fontSize: '1.1rem'
            }}
          >
            ⚡ Ambos (Mirada O Pestañeo) - RECOMENDADO
          </button>
          <button 
            onClick={() => handleSelectionMethodChange('BLINK')}
            style={{ 
              padding: '1rem 1.5rem', 
              background: calibration.selectionMethod === 'BLINK' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: calibration.selectionMethod === 'BLINK' ? '2px solid var(--accent-hover)' : 'none',
              fontSize: '1.1rem'
            }}
          >
            😉 Solo Pestañeo Intencional
          </button>
          <button 
            onClick={() => handleSelectionMethodChange('DWELL')}
            style={{ 
              padding: '1rem 1.5rem', 
              background: calibration.selectionMethod === 'DWELL' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: calibration.selectionMethod === 'DWELL' ? '2px solid var(--accent-hover)' : 'none',
              fontSize: '1.1rem'
            }}
          >
            ⏱️ Solo Mirada Sostenida (Dwell)
          </button>
        </div>
      </div>

      {/* Intentional Blink Duration */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)' }}>Tiempo de Pestañeo Intencional (Ventana de Clic)</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Define la duración de pestañeo rápido (ej: 0.40s). Si mantienes los ojos cerrados por más de 0.80s (ej. al bostezar o dormir), el clic se CANCELARÁ por seguridad.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => handleBlinkDurationChange(-0.05)}
            style={{ width: '50px', height: '50px', fontSize: '1.5rem', background: 'var(--bg-tertiary)' }}
          >
            -
          </button>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(calibration.blinkDuration || 0.4).toFixed(2)}s</span>
          <button 
            onClick={() => handleBlinkDurationChange(0.05)}
            style={{ width: '50px', height: '50px', fontSize: '1.5rem', background: 'var(--bg-tertiary)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Calibration Section */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)' }}>Calibración de Centro</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Realiza una calibración rápida de 2 segundos para registrar tu posición central en pantalla.
        </p>
        <button 
          onClick={() => navigate('/calibrate')}
          style={{ padding: '0.8rem 1.5rem', background: 'var(--accent-primary)', border: 'none', fontSize: '1.1rem' }}
        >
          Iniciar Calibración de Centro
        </button>
      </div>

      {/* Sensitivity Section */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--bg-tertiary)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--accent-hover)' }}>Sensibilidad del Rastreo</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Aumenta la sensibilidad si te cuesta mover el punto azul hacia los bordes de la pantalla.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => handleSensitivityChange(-0.5)}
            style={{ width: '50px', height: '50px', fontSize: '1.5rem', background: 'var(--bg-tertiary)' }}
          >
            -
          </button>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{calibration.sensitivity.toFixed(1)}x</span>
          <button 
            onClick={() => handleSensitivityChange(0.5)}
            style={{ width: '50px', height: '50px', fontSize: '1.5rem', background: 'var(--bg-tertiary)' }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/')}
          style={{ padding: '1rem 2rem', background: 'var(--bg-tertiary)' }}
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default Settings;
