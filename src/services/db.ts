import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import JSZip from 'jszip';

export interface PhraseItem {
  id: string;
  text: string;
  page: number; // 1, 2, 3...
  category?: string;
  usageCount: number;
  createdAt: number;
}

export interface PageNameItem {
  pageNumber: number;
  name: string;
}

export interface CustomWordItem {
  id: string;
  word: string;
  source: 'MANUAL' | 'IMPORTED' | 'AUTO_LEARNED';
  createdAt: number;
}

interface EyesTalkDB extends DBSchema {
  phrases: {
    key: string;
    value: PhraseItem;
    indexes: { 'by-page': number; 'by-usage': number };
  };
  page_names: {
    key: number;
    value: PageNameItem;
  };
  custom_words: {
    key: string;
    value: CustomWordItem;
    indexes: { 'by-word': string; 'by-source': string };
  };
}

const DB_NAME = 'eyes_talk_db';
const DB_VERSION = 7; // Upgraded to v7 for deterministic phrase keys & auto-deduplication

const DEFAULT_PHRASES: { text: string; page: number }[] = [
  { text: "Tengo hambre", page: 1 },
  { text: "Tengo sed", page: 1 },
  { text: "Me duele algo", page: 1 },
  { text: "Quiero ir al baño", page: 1 },
  { text: "Por favor acomódame", page: 2 },
  { text: "Hace frío", page: 2 },
  { text: "Hace calor", page: 2 },
  { text: "Gracias", page: 2 }
];

const DEFAULT_PAGE_NAMES: Record<number, string> = {
  1: "Necesidades Básicas",
  2: "Estados y Sentimientos",
  3: "Respuestas y Acciones",
  4: "Personas y Familia",
  5: "Página 5",
  6: "Página 6"
};

// Singleton promise to prevent concurrent initDB race conditions
let dbPromise: Promise<IDBPDatabase<EyesTalkDB>> | null = null;

export const initDB = (): Promise<IDBPDatabase<EyesTalkDB>> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDB<EyesTalkDB>(DB_NAME, DB_VERSION, {
        upgrade(db, _oldVersion, _newVersion, transaction) {
          let phrasesStore: any;
          if (!db.objectStoreNames.contains('phrases')) {
            phrasesStore = db.createObjectStore('phrases', { keyPath: 'id' });
          } else {
            phrasesStore = transaction.objectStore('phrases');
          }

          if (!phrasesStore.indexNames.contains('by-page')) {
            phrasesStore.createIndex('by-page', 'page');
          }
          if (!phrasesStore.indexNames.contains('by-usage')) {
            phrasesStore.createIndex('by-usage', 'usageCount');
          }

          if (!db.objectStoreNames.contains('page_names')) {
            db.createObjectStore('page_names', { keyPath: 'pageNumber' });
          }

          let wordsStore: any;
          if (!db.objectStoreNames.contains('custom_words')) {
            wordsStore = db.createObjectStore('custom_words', { keyPath: 'id' });
          } else {
            wordsStore = transaction.objectStore('custom_words');
          }

          if (!wordsStore.indexNames.contains('by-word')) {
            wordsStore.createIndex('by-word', 'word');
          }
          if (!wordsStore.indexNames.contains('by-source')) {
            wordsStore.createIndex('by-source', 'source');
          }
        },
      });

      // 1. Seed default phrases if empty, using deterministic IDs
      try {
        const phraseCount = await db.count('phrases');
        if (phraseCount === 0) {
          const tx = db.transaction('phrases', 'readwrite');
          for (let i = 0; i < DEFAULT_PHRASES.length; i++) {
            const item = DEFAULT_PHRASES[i];
            const cleanKey = item.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const deterministicId = `default_p${item.page}_${cleanKey}`;
            
            await tx.store.put({
              id: deterministicId,
              text: item.text,
              page: item.page,
              usageCount: 0,
              createdAt: Date.now() + i,
            });
          }
          await tx.done;
        }

        const pageNamesCount = await db.count('page_names');
        if (pageNamesCount === 0) {
          const tx = db.transaction('page_names', 'readwrite');
          for (const [pageStr, name] of Object.entries(DEFAULT_PAGE_NAMES)) {
            await tx.store.put({
              pageNumber: parseInt(pageStr, 10),
              name: name,
            });
          }
          await tx.done;
        }

        // 2. Automatic Production Deduplication Pass (removes duplicate phrases by text + page)
        const allPhrases = await db.getAll('phrases');
        const seenKeys = new Set<string>();
        const duplicateIds: string[] = [];

        for (const p of allPhrases) {
          const uniqueKey = `${p.page}_${p.text.trim().toLowerCase()}`;
          if (seenKeys.has(uniqueKey)) {
            duplicateIds.push(p.id);
          } else {
            seenKeys.add(uniqueKey);
          }
        }

        if (duplicateIds.length > 0) {
          const txClean = db.transaction('phrases', 'readwrite');
          for (const dupId of duplicateIds) {
            await txClean.store.delete(dupId);
          }
          await txClean.done;
        }

      } catch (e) {
        console.error("Error during DB seeding & deduplication:", e);
      }

      return db;
    })();
  }

  return dbPromise;
};

