#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cat > "${ROOT_DIR}/scripts/build-disambiguation-dataset.mjs" <<'EOF'
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

function extractInteractionTerms(text) {
  const matches = String(text).match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  const stop = new Set(['The', 'And', 'But', 'Then', 'For', 'Now', 'That', 'With', 'From']);
  return new Set(matches.filter(m => !stop.has(m)).map(m => m.toLowerCase()));
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
  const files = ['people.json', 'places.json', 'events.json', 'topics.json', 'people-overrides.json'];
  return files.flatMap(file => {
    try {
      return readJson(join(DICT_DIR, file));
    } catch {
      return [];
    }
  });
}

function loadVerseIndex() {
  const verseMap = new Map();
  const chapterMap = new Map();
  const files = readdirSync(BIBLE_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const data = readJson(join(BIBLE_DIR, file));
    const book = String(data.bookName).toLowerCase().replace(/\s+/g, ' ').trim();
    for (const chapter of data.chapters || []) {
      const chapterKey = `${book}|${chapter.chapter}`;
      chapterMap.set(chapterKey, chapter.verses || []);
      for (const verse of chapter.verses || []) {
        const key = `${book}|${chapter.chapter}|${verse.verse}`;
        verseMap.set(key, verse.text);
      }
    }
  }

  return { verseMap, chapterMap };
}

function storyContext(chapterVerses, verseNumber, radius = 2) {
  return chapterVerses
    .filter(v => Math.abs(v.verse - verseNumber) <= radius)
    .map(v => v.text)
    .join(' ');
}

function buildFeatures(candidate, term, verseText, storyText, book, chapter, verse) {
  const contextTokens = contextWindowTokens(verseText, term);
  const defTokens = uniqueTokens(candidate.definition || '');
  const storyTokens = uniqueTokens(storyText || verseText);
  const interactions = extractInteractionTerms(`${verseText} ${storyText}`);

  return {
    exactTermMatch: String(candidate.term).toLowerCase() === String(term).toLowerCase() ? 1 : 0,
    exactReferencePrior: exactReferencePrior(candidate, book, chapter, verse),
    contextDefinitionOverlap: overlapRatio(contextTokens, defTokens),
    storyContextOverlap: overlapRatio(storyTokens, defTokens),
    interactionDefinitionOverlap: overlapRatio(interactions, defTokens),
    referenceSupport: referenceSupport(candidate),
    bookReferencePrior: bookPrior(candidate, book),
    categoryPrior: CATEGORY_PRIOR[candidate.category] ?? 0.5,
    queryDefinitionOverlap: 0,
  };
}

function main() {
  const entries = loadDictionaryEntries();
  const { verseMap, chapterMap } = loadVerseIndex();

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
        const verseText = verseMap.get(key);
        if (!verseText) continue;
        if (!includesWholeWord(verseText, positiveCandidate.term)) continue;

        const chapterKey = `${parsed.book}|${parsed.chapter}`;
        const chapterVerses = chapterMap.get(chapterKey) ?? [];
        const storyText = storyContext(chapterVerses, parsed.verse, 2);

        candidates.forEach((candidate, candidateIndex) => {
          const features = buildFeatures(
            candidate,
            positiveCandidate.term,
            verseText,
            storyText,
            parsed.book,
            parsed.chapter,
            parsed.verse,
          );

          samples.push({
            term,
            verseKey: key,
            book: parsed.book,
            chapter: parsed.chapter,
            verse: parsed.verse,
            label: candidateIndex === positiveIndex ? 1 : 0,
            features,
          });
        });
      }
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    version: 2,
    createdAt: new Date().toISOString(),
    featureKeys: [
      'exactTermMatch',
      'exactReferencePrior',
      'contextDefinitionOverlap',
      'storyContextOverlap',
      'interactionDefinitionOverlap',
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
EOF

cat > "${ROOT_DIR}/scripts/train-disambiguation-model.mjs" <<'EOF'
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATASET_FILE = join(ROOT, 'public', 'data', 'disambiguation', 'training-dataset.json');
const OUT_FILE = join(ROOT, 'public', 'data', 'disambiguation', 'model.json');

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function seededRandom(seedObj) {
  seedObj.value = (seedObj.value * 1664525 + 1013904223) % 4294967296;
  return seedObj.value / 4294967296;
}

function shuffleInPlace(arr, seed = 42) {
  const seedObj = { value: seed >>> 0 };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seedObj) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function splitTrainValidation(X, y, valRatio = 0.15) {
  const idx = X.map((_, i) => i);
  shuffleInPlace(idx, 42);

  const valCount = Math.max(1, Math.floor(idx.length * valRatio));
  const valSet = new Set(idx.slice(0, valCount));

  const XTrain = [];
  const yTrain = [];
  const XVal = [];
  const yVal = [];

  for (let i = 0; i < idx.length; i++) {
    const original = idx[i];
    if (valSet.has(original)) {
      XVal.push(X[original]);
      yVal.push(y[original]);
    } else {
      XTrain.push(X[original]);
      yTrain.push(y[original]);
    }
  }

  return { XTrain, yTrain, XVal, yVal };
}

function evaluate(X, y, w, b) {
  if (X.length === 0) return { loss: 0, accuracy: 0 };

  let correct = 0;
  let loss = 0;
  for (let i = 0; i < X.length; i++) {
    const p = sigmoid(dot(w, X[i]) + b);
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === y[i]) correct++;
    const clipped = Math.min(1 - 1e-9, Math.max(1e-9, p));
    loss += -(y[i] * Math.log(clipped) + (1 - y[i]) * Math.log(1 - clipped));
  }

  return {
    loss: loss / X.length,
    accuracy: correct / X.length,
  };
}

