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

function trainLogisticRegression(X, y, opts = {}) {
  const epochs = opts.epochs ?? 500;
  const lr = opts.lr ?? 0.05;
  const l2 = opts.l2 ?? 0.001;

  const featureCount = X[0]?.length ?? 0;
  const w = Array(featureCount).fill(0);
  let b = 0;

  const n = X.length;
  if (n === 0) {
    return { weights: w, intercept: b, loss: 0, accuracy: 0 };
  }

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = Array(featureCount).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const z = dot(w, X[i]) + b;
      const p = sigmoid(z);
      const err = p - y[i];
      for (let j = 0; j < featureCount; j++) {
        gradW[j] += err * X[i][j];
      }
      gradB += err;
    }

    for (let j = 0; j < featureCount; j++) {
      const reg = l2 * w[j];
      w[j] -= lr * ((gradW[j] / n) + reg);
    }
    b -= lr * (gradB / n);
  }

  let correct = 0;
  let loss = 0;
  for (let i = 0; i < n; i++) {
    const p = sigmoid(dot(w, X[i]) + b);
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === y[i]) correct++;
    const clipped = Math.min(1 - 1e-9, Math.max(1e-9, p));
    loss += -(y[i] * Math.log(clipped) + (1 - y[i]) * Math.log(1 - clipped));
  }

  return {
    weights: w,
    intercept: b,
    loss: loss / n,
    accuracy: correct / n,
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
    version: 'logreg-v1',
    trainedAt: new Date().toISOString(),
    featureWeights,
    intercept: trained.intercept,
    metrics: {
      samples: samples.length,
      accuracy: Number(trained.accuracy.toFixed(4)),
      loss: Number(trained.loss.toFixed(6)),
    },
  };

  mkdirSync(join(ROOT, 'public', 'data', 'disambiguation'), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(model, null, 2));

  console.log(`Trained disambiguation model on ${samples.length} samples`);
  console.log(`Accuracy: ${model.metrics.accuracy}, Loss: ${model.metrics.loss}`);
  console.log(`Output: ${OUT_FILE}`);
}

main();