// --- PHRASES METHODS ---
export const getPhrasesDB = async (): Promise<PhraseItem[]> => {
  const db = await initDB();
  return await db.getAll('phrases');
};

export const addPhraseDB = async (text: string, page: number = 1): Promise<PhraseItem> => {
  const db = await initDB();
  const newItem: PhraseItem = {
    id: `phrase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim(),
    page,
    usageCount: 0,
    createdAt: Date.now(),
  };
  await db.put('phrases', newItem);
  return newItem;
};

export const updatePhraseDB = async (id: string, text: string, page?: number): Promise<PhraseItem | null> => {
  const db = await initDB();
  const existing = await db.get('phrases', id);
  if (existing) {
    existing.text = text.trim();
    if (page !== undefined) existing.page = page;
    await db.put('phrases', existing);
    return existing;
  }
  return null;
};

export const deletePhraseDB = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('phrases', id);
};

export const incrementPhraseUsageDB = async (id: string): Promise<void> => {
  const db = await initDB();
  const item = await db.get('phrases', id);
  if (item) {
    item.usageCount = (item.usageCount || 0) + 1;
    await db.put('phrases', item);
  }
};

export const incrementUsageDB = incrementPhraseUsageDB;

export const resetDefaultPhrasesDB = async (): Promise<PhraseItem[]> => {
  const db = await initDB();
  await db.clear('phrases');
  const tx = db.transaction('phrases', 'readwrite');
  for (let i = 0; i < DEFAULT_PHRASES.length; i++) {
    const item = DEFAULT_PHRASES[i];
    const cleanKey = item.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const deterministicId = `default_p${item.page}_${cleanKey}`;
    await tx.store.put({
      id: deterministicId,
      text: item.text,
      page: item.page,
      usageCount: 0,
      createdAt: Date.now() + i,
    });
  }
  await tx.done;
  return await db.getAll('phrases');
};

// --- PAGE NAMES DB METHODS ---
export const getPageNamesDB = async (): Promise<Record<number, string>> => {
  try {
    const db = await initDB();
    const all = await db.getAll('page_names');
    const map: Record<number, string> = { ...DEFAULT_PAGE_NAMES };
    all.forEach(item => {
      map[item.pageNumber] = item.name;
    });
    return map;
  } catch (e) {
    return DEFAULT_PAGE_NAMES;
  }
};

export const updatePageNameDB = async (pageNumber: number, name: string): Promise<void> => {
  const db = await initDB();
  await db.put('page_names', { pageNumber, name: name.trim() });
};

export const savePageNameDB = updatePageNameDB;

// --- CUSTOM PREDICTIVE WORDS DB METHODS ---
export const getCustomWordsDB = async (): Promise<CustomWordItem[]> => {
  try {
    const db = await initDB();
    const all = await db.getAll('custom_words');
    return all.map(w => ({
      ...w,
      source: w.source || 'MANUAL'
    })).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('Error fetching custom words:', e);
    return [];
  }
};

export const addCustomWordDB = async (
  word: string, 
  source: 'MANUAL' | 'IMPORTED' | 'AUTO_LEARNED' = 'MANUAL'
): Promise<CustomWordItem | null> => {
  const clean = word.trim().toLowerCase().replace(/[^a-záéíóúñ]/g, '');
  if (!clean || clean.length < 2) return null;

  const db = await initDB();
  const existing = await db.getAllFromIndex('custom_words', 'by-word', clean);
  if (existing.length > 0) {
    return {
      ...existing[0],
      source: existing[0].source || 'MANUAL'
    };
  }

  const newItem: CustomWordItem = {
    id: `cword_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    word: clean,
    source,
    createdAt: Date.now(),
  };

  await db.put('custom_words', newItem);
  return newItem;
};

export const deleteCustomWordDB = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('custom_words', id);
};

export const clearCustomWordsBySourceDB = async (source: 'MANUAL' | 'IMPORTED' | 'AUTO_LEARNED'): Promise<void> => {
  const db = await initDB();
  const all = await db.getAll('custom_words');
  const tx = db.transaction('custom_words', 'readwrite');
  for (const item of all) {
    if ((item.source || 'MANUAL') === source) {
      await tx.store.delete(item.id);
    }
  }
  await tx.done;
};

