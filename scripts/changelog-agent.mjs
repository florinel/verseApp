import { promises as fs } from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const changelogPath = path.join(repoRoot, 'changelog.md');
const statePath = path.join(repoRoot, '.git', 'changelog-agent-state.json');
const pidPath = path.join(repoRoot, '.git', 'changelog-agent.pid');

const DEFAULT_INTERVAL_MS = 1000;
const IGNORED_TOP_LEVEL = new Set(['.git', 'node_modules', 'dist']);
const IGNORED_EXACT = new Set(['changelog.md']);
const TEMP_FILE_SUFFIXES = ['.swp', '.tmp', '.temp', '.bak', '~'];
const execFileAsync = promisify(execFile);

function normalizePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function shouldIgnore(relativePath) {
  const normalized = normalizePath(relativePath);
  if (!normalized) return true;
  if (IGNORED_EXACT.has(normalized)) return true;

  const [topLevel] = normalized.split('/');
  if (IGNORED_TOP_LEVEL.has(topLevel)) return true;

  const baseName = path.posix.basename(normalized);
  if (baseName.startsWith('.#')) return true;
  if (TEMP_FILE_SUFFIXES.some(suffix => baseName.endsWith(suffix))) return true;

  return false;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readSnapshot() {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.files ?? {};
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot) {
  await fs.writeFile(statePath, JSON.stringify({ files: snapshot }, null, 2));
}

async function ensureChangelogFile() {
  if (await pathExists(changelogPath)) return;

  const initialContent = [
    '# Changelog',
    '',
    'This file is maintained automatically by `scripts/changelog-agent.mjs`.',
    'It records detected file additions, changes, and removals inside this repository.',
    '',
  ].join('\n');

  await fs.writeFile(changelogPath, initialContent);
}

async function scanDirectory(currentDir, snapshot) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = normalizePath(path.relative(repoRoot, fullPath));

    if (shouldIgnore(relativePath)) continue;

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, snapshot);
      continue;
    }

    if (!entry.isFile()) continue;

    const stats = await fs.stat(fullPath);
    snapshot[relativePath] = {
      mtimeMs: Math.trunc(stats.mtimeMs),
      size: stats.size,
    };
  }
}

async function createSnapshot() {
  const snapshot = {};
  await scanDirectory(repoRoot, snapshot);
  return snapshot;
}

function describeFileRole(filePath) {
  const normalized = normalizePath(filePath);
  const extension = path.posix.extname(normalized);
  const baseName = path.posix.basename(normalized);

  if (normalized === 'package.json') return 'package manifest';
  if (normalized === 'package-lock.json') return 'package lockfile';
  if (normalized === 'README.md') return 'project README';
  if (normalized === 'changelog.md') return 'project changelog';
  if (normalized === 'tsconfig.json') return 'TypeScript configuration';
  if (normalized === 'vite.config.ts') return 'Vite configuration';
  if (normalized === 'vitest.config.ts') return 'Vitest configuration';
  if (normalized.startsWith('.github/agents/')) return 'Copilot custom agent definition';
  if (normalized.startsWith('.github/')) return 'GitHub configuration file';
  if (normalized.startsWith('scripts/')) return 'automation script';
  if (normalized.startsWith('public/data/bible/')) return 'Bible data file';
  if (normalized.startsWith('public/data/dictionaries/')) return 'dictionary data file';
  if (normalized.startsWith('src/components/') && normalized.endsWith('.test.tsx')) return 'React component test';
  if (normalized.startsWith('src/components/')) return 'React component';
  if (normalized.startsWith('src/context/') && normalized.endsWith('.test.tsx')) return 'context test';
  if (normalized.startsWith('src/context/')) return 'context provider';
  if (normalized.startsWith('src/hooks/') && normalized.endsWith('.test.ts')) return 'hook test';
  if (normalized.startsWith('src/hooks/') && normalized.endsWith('.test.tsx')) return 'hook test';
  if (normalized.startsWith('src/hooks/')) return 'custom hook';
  if (normalized.startsWith('src/test/')) return 'test utility';
  if (normalized.startsWith('src/types/')) return 'shared type definition';
  if (normalized.startsWith('src/') && extension === '.css') return 'application stylesheet';
  if (normalized.startsWith('src/') && ['.ts', '.tsx'].includes(extension)) return 'application source file';
  if (extension === '.md') return 'documentation file';
  if (extension === '.txt') return 'text file';
  if (extension === '.json') return 'JSON data/config file';
  if (extension === '.ts' || extension === '.tsx') return 'TypeScript source file';
  if (extension === '.mjs' || extension === '.js') return 'JavaScript script';
  if (!extension && baseName) return 'repository file';

  return extension ? `${extension.slice(1)} file` : 'repository file';
}

