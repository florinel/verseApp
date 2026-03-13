/**
 * Script to generate Bible JSON data files for the app.
 * Downloads public domain ASV and KJV Bible text from openbible-data
 * and structures them as per-book JSON files.
 * 
 * Usage: node scripts/generate-bible-data.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data', 'bible');

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

function fetch(url) {
  return new Promise((resolve, reject) => {
    const request = (u) => {
      https.get(u, { headers: { 'User-Agent': 'verseapp-data-gen/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

/**
 * Parse tab-separated Bible text (format: BookNum\tChapter\tVerse\tText)
 * This is the format used by many public domain Bible data sources.
 */
function parseTSV(tsv, nameMap) {
  const books = {};
  const lines = tsv.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 4) continue;
    const bookNum = parseInt(parts[0], 10);
    const chapter = parseInt(parts[1], 10);
    const verse = parseInt(parts[2], 10);
    const text = parts.slice(3).join('\t').trim();
    if (isNaN(bookNum) || isNaN(chapter) || isNaN(verse) || !text) continue;
    const bookName = nameMap[bookNum];
    if (!bookName) continue;
    if (!books[bookName]) books[bookName] = {};
    if (!books[bookName][chapter]) books[bookName][chapter] = [];
    books[bookName][chapter].push({ verse, text });
  }
  return books;
}

function buildNameMap() {
  const map = {};
  BOOKS.forEach((b, i) => { map[i + 1] = b.name; });
  return map;
}

function writeBookFiles(translation, parsedBooks) {
  const dir = join(DATA_DIR, translation);
  mkdirSync(dir, { recursive: true });
  
  let count = 0;
  for (const book of BOOKS) {
    const bookData = parsedBooks[book.name];
    if (!bookData) {
      console.warn(`  Warning: no data for ${book.name} in ${translation}`);
      continue;
    }
    const chapters = [];
    for (let c = 1; c <= book.chapters; c++) {
      const verses = bookData[c] || [];
      verses.sort((a, b) => a.verse - b.verse);
      chapters.push({ chapter: c, verses });
    }
    const json = { bookName: book.name, chapters };
    const fileName = bookFileName(book.name) + '.json';
    writeFileSync(join(dir, fileName), JSON.stringify(json));
    count++;
  }
  console.log(`  Wrote ${count} book files for ${translation}`);
}

// Fallback: generate sample data if download fails
function generateSampleData(translation) {
  const dir = join(DATA_DIR, translation);
  mkdirSync(dir, { recursive: true });

  // Only generate a few sample books with real-looking placeholder text
  const sampleVerses = {
    'Genesis': {
      1: [
        'In the beginning God created the heavens and the earth.',
        'And the earth was waste and void; and darkness was upon the face of the deep: and the Spirit of God moved upon the face of the waters.',
        'And God said, Let there be light: and there was light.',
        'And God saw the light, that it was good: and God divided the light from the darkness.',
        'And God called the light Day, and the darkness he called Night. And there was evening and there was morning, one day.',
      ],
    },
  };

  for (const book of BOOKS) {
    const chapters = [];
    for (let c = 1; c <= book.chapters; c++) {
      const verseTexts = sampleVerses[book.name]?.[c];
      const verses = verseTexts
        ? verseTexts.map((text, i) => ({ verse: i + 1, text }))
        : [{ verse: 1, text: `[${book.name} ${c}:1 — ${translation.toUpperCase()} text]` }];
      chapters.push({ chapter: c, verses });
    }
    const json = { bookName: book.name, chapters };
    const fileName = bookFileName(book.name) + '.json';
    writeFileSync(join(dir, fileName), JSON.stringify(json));
  }
  console.log(`  Wrote ${BOOKS.length} sample book files for ${translation}`);
}

// URLs for public domain Bible data in TSV format
// These are from commonly available repositories
const SOURCES = {
  asv: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/tsv/t_asv.tsv',
  kjv: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/tsv/t_kjv.tsv',
};

async function main() {
  console.log('Generating Bible data files...\n');
  const nameMap = buildNameMap();

  for (const [translation, url] of Object.entries(SOURCES)) {
    console.log(`Processing ${translation.toUpperCase()}...`);
    try {
      console.log(`  Downloading from ${url}`);
      const tsv = await fetch(url);
      console.log(`  Downloaded ${(tsv.length / 1024).toFixed(0)} KB`);
      const parsed = parseTSV(tsv, nameMap);
      writeBookFiles(translation, parsed);
    } catch (err) {
      console.warn(`  Download failed: ${err.message}`);
      console.log('  Generating sample data as fallback...');
      generateSampleData(translation);
    }
  }

  console.log('\nDone! Bible data files are in public/data/bible/');
}

main().catch(console.error);