export const bulkImportWordsDB = async (rawText: string): Promise<number> => {
  if (!rawText.trim()) return 0;
  
  const words = rawText
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-záéíóúñ]+/i)
    .map(w => w.trim())
    .filter(w => w.length >= 2);

  const uniqueWords = Array.from(new Set(words));
  if (uniqueWords.length === 0) return 0;

  const db = await initDB();
  const existingAll = await db.getAll('custom_words');
  const existingSet = new Set(existingAll.map(w => w.word.toLowerCase()));

  const tx = db.transaction('custom_words', 'readwrite');
  let addedCount = 0;

  for (const word of uniqueWords) {
    if (!existingSet.has(word)) {
      await tx.store.add({
        id: `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        word,
        source: 'IMPORTED',
        createdAt: Date.now(),
      });
      existingSet.add(word);
      addedCount++;
    }
  }

  await tx.done;
  return addedCount;
};

// --- BACKUP & RESTORE METHODS ---
export interface BackupData {
  version: number;
  exportedAt: string;
  calibration?: any;
  phrases: PhraseItem[];
  pageNames: Record<number, string>;
  customWords: CustomWordItem[];
}

export const exportFullBackupDB = async (): Promise<BackupData> => {
  const db = await initDB();
  const phrases = await db.getAll('phrases');
  const pageNamesRaw = await db.getAll('page_names');
  const customWords = await db.getAll('custom_words');

  const pageNames: Record<number, string> = {};
  pageNamesRaw.forEach(item => {
    pageNames[item.pageNumber] = item.name;
  });

  let calibration = null;
  const savedCalib = localStorage.getItem('eyes_talk_calibration');
  if (savedCalib) {
    try {
      calibration = JSON.parse(savedCalib);
    } catch (e) {}
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    calibration,
    phrases,
    pageNames,
    customWords,
  };
};

export const importFullBackupDB = async (data: any): Promise<{ phrasesCount: number; wordsCount: number; hasCalibration: boolean }> => {
  if (!data || typeof data !== 'object') {
    throw new Error('Archivo de copia de seguridad no válido.');
  }

  const db = await initDB();

  // 1. Import Calibration
  let hasCalibration = false;
  if (data.calibration && typeof data.calibration === 'object') {
    localStorage.setItem('eyes_talk_calibration', JSON.stringify(data.calibration));
    hasCalibration = true;
  }

  // 2. Import Phrases
  let phrasesCount = 0;
  if (Array.isArray(data.phrases) && data.phrases.length > 0) {
    const tx = db.transaction('phrases', 'readwrite');
    for (const p of data.phrases) {
      if (p && p.id && p.text) {
        await tx.store.put({
          id: p.id,
          text: p.text,
          page: p.page || 1,
          category: p.category,
          usageCount: p.usageCount || 0,
          createdAt: p.createdAt || Date.now(),
        });
        phrasesCount++;
      }
    }
    await tx.done;
  }

  // 3. Import Page Names
  if (data.pageNames && typeof data.pageNames === 'object') {
    const tx = db.transaction('page_names', 'readwrite');
    for (const [pageStr, name] of Object.entries(data.pageNames)) {
      const pageNumber = parseInt(pageStr, 10);
      if (!isNaN(pageNumber) && typeof name === 'string') {
        await tx.store.put({ pageNumber, name });
      }
    }
    await tx.done;
  }

  // 4. Import Custom Words
  let wordsCount = 0;
  if (Array.isArray(data.customWords) && data.customWords.length > 0) {
    const tx = db.transaction('custom_words', 'readwrite');
    for (const w of data.customWords) {
      if (w && w.word) {
        await tx.store.put({
          id: w.id || `cword_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          word: w.word,
          source: w.source || 'MANUAL',
          createdAt: w.createdAt || Date.now(),
        });
        wordsCount++;
      }
    }
    await tx.done;
  }

  return { phrasesCount, wordsCount, hasCalibration };
};

export const exportFullBackupZip = async (): Promise<Blob> => {
  const backupData = await exportFullBackupDB();
  const jsonStr = JSON.stringify(backupData, null, 2);

  const zip = new JSZip();
  zip.file("eyes_talk_backup.json", jsonStr);

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });
};

export const importFullBackupZip = async (file: File): Promise<{ phrasesCount: number; wordsCount: number; hasCalibration: boolean }> => {
  if (file.name.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return await importFullBackupDB(parsed);
  }

  const zip = new JSZip();
  const unzipped = await zip.loadAsync(file);
  
  const jsonFile = unzipped.file("eyes_talk_backup.json") || Object.values(unzipped.files).find(f => f.name.endsWith('.json'));
  if (!jsonFile) {
    throw new Error('El archivo ZIP no contiene una copia de seguridad válida de Eyes Talk (eyes_talk_backup.json).');
  }

  const jsonText = await jsonFile.async("text");
  const parsedData = JSON.parse(jsonText);
  return await importFullBackupDB(parsedData);
};
