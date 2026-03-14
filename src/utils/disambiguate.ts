import {
  DISAMBIGUATION_CATEGORY_PRIOR,
  DISAMBIGUATION_CONTEXT_WINDOW,
  DISAMBIGUATION_MAX_REFERENCE_NORM,
  DISAMBIGUATION_WEIGHTS,
} from '../config/disambiguation';
import type {
  DictionaryCandidate,
  DictionaryCandidateFeatures,
  DictionaryEntry,
} from '../types/bible';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueTokens(text: string): Set<string> {
  return new Set(tokenize(text));
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap++;
  }
  return overlap / Math.max(a.size, b.size);
}

function contextWindowTokens(text: string, term: string): Set<string> {
  const all = tokenize(text);
  if (all.length === 0) return new Set();

  const normalizedTerm = term.toLowerCase();
  let index = all.findIndex(t => t === normalizedTerm);
  if (index < 0) {
    // Fallback to first token for multi-word terms or punctuation variance.
    const firstTermToken = tokenize(term)[0];
    if (firstTermToken) {
      index = all.findIndex(t => t === firstTermToken);
    }
  }
  if (index < 0) {
    return new Set(all);
  }

  const start = Math.max(0, index - DISAMBIGUATION_CONTEXT_WINDOW);
  const end = Math.min(all.length, index + DISAMBIGUATION_CONTEXT_WINDOW + 1);
  return new Set(all.slice(start, end));
}

function referenceSupportScore(entry: DictionaryEntry): number {
  return Math.min(entry.references.length / DISAMBIGUATION_MAX_REFERENCE_NORM, 1);
}

function bookReferencePrior(entry: DictionaryEntry, currentBook?: string): number {
  if (!currentBook) return 0;
  const bookLower = currentBook.toLowerCase();
  return entry.references.some(ref => ref.toLowerCase().startsWith(bookLower + ' ')) ? 1 : 0;
}

function queryDefinitionOverlap(entry: DictionaryEntry, queryText?: string): number {
  if (!queryText?.trim()) return 0;
  const q = uniqueTokens(queryText);
  const def = uniqueTokens(entry.definition);
  return overlapRatio(q, def);
}

function candidateFeatures(
  entry: DictionaryEntry,
  term: string,
  contextText: string,
  currentBook?: string,
  queryText?: string,
): DictionaryCandidateFeatures {
  const normalizedTerm = term.toLowerCase();
  const exactTermMatch = entry.term.toLowerCase() === normalizedTerm ? 1 : 0;
  const contextTokens = contextWindowTokens(contextText, term);
  const defTokens = uniqueTokens(entry.definition);
  return {
    exactTermMatch,
    contextDefinitionOverlap: overlapRatio(contextTokens, defTokens),
    referenceSupport: referenceSupportScore(entry),
    bookReferencePrior: bookReferencePrior(entry, currentBook),
    categoryPrior: DISAMBIGUATION_CATEGORY_PRIOR[entry.category],
    queryDefinitionOverlap: queryDefinitionOverlap(entry, queryText),
  };
}

function aggregateScore(features: DictionaryCandidateFeatures): number {
  return (
    features.exactTermMatch * DISAMBIGUATION_WEIGHTS.exactTermMatch +
    features.contextDefinitionOverlap * DISAMBIGUATION_WEIGHTS.contextDefinitionOverlap +
    features.referenceSupport * DISAMBIGUATION_WEIGHTS.referenceSupport +
    features.bookReferencePrior * DISAMBIGUATION_WEIGHTS.bookReferencePrior +
    features.categoryPrior * DISAMBIGUATION_WEIGHTS.categoryPrior +
    features.queryDefinitionOverlap * DISAMBIGUATION_WEIGHTS.queryDefinitionOverlap
  );
}

function confidenceForRank(sorted: DictionaryCandidate[], idx: number): number {
  if (sorted.length === 0 || idx >= sorted.length) return 0;
  const current = sorted[idx].score;
  const runnerUp = sorted[Math.min(idx + 1, sorted.length - 1)].score;
  if (idx === sorted.length - 1) return 1;
  if (current <= 0) return 0;
  const margin = (current - runnerUp) / current;
  return Math.max(0, Math.min(1, margin));
}

interface RankDictionaryCandidatesInput {
  term: string;
  entries: DictionaryEntry[];
  contextText: string;
  currentBook?: string;
  queryText?: string;
  limit?: number;
}

export function rankDictionaryCandidates({
  term,
  entries,
  contextText,
  currentBook,
  queryText,
  limit,
}: RankDictionaryCandidatesInput): DictionaryCandidate[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  const exactCandidates = entries.filter(e => e.term.toLowerCase() === normalized);
  const candidatesPool = exactCandidates.length > 0 ? exactCandidates : entries;

  const ranked = candidatesPool
    .map(entry => {
      const features = candidateFeatures(entry, term, contextText, currentBook, queryText);
      return {
        entry,
        features,
        score: aggregateScore(features),
        confidence: 0,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.entry.references.length !== a.entry.references.length) {
        return b.entry.references.length - a.entry.references.length;
      }
      return a.entry.term.localeCompare(b.entry.term);
    });

  const scored = ranked.map((candidate, idx) => ({
    ...candidate,
    confidence: confidenceForRank(ranked, idx),
  }));

  return typeof limit === 'number' ? scored.slice(0, limit) : scored;
}

export function scoreDictionaryEntryForQuery(entry: DictionaryEntry, queryText: string): number {
  const q = queryText.trim().toLowerCase();
  if (!q) return 0;

  const termLower = entry.term.toLowerCase();
  const startsWith = termLower.startsWith(q) ? 1 : 0;
  const includes = termLower.includes(q) ? 1 : 0;
  const definitionIncludes = entry.definition.toLowerCase().includes(q) ? 1 : 0;

  const lexical = startsWith * 0.5 + includes * 0.3 + definitionIncludes * 0.2;
  const popularity = referenceSupportScore(entry) * 0.25;
  const category = DISAMBIGUATION_CATEGORY_PRIOR[entry.category] * 0.1;

  return lexical + popularity + category;
}
