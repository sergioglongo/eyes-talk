import { openDB, type DBSchema } from 'idb';

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
}

const DB_NAME = 'eyes_talk_db';
const DB_VERSION = 3;

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

export const initDB = async () => {
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
    },
  });

  // Seed default phrases if empty
  try {
    const phraseCount = await db.count('phrases');
    if (phraseCount === 0) {
      const tx = db.transaction('phrases', 'readwrite');
      for (let i = 0; i < DEFAULT_PHRASES.length; i++) {
        const item = DEFAULT_PHRASES[i];
        await tx.store.add({
          id: `default_${i}_${Date.now()}`,
          text: item.text,
          page: item.page,
          usageCount: 0,
          createdAt: Date.now() + i,
        });
      }
      await tx.done;
    }

    // Seed default page names if empty
    const pageNamesCount = await db.count('page_names');
    if (pageNamesCount === 0) {
      const tx = db.transaction('page_names', 'readwrite');
      for (const [pageStr, name] of Object.entries(DEFAULT_PAGE_NAMES)) {
        await tx.store.add({
          pageNumber: Number(pageStr),
          name,
        });
      }
      await tx.done;
    }
  } catch (e) {
    console.error('Error seeding DB defaults:', e);
  }

  return db;
};

export const getPhrasesDB = async (): Promise<PhraseItem[]> => {
  try {
    const db = await initDB();
    const all = await db.getAll('phrases');
    if (all.length === 0) {
      return await resetDefaultPhrasesDB();
    }
    return all.map(p => ({ ...p, page: p.page || 1 })).sort((a, b) => a.createdAt - b.createdAt);
  } catch (e) {
    console.error('Error fetching phrases from IndexedDB:', e);
    return [];
  }
};

export const getPageNamesDB = async (): Promise<Record<number, string>> => {
  try {
    const db = await initDB();
    const all = await db.getAll('page_names');
    const result: Record<number, string> = { ...DEFAULT_PAGE_NAMES };
    for (const item of all) {
      result[item.pageNumber] = item.name;
    }
    return result;
  } catch (e) {
    console.error('Error fetching page names:', e);
    return DEFAULT_PAGE_NAMES;
  }
};

export const savePageNameDB = async (pageNumber: number, name: string): Promise<void> => {
  const db = await initDB();
  await db.put('page_names', { pageNumber, name: name.trim() });
};

export const addPhraseDB = async (text: string, page: number = 1): Promise<PhraseItem> => {
  const db = await initDB();
  const newItem: PhraseItem = {
    id: `phrase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim(),
    page: page || 1,
    usageCount: 0,
    createdAt: Date.now(),
  };
  await db.put('phrases', newItem);
  return newItem;
};

export const updatePhraseDB = async (id: string, newText: string, newPage: number): Promise<PhraseItem | null> => {
  const db = await initDB();
  const item = await db.get('phrases', id);
  if (!item) return null;
  
  const updatedItem: PhraseItem = {
    ...item,
    text: newText.trim(),
    page: newPage || 1,
  };
  await db.put('phrases', updatedItem);
  return updatedItem;
};

export const deletePhraseDB = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('phrases', id);
};

export const incrementUsageDB = async (id: string): Promise<void> => {
  const db = await initDB();
  const item = await db.get('phrases', id);
  if (item) {
    item.usageCount += 1;
    await db.put('phrases', item);
  }
};

export const resetDefaultPhrasesDB = async (): Promise<PhraseItem[]> => {
  const db = await initDB();
  await db.clear('phrases');
  const tx = db.transaction('phrases', 'readwrite');
  for (let i = 0; i < DEFAULT_PHRASES.length; i++) {
    const item = DEFAULT_PHRASES[i];
    await tx.store.add({
      id: `default_${i}_${Date.now()}`,
      text: item.text,
      page: item.page,
      usageCount: 0,
      createdAt: Date.now() + i,
    });
  }
  await tx.done;
  return await db.getAll('phrases');
};
