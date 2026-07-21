import { useState, useEffect, useCallback } from 'react';
import { 
  type PhraseItem, 
  getPhrasesDB, 
  getPageNamesDB,
  savePageNameDB,
  addPhraseDB, 
  updatePhraseDB,
  deletePhraseDB, 
  incrementUsageDB, 
  resetDefaultPhrasesDB 
} from '../services/db';

export const usePhrases = () => {
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [pageNames, setPageNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [phrasesData, pageNamesData] = await Promise.all([
        getPhrasesDB(),
        getPageNamesDB(),
      ]);
      setPhrases(phrasesData);
      setPageNames(pageNamesData);
    } catch (e) {
      console.error('Error loading phrases & page names:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savePageName = async (pageNumber: number, name: string) => {
    if (!name.trim()) return;
    await savePageNameDB(pageNumber, name.trim());
    setPageNames(prev => ({ ...prev, [pageNumber]: name.trim() }));
  };

  const addPhrase = async (text: string, page: number = 1) => {
    if (!text.trim()) return;
    const newItem = await addPhraseDB(text, page);
    setPhrases(prev => [...prev, newItem]);
  };

  const updatePhrase = async (id: string, text: string, page: number) => {
    if (!text.trim()) return;
    const updated = await updatePhraseDB(id, text, page);
    if (updated) {
      setPhrases(prev => prev.map(p => p.id === id ? updated : p));
    }
  };

  const deletePhrase = async (id: string) => {
    await deletePhraseDB(id);
    setPhrases(prev => prev.filter(p => p.id !== id));
  };

  const incrementUsage = async (id: string) => {
    await incrementUsageDB(id);
    setPhrases(prev => prev.map(p => p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p));
  };

  const resetDefaults = async () => {
    const fresh = await resetDefaultPhrasesDB();
    setPhrases(fresh);
  };

  return {
    phrases,
    pageNames,
    loading,
    savePageName,
    addPhrase,
    updatePhrase,
    deletePhrase,
    incrementUsage,
    resetDefaults,
    reloadPhrases: loadData,
  };
};