function trainLogisticRegression(X, y, opts = {}) {
  const epochs = opts.epochs ?? 3000;
  const lr = opts.lr ?? 0.02;
  const l2 = opts.l2 ?? 0.001;
  const patience = opts.patience ?? 40;

  const { XTrain, yTrain, XVal, yVal } = splitTrainValidation(X, y, 0.15);

  const featureCount = XTrain[0]?.length ?? 0;
  const w = Array(featureCount).fill(0);
  let b = 0;

  const positives = yTrain.filter(v => v === 1).length;
  const negatives = yTrain.length - positives;
  const posWeight = positives > 0 ? yTrain.length / (2 * positives) : 1;
  const negWeight = negatives > 0 ? yTrain.length / (2 * negatives) : 1;

  let bestValLoss = Number.POSITIVE_INFINITY;
  let bestW = [...w];
  let bestB = b;
  let stale = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = Array(featureCount).fill(0);
    let gradB = 0;

    for (let i = 0; i < XTrain.length; i++) {
      const z = dot(w, XTrain[i]) + b;
      const p = sigmoid(z);
      const err = p - yTrain[i];
      const sampleWeight = yTrain[i] === 1 ? posWeight : negWeight;

      for (let j = 0; j < featureCount; j++) {
        gradW[j] += sampleWeight * err * XTrain[i][j];
      }
      gradB += sampleWeight * err;
    }

    for (let j = 0; j < featureCount; j++) {
      const reg = l2 * w[j];
      w[j] -= lr * ((gradW[j] / XTrain.length) + reg);
    }
    b -= lr * (gradB / XTrain.length);

    const val = evaluate(XVal, yVal, w, b);
    if (val.loss < bestValLoss - 1e-6) {
      bestValLoss = val.loss;
      bestW = [...w];
      bestB = b;
      stale = 0;
    } else {
      stale++;
      if (stale >= patience) break;
    }
  }

  const trainMetrics = evaluate(XTrain, yTrain, bestW, bestB);
  const valMetrics = evaluate(XVal, yVal, bestW, bestB);

  return {
    weights: bestW,
    intercept: bestB,
    trainMetrics,
    valMetrics,
    sizes: {
      train: XTrain.length,
      validation: XVal.length,
      total: X.length,
    },
  };
}

function main() {
  const dataset = JSON.parse(readFileSync(DATASET_FILE, 'utf-8'));
  const keys = dataset.featureKeys;
  const samples = dataset.samples || [];

  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('Dataset is missing feature keys. Run disambiguation:dataset first.');
  }

  const X = [];
  const y = [];

  for (const sample of samples) {
    const vec = keys.map(k => Number(sample.features?.[k] ?? 0));
    X.push(vec);
    y.push(Number(sample.label ?? 0));
  }

  const trained = trainLogisticRegression(X, y);
  const featureWeights = {};
  keys.forEach((key, idx) => {
    featureWeights[key] = trained.weights[idx];
  });

  const model = {
    version: 'logreg-v2-contextual',
    trainedAt: new Date().toISOString(),
    featureWeights,
    intercept: trained.intercept,
    metrics: {
      samples: trained.sizes.total,
      trainSamples: trained.sizes.train,
      validationSamples: trained.sizes.validation,
      trainAccuracy: Number(trained.trainMetrics.accuracy.toFixed(4)),
      validationAccuracy: Number(trained.valMetrics.accuracy.toFixed(4)),
      trainLoss: Number(trained.trainMetrics.loss.toFixed(6)),
      validationLoss: Number(trained.valMetrics.loss.toFixed(6)),
    },
  };

  mkdirSync(join(ROOT, 'public', 'data', 'disambiguation'), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(model, null, 2));

  console.log(`Trained disambiguation model on ${trained.sizes.total} samples`);
  console.log(`Train acc/loss: ${model.metrics.trainAccuracy} / ${model.metrics.trainLoss}`);
  console.log(`Validation acc/loss: ${model.metrics.validationAccuracy} / ${model.metrics.validationLoss}`);
  console.log(`Output: ${OUT_FILE}`);
}

main();
EOF

echo "Updated scripts/build-disambiguation-dataset.mjs and scripts/train-disambiguation-model.mjs"
echo "Run next: npm run disambiguation:fit"
