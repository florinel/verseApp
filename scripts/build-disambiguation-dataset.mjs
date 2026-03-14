import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BIBLE_DIR = join(ROOT, 'public', 'data', 'bible', 'nasb');
const DICT_DIR = join(ROOT, 'public', 'data', 'dictionaries');
const OUT_DIR = join(ROOT, 'public', 'data', 'disambiguation');
const OUT_FILE = join(OUT_DIR, 'training-dataset.json');

const CATEGORY_PRIOR = {
  person: 1,
  place: 0.85,
  event: 0.75,
  topic: 0.7,
};

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueTokens(text) {
  return new Set(tokenize(text));
}

function overlapRatio(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap++;
  }
  return overlap / Math.max(a.size, b.size);
}

function contextWindowTokens(text, term, windowSize = 5) {
  const all = tokenize(text);
  if (!all.length) return new Set();
  const normTerm = term.toLowerCase();
  let idx = all.findIndex(t => t === normTerm);
  if (idx < 0) {
    const first = tokenize(term)[0];
    if (first) idx = all.findIndex(t => t === first);
  }
  if (idx < 0) return new Set(all);
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(all.length, idx + windowSize + 1);
  return new Set(all.slice(start, end));
}

function parseRef(ref) {
  const match = String(ref).trim().match(/^(.*?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return {
    book: match[1].toLowerCase().replace(/\s+/g, ' ').trim(),
    chapter: Number(match[2]),
    verse: Number(match[3]),
  };
}

function referenceSupport(entry) {
  return Math.min(entry.references.length / 10, 1);
}

function bookPrior(entry, book) {
  if (!book) return 0;
  return entry.references.some(ref => {
    const p = parseRef(ref);
    return p && p.book === book;
  }) ? 1 : 0;
}

function exactReferencePrior(entry, book, chapter, verse) {
  if (!book || !chapter || !verse) return 0;
  return entry.references.some(ref => {
    const p = parseRef(ref);
    return p && p.book === book && p.chapter === chapter && p.verse === verse;
  }) ? 1 : 0;
}

function includesWholeWord(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function loadDictionaryEntries() {
  const files = ['people.json', 'places.json', 'events.json', 'topics.json'];
  return files.flatMap(file => readJson(join(DICT_DIR, file)));
}

function loadVerseMap() {
  const map = new Map();
  const files = readdirSync(BIBLE_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const data = readJson(join(BIBLE_DIR, file));
    const book = String(data.bookName).toLowerCase().replace(/\s+/g, ' ').trim();
    for (const chapter of data.chapters || []) {
      for (const verse of chapter.verses || []) {
        const key = `${book}|${chapter.chapter}|${verse.verse}`;
        map.set(key, verse.text);
      }
    }
  }
  return map;
}

function buildFeatures(candidate, term, verseText, book, chapter, verse) {
  const contextTokens = contextWindowTokens(verseText, term);
  const defTokens = uniqueTokens(candidate.definition || '');
  return {
    exactTermMatch: String(candidate.term).toLowerCase() === String(term).toLowerCase() ? 1 : 0,
    exactReferencePrior: exactReferencePrior(candidate, book, chapter, verse),
    contextDefinitionOverlap: overlapRatio(contextTokens, defTokens),
    referenceSupport: referenceSupport(candidate),
    bookReferencePrior: bookPrior(candidate, book),
    categoryPrior: CATEGORY_PRIOR[candidate.category] ?? 0.5,
    queryDefinitionOverlap: 0,
  };
}

function main() {
  const entries = loadDictionaryEntries();
  const verses = loadVerseMap();

  const byTerm = new Map();
  for (const entry of entries) {
    const term = String(entry.term).toLowerCase();
    if (!byTerm.has(term)) byTerm.set(term, []);
    byTerm.get(term).push(entry);
  }

  const ambiguous = [...byTerm.entries()].filter(([, list]) => list.length > 1);
  const samples = [];

  for (const [term, candidates] of ambiguous) {
    candidates.forEach((positiveCandidate, positiveIndex) => {
      for (const ref of positiveCandidate.references || []) {
        const parsed = parseRef(ref);
        if (!parsed) continue;
        const key = `${parsed.book}|${parsed.chapter}|${parsed.verse}`;
        const verseText = verses.get(key);
        if (!verseText) continue;
        if (!includesWholeWord(verseText, positiveCandidate.term)) continue;

        candidates.forEach((candidate, candidateIndex) => {
          const features = buildFeatures(
            candidate,
            positiveCandidate.term,
            verseText,
            parsed.book,
            parsed.chapter,
            parsed.verse,
          );

          samples.push({
            term,
            verseKey: key,
            label: candidateIndex === positiveIndex ? 1 : 0,
            features,
          });
        });
      }
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    featureKeys: [
      'exactTermMatch',
      'exactReferencePrior',
      'contextDefinitionOverlap',
      'referenceSupport',
      'bookReferencePrior',
      'categoryPrior',
      'queryDefinitionOverlap',
    ],
    samples,
  };

  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`Built disambiguation dataset: ${samples.length} samples`);
  console.log(`Output: ${OUT_FILE}`);
}

main();
