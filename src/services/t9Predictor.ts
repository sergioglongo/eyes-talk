import { SPANISH_DICTIONARY, NEXT_WORD_MAP, wordToT9Sequence } from '../data/spanishDictionary';
import { addCustomWordDB } from './db';

export interface PredictiveResult {
  word: string;
  source: 'exact' | 'prefix' | 'bigram' | 'custom';
}

export const learnCustomWord = (word: string) => {
  const clean = word.trim().toLowerCase().replace(/[^a-záéíóúñ]/g, '');
  if (!clean || clean.length < 2) return;

  addCustomWordDB(clean, 'AUTO_LEARNED').catch(console.error);

  try {
    const saved = localStorage.getItem('eyes_talk_learned_words');
    const list: string[] = saved ? JSON.parse(saved) : [];
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem('eyes_talk_learned_words', JSON.stringify(list));
    }
  } catch (e) {
    console.error('Error saving learned word', e);
  }
};

export const getLearnedCustomWords = (): string[] => {
  try {
    const saved = localStorage.getItem('eyes_talk_learned_words');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const getT9Predictions = (
  numericSequence: string,
  previousWord: string = '',
  customWords: string[] = []
): string[] => {
  const cleanSeq = numericSequence.trim();
  const learnedWords = Array.from(new Set([...getLearnedCustomWords(), ...customWords]));

  // If no current T9 sequence is being typed, provide Next-Word predictions
  if (!cleanSeq) {
    const cleanPrev = previousWord.trim().toLowerCase();
    if (cleanPrev && NEXT_WORD_MAP[cleanPrev]) {
      return NEXT_WORD_MAP[cleanPrev].slice(0, 6);
    }
    return ["hola", "necesito", "tengo", "quiero", "hasta", "gracias"];
  }

  const results: { word: string; score: number }[] = [];
  const seenWords = new Set<string>();

  // 1. Check Custom & Auto-Learned Words (Highest Priority)
  for (const cWord of learnedWords) {
    const cLower = cWord.toLowerCase();
    if (seenWords.has(cLower)) continue;

    const cSeq = wordToT9Sequence(cLower);
    if (cSeq === cleanSeq) {
      results.push({ word: cWord, score: 5000 });
      seenWords.add(cLower);
    } else if (cSeq.startsWith(cleanSeq)) {
      results.push({ word: cWord, score: 3500 - (cSeq.length - cleanSeq.length) * 10 });
      seenWords.add(cLower);
    }
  }

  // 2. Check Static Dictionary (Exact & Prefix matches)
  for (const entry of SPANISH_DICTIONARY) {
    const wLower = entry.word.toLowerCase();
    if (seenWords.has(wLower)) continue;

    if (entry.seq === cleanSeq) {
      // Exact match
      let score = 2500 + entry.freq;
      const cleanPrev = previousWord.trim().toLowerCase();
      if (cleanPrev && NEXT_WORD_MAP[cleanPrev]?.includes(wLower)) {
        score += 800;
      }
      results.push({ word: entry.word, score });
      seenWords.add(wLower);
    } else if (entry.seq.startsWith(cleanSeq)) {
      // Prefix match (autocompletion)
      let score = 1500 + entry.freq - (entry.seq.length - cleanSeq.length) * 5;
      const cleanPrev = previousWord.trim().toLowerCase();
      if (cleanPrev && NEXT_WORD_MAP[cleanPrev]?.includes(wLower)) {
        score += 500;
      }
      results.push({ word: entry.word, score });
      seenWords.add(wLower);
    }
  }

  if (results.length === 0) return [];

  // Sort candidates by score descending
  results.sort((a, b) => b.score - a.score);

  // START-LETTER DIVERSITY BALANCER
  const letterBuckets: Record<string, { word: string; score: number }[]> = {};
  for (const item of results) {
    const firstChar = item.word[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!letterBuckets[firstChar]) {
      letterBuckets[firstChar] = [];
    }
    letterBuckets[firstChar].push(item);
  }

  const finalCandidates: string[] = [];
  const bucketKeys = Object.keys(letterBuckets);
  if (bucketKeys.length === 0) return results.slice(0, 6).map(r => r.word);

  const maxBucketLength = Math.max(...bucketKeys.map(k => letterBuckets[k].length));

  for (let i = 0; i < maxBucketLength; i++) {
    for (const key of bucketKeys) {
      if (letterBuckets[key][i] && finalCandidates.length < 6) {
        finalCandidates.push(letterBuckets[key][i].word);
      }
    }
    if (finalCandidates.length >= 6) break;
  }

  return finalCandidates.slice(0, 6);
};
