/**
 * Download NASB Bible text from bolls.life API and save as local JSON files.
 * Fetches each chapter individually: GET https://bolls.life/get-text/NASB/{bookNum}/{chapter}/
 * Returns array of { verse, text } per chapter.
 *
 * Usage: node scripts/generate-bible-data.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data', 'bible', 'nasb');

const BOOKS = [
  { name: 'Genesis', chapters: 50 }, { name: 'Exodus', chapters: 40 }, { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 }, { name: 'Deuteronomy', chapters: 34 }, { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 }, { name: 'Ruth', chapters: 4 }, { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 }, { name: '1 Kings', chapters: 22 }, { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 }, { name: '2 Chronicles', chapters: 36 }, { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 }, { name: 'Esther', chapters: 10 }, { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 }, { name: 'Proverbs', chapters: 31 }, { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 }, { name: 'Isaiah', chapters: 66 }, { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 }, { name: 'Ezekiel', chapters: 48 }, { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 }, { name: 'Joel', chapters: 3 }, { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 }, { name: 'Jonah', chapters: 4 }, { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 }, { name: 'Habakkuk', chapters: 3 }, { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 }, { name: 'Zechariah', chapters: 14 }, { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 }, { name: 'Mark', chapters: 16 }, { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 }, { name: 'Acts', chapters: 28 }, { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 }, { name: '2 Corinthians', chapters: 13 }, { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 }, { name: 'Philippians', chapters: 4 }, { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 }, { name: '2 Thessalonians', chapters: 3 }, { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 }, { name: 'Titus', chapters: 3 }, { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 }, { name: 'James', chapters: 5 }, { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 }, { name: '1 John', chapters: 5 }, { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 }, { name: 'Jude', chapters: 1 }, { name: 'Revelation', chapters: 22 },
];

function bookFileName(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Fetch a single chapter from the bolls.life API.
 * Returns array of { verse: number, text: string }.
 */
async function fetchChapter(bookNum, chapter) {
  const url = `https://bolls.life/get-text/NASB/${bookNum}/${chapter}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  // API returns [{pk, verse, chapter, book, text}, ...] — we only need verse + text
  return data.map(v => ({
    verse: v.verse,
    text: (v.text || '').replace(/<[^>]*>/g, '').trim(),
  }));
}

async function main() {
  console.log('Downloading NASB Bible from bolls.life API...\n');
  mkdirSync(OUT_DIR, { recursive: true });

  let totalVerses = 0;
  const totalChapters = BOOKS.reduce((sum, b) => sum + b.chapters, 0);
  let completedChapters = 0;

  for (let bookIdx = 0; bookIdx < BOOKS.length; bookIdx++) {
    const book = BOOKS[bookIdx];
    const bookNum = bookIdx + 1;
    const chapters = [];

    process.stdout.write(`[${bookNum}/66] ${book.name} (${book.chapters} ch) `);

    for (let ch = 1; ch <= book.chapters; ch++) {
      try {
        const verses = await fetchChapter(bookNum, ch);
        totalVerses += verses.length;
        chapters.push({ chapter: ch, verses });
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n  ERROR on ${book.name} ch${ch}: ${err.message}`);
        // Retry once after a pause
        await sleep(2000);
        try {
          const verses = await fetchChapter(bookNum, ch);
          totalVerses += verses.length;
          chapters.push({ chapter: ch, verses });
          process.stdout.write('.');
        } catch (err2) {
          console.error(`  RETRY FAILED: ${err2.message}`);
          chapters.push({ chapter: ch, verses: [] });
          process.stdout.write('x');
        }
      }
      completedChapters++;
      // Small delay to be polite to the API
      if (ch % 5 === 0) await sleep(100);
    }

    const json = { bookName: book.name, chapters };
    const filePath = join(OUT_DIR, bookFileName(book.name) + '.json');
    writeFileSync(filePath, JSON.stringify(json));
    console.log(` done (${completedChapters}/${totalChapters})`);
  }

  console.log(`\nComplete! ${totalVerses} verses across 66 books.`);
  console.log(`Files saved to public/data/bible/nasb/`);
}

main().catch(err => { console.error(err); process.exit(1); });
