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