function describeArea(filePath) {
  const normalized = normalizePath(filePath);

  if (normalized.startsWith('src/components/')) return 'UI layer';
  if (normalized.startsWith('src/context/')) return 'state management';
  if (normalized.startsWith('src/hooks/')) return 'data/loading logic';
  if (normalized.startsWith('src/test/')) return 'test infrastructure';
  if (normalized.startsWith('src/types/')) return 'shared typing';
  if (normalized.startsWith('public/data/')) return 'static content';
  if (normalized.startsWith('scripts/')) return 'project automation';
  if (normalized.startsWith('.github/')) return 'Copilot/GitHub tooling';

  return 'project root';
}

function buildEventSummary(event) {
  const role = describeFileRole(event.filePath);
  const area = describeArea(event.filePath);
  const verb =
    event.type === 'added'
      ? 'Added'
      : event.type === 'removed'
        ? 'Removed'
        : 'Updated';

  return `${verb} ${role} in ${area.toLowerCase()}`;
}

async function getLastCommitMessage(filePath) {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['--no-pager', 'log', '-1', '--pretty=%s', '--', filePath],
      { cwd: repoRoot },
    );
    const message = stdout.trim();
    return message || null;
  } catch {
    return null;
  }
}

async function enrichEvents(events) {
  return Promise.all(
    events.map(async event => ({
      ...event,
      summary: buildEventSummary(event),
      lastCommitMessage: await getLastCommitMessage(event.filePath),
    })),
  );
}

function diffSnapshots(previous, next) {
  const events = [];
  const previousPaths = new Set(Object.keys(previous));
  const nextPaths = new Set(Object.keys(next));

  for (const filePath of [...nextPaths].sort()) {
    if (!previousPaths.has(filePath)) {
      events.push({ type: 'added', filePath });
      continue;
    }

    const before = previous[filePath];
    const after = next[filePath];
    if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) {
      events.push({ type: 'changed', filePath });
    }
  }

  for (const filePath of [...previousPaths].sort()) {
    if (!nextPaths.has(filePath)) {
      events.push({ type: 'removed', filePath });
    }
  }

  return events;
}

function timestampLabel(date = new Date()) {
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function groupEvents(events) {
  return {
    added: events.filter(event => event.type === 'added'),
    changed: events.filter(event => event.type === 'changed'),
    removed: events.filter(event => event.type === 'removed'),
  };
}

async function appendEvents(events) {
  if (events.length === 0) return;

  await ensureChangelogFile();

  const enrichedEvents = await enrichEvents(events);
  const grouped = groupEvents(enrichedEvents);
  const lines = [`## ${timestampLabel()}`, ''];

  if (grouped.added.length > 0) {
    lines.push('### Added');
    lines.push(
      ...grouped.added.flatMap(event => [
        `- \`${event.filePath}\` — ${event.summary}`,
        ...(event.lastCommitMessage ? [`  - Last commit touching this path: ${event.lastCommitMessage}`] : []),
      ]),
    );
    lines.push('');
  }

  if (grouped.changed.length > 0) {
    lines.push('### Changed');
    lines.push(
      ...grouped.changed.flatMap(event => [
        `- \`${event.filePath}\` — ${event.summary}`,
        ...(event.lastCommitMessage ? [`  - Last commit touching this path: ${event.lastCommitMessage}`] : []),
      ]),
    );
    lines.push('');
  }

  if (grouped.removed.length > 0) {
    lines.push('### Removed');
    lines.push(
      ...grouped.removed.flatMap(event => [
        `- \`${event.filePath}\` — ${event.summary}`,
        ...(event.lastCommitMessage ? [`  - Last commit touching this path: ${event.lastCommitMessage}`] : []),
      ]),
    );
    lines.push('');
  }

  await fs.appendFile(changelogPath, `${lines.join('\n')}\n`);
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPid() {
  try {
    const raw = await fs.readFile(pidPath, 'utf8');
    const pid = Number.parseInt(raw.trim(), 10);
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

async function writePid(pid) {
  await fs.writeFile(pidPath, `${pid}\n`);
}

async function removeOwnPidFile() {
  const activePid = await readPid();
  if (activePid === process.pid) {
    await fs.rm(pidPath, { force: true });
  }
}

async function ensureWatchLock() {
  const activePid = await readPid();
  if (activePid && activePid !== process.pid && isProcessRunning(activePid)) {
    throw new Error(`changelog agent already running with pid ${activePid}`);
  }

  await writePid(process.pid);
}

async function syncOnce() {
  await ensureChangelogFile();

  const previous = await readSnapshot();
  const next = await createSnapshot();

  if (!previous) {
    await writeSnapshot(next);
    return { initialized: true, events: [] };
  }

  const events = diffSnapshots(previous, next);
  if (events.length > 0) {
    await appendEvents(events);
    await writeSnapshot(next);
  }

  return { initialized: false, events };
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function watch(intervalMs) {
  await ensureWatchLock();

  const cleanup = async () => {
    await removeOwnPidFile();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    void removeOwnPidFile();
  });

  const firstRun = await syncOnce();
  if (firstRun.initialized) {
    console.log('changelog agent initialized baseline snapshot');
  } else if (firstRun.events.length > 0) {
    console.log(`changelog agent recorded ${firstRun.events.length} event(s)`);
  }

  console.log(`watching ${repoRoot} every ${intervalMs}ms`);

  while (true) {
    await sleep(intervalMs);
    const result = await syncOnce();
    if (result.events.length > 0) {
      console.log(`recorded ${result.events.length} event(s) at ${timestampLabel()}`);
    }
  }
}

async function status() {
  const activePid = await readPid();
  if (activePid && isProcessRunning(activePid)) {
    console.log(`changelog agent is running (pid ${activePid})`);
    return;
  }

  if (activePid) {
    await fs.rm(pidPath, { force: true });
  }
  console.log('changelog agent is not running');
}

async function stop() {
  const activePid = await readPid();
  if (!activePid || !isProcessRunning(activePid)) {
    await fs.rm(pidPath, { force: true });
    console.log('changelog agent is not running');
    return;
  }

  process.kill(activePid, 'SIGTERM');
  console.log(`sent SIGTERM to changelog agent pid ${activePid}`);
}

async function main() {
  const command = process.argv[2] ?? 'watch';
  const intervalArg = process.argv[3];
  const intervalMs = intervalArg ? Number.parseInt(intervalArg, 10) : DEFAULT_INTERVAL_MS;

  try {
    if (command === 'watch') {
      await watch(Number.isFinite(intervalMs) ? intervalMs : DEFAULT_INTERVAL_MS);
      return;
    }

    if (command === 'once') {
      const result = await syncOnce();
      if (result.initialized) {
        console.log('initialized changelog baseline snapshot');
      } else {
        console.log(`recorded ${result.events.length} event(s)`);
      }
      return;
    }

    if (command === 'status') {
      await status();
      return;
    }

    if (command === 'stop') {
      await stop();
      return;
    }

    console.error(`unknown command: ${command}`);
    process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
