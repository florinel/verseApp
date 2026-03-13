/**
 * Generates dictionary JSON data from the CSV files in public/data/csv/.
 *
 * Sources:
 *   - BibleData-Person.csv + BibleData-PersonVerse.csv + HitchcocksBibleNamesDictionary.csv → people.json
 *   - BibleData-Place.csv  + BibleData-PlaceVerse.csv → places.json
 *   - BibleData-Event.csv → events.json
 *   - NavesTopicalDictionary.csv → topics.json
 *
 * Usage: node scripts/generate-dictionary-data.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_DIR = join(__dirname, '..', 'public', 'data', 'csv');
const DICT_DIR = join(__dirname, '..', 'public', 'data', 'dictionaries');
mkdirSync(DICT_DIR, { recursive: true });

// ─── CSV Parser (handles quoted fields with commas and newlines) ───────────
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function readField() {
    if (i >= len) return '';
    if (text[i] === '"') {
      i++; // skip opening quote
      let val = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += text[i];
          i++;
        }
      }
      return val;
    } else {
      let val = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        val += text[i];
        i++;
      }
      return val;
    }
  }

  while (i < len) {
    const row = [];
    while (true) {
      row.push(readField());
      if (i < len && text[i] === ',') {
        i++; // skip comma
        continue;
      }
      // end of row
      if (i < len && text[i] === '\r') i++;
      if (i < len && text[i] === '\n') i++;
      break;
    }
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function csvToObjects(filePath) {
  const text = readFileSync(filePath, 'utf-8');
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (row[idx] || '').trim(); });
    return obj;
  });
}

// ─── Book abbreviation mapping (CSV uses 3-letter codes like GEN, EXO) ────
const ABBR_TO_BOOK = {
  GEN:'Genesis',EXO:'Exodus',LEV:'Leviticus',NUM:'Numbers',DEU:'Deuteronomy',
  JOS:'Joshua',JDG:'Judges',RUT:'Ruth','1SA':'1 Samuel','2SA':'2 Samuel',
  '1KI':'1 Kings','2KI':'2 Kings','1CH':'1 Chronicles','2CH':'2 Chronicles',
  EZR:'Ezra',NEH:'Nehemiah',EST:'Esther',JOB:'Job',PSA:'Psalms',
  PRO:'Proverbs',ECC:'Ecclesiastes',SNG:'Song of Solomon',
  ISA:'Isaiah',JER:'Jeremiah',LAM:'Lamentations',EZK:'Ezekiel',DAN:'Daniel',
  HOS:'Hosea',JOL:'Joel',AMO:'Amos',OBA:'Obadiah',JON:'Jonah',MIC:'Micah',
  NAM:'Nahum',HAB:'Habakkuk',ZEP:'Zephaniah',HAG:'Haggai',ZEC:'Zechariah',MAL:'Malachi',
  MAT:'Matthew',MRK:'Mark',LUK:'Luke',JHN:'John',ACT:'Acts',
  ROM:'Romans','1CO':'1 Corinthians','2CO':'2 Corinthians',GAL:'Galatians',
  EPH:'Ephesians',PHP:'Philippians',COL:'Colossians',
  '1TH':'1 Thessalonians','2TH':'2 Thessalonians','1TI':'1 Timothy','2TI':'2 Timothy',
  TIT:'Titus',PHM:'Philemon',HEB:'Hebrews',JAS:'James',
  '1PE':'1 Peter','2PE':'2 Peter','1JN':'1 John','2JN':'2 John','3JN':'3 John',
  JUD:'Jude',REV:'Revelation',
};

/** Convert "GEN 3:16" → "Genesis 3:16" */
function expandRef(refId) {
  if (!refId) return null;
  const m = refId.match(/^([A-Z0-9]+)\s+(\d+:\d+)$/);
  if (!m) return null;
  const book = ABBR_TO_BOOK[m[1]];
  return book ? `${book} ${m[2]}` : null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. PEOPLE
// ═══════════════════════════════════════════════════════════════════════════
console.log('Processing people…');
const personRows = csvToObjects(join(CSV_DIR, 'BibleData-Person.csv'));
const personVerseRows = csvToObjects(join(CSV_DIR, 'BibleData-PersonVerse.csv'));

// Build Hitchcock's name→meaning map
const hitchcockRows = csvToObjects(join(CSV_DIR, 'HitchcocksBibleNamesDictionary.csv'));
const nameMeanings = new Map();
for (const row of hitchcockRows) {
  const name = row.Name?.trim();
  const meaning = row.Meaning?.trim();
  if (name && meaning) nameMeanings.set(name.toLowerCase(), meaning);
}

// Collect up to 5 unique verse references per person_id
const personRefs = new Map();
for (const pv of personVerseRows) {
  const pid = pv.person_id;
  if (!pid || pid === 'NA') continue;
  const ref = expandRef(pv.reference_id);
  if (!ref) continue;
  if (!personRefs.has(pid)) personRefs.set(pid, new Set());
  const s = personRefs.get(pid);
  if (s.size < 5) s.add(ref);
}

// De-duplicate people by name (take the first / most notable instance)
const seenPersonNames = new Set();
const people = [];
for (const p of personRows) {
  const name = p.person_name?.trim();
  if (!name || seenPersonNames.has(name.toLowerCase())) continue;
  seenPersonNames.add(name.toLowerCase());

  let def = p.unique_attribute?.trim() || '';
  // Capitalise first letter
  if (def) def = def.charAt(0).toUpperCase() + def.slice(1);

  // Append Hitchcock's meaning if available
  const meaning = nameMeanings.get(name.toLowerCase());
  if (meaning) {
    def = def ? `${def}. Name meaning: ${meaning}.` : `Name meaning: ${meaning}.`;
  }
  if (!def) def = `Biblical person (${p.sex || 'unknown'}).`;

  // Add tribe/sex info
  const extras = [];
  if (p.sex) extras.push(p.sex);
  if (p.tribe) extras.push(`tribe of ${p.tribe}`);
  if (extras.length) def += ` (${extras.join(', ')})`;

  const refs = personRefs.get(p.person_id);
  people.push({
    term: name,
    category: 'person',
    definition: def,
    references: refs ? [...refs] : [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. PLACES
// ═══════════════════════════════════════════════════════════════════════════
console.log('Processing places…');
const placeRows = csvToObjects(join(CSV_DIR, 'BibleData-Place.csv'));
const placeVerseRows = csvToObjects(join(CSV_DIR, 'BibleData-PlaceVerse.csv'));

const placeRefs = new Map();
for (const pv of placeVerseRows) {
  const pid = pv.place_id;
  if (!pid || pid === 'NA') continue;
  const ref = expandRef(pv.reference_id);
  if (!ref) continue;
  if (!placeRefs.has(pid)) placeRefs.set(pid, new Set());
  const s = placeRefs.get(pid);
  if (s.size < 5) s.add(ref);
}

const seenPlaceNames = new Set();
const places = [];
for (const p of placeRows) {
  const name = p.place_name?.trim();
  if (!name || seenPlaceNames.has(name.toLowerCase())) continue;
  seenPlaceNames.add(name.toLowerCase());

  let def = p.place_notes?.trim() || '';
  if (def) def = def.charAt(0).toUpperCase() + def.slice(1);
  const parts = [];
  if (p.place_type) parts.push(p.place_type);
  if (p.modern_equivalent) parts.push(`modern: ${p.modern_equivalent}`);
  if (parts.length) def = def ? `${def} (${parts.join('; ')})` : parts.join('; ');
  if (!def) def = 'Biblical place.';

  const refs = placeRefs.get(p.place_id);
  places.push({
    term: name,
    category: 'place',
    definition: def,
    references: refs ? [...refs] : [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. EVENTS
// ═══════════════════════════════════════════════════════════════════════════
console.log('Processing events…');
const eventRows = csvToObjects(join(CSV_DIR, 'BibleData-Event.csv'));

const seenEventNames = new Set();
const events = [];
for (const e of eventRows) {
  const name = e.event_name?.trim();
  if (!name || seenEventNames.has(name.toLowerCase())) continue;
  seenEventNames.add(name.toLowerCase());

  let desc = e.event_description?.trim() || '';
  // Truncate very long descriptions
  if (desc.length > 500) desc = desc.slice(0, 497) + '…';

  const refs = [];
  if (e.event_reference_id) {
    const expanded = expandRef(e.event_reference_id);
    if (expanded) refs.push(expanded);
  }
  // Also extract inline references from the description (pattern: BOOK CH:VE)
  const inlineRefs = desc.match(/[A-Z][A-Z0-9]{1,2}\s+\d+:\d+/g) || [];
  for (const ir of inlineRefs) {
    const expanded = expandRef(ir);
    if (expanded && !refs.includes(expanded) && refs.length < 5) refs.push(expanded);
  }

  let extras = '';
  if (e.bce_year) extras += ` (~${e.bce_year} BCE)`;
  if (e.event_type && e.event_type !== 'Unique') extras += ` [${e.event_type}]`;

  events.push({
    term: name,
    category: 'event',
    definition: (desc || 'Biblical event.') + extras,
    references: refs,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. TOPICS (Nave's Topical Dictionary)
// ═══════════════════════════════════════════════════════════════════════════
console.log('Processing topics (Nave\'s Topical Dictionary)…');
const navesRows = csvToObjects(join(CSV_DIR, 'NavesTopicalDictionary.csv'));

const seenTopics = new Set();
const topics = [];
for (const row of navesRows) {
  const subject = row.subject?.trim();
  if (!subject) continue;
  const key = subject.toLowerCase();
  if (seenTopics.has(key)) continue;
  seenTopics.add(key);

  let entry = row.entry?.trim() || '';

  // Extract verse references from the entry text (patterns like "GEN 1:1" or "1CO 15:45")
  const refs = [];
  const refPattern = /\b([1-3]?[A-Z]{2,3})\s+(\d+:\d+(?:[,-]\d+)*)/g;
  let m;
  while ((m = refPattern.exec(entry)) !== null && refs.length < 5) {
    const bookAbbr = m[1];
    const verseRef = m[2].split(/[,-]/)[0]; // take first verse of a range
    const full = expandRef(`${bookAbbr} ${verseRef.includes(':') ? verseRef : verseRef}`);
    if (full && !refs.includes(full)) refs.push(full);
  }

  // Clean and truncate for definition
  let def = entry.replace(/\s+/g, ' ');
  if (def.length > 400) def = def.slice(0, 397) + '…';
  if (!def) def = `Biblical topic: ${subject}.`;

  topics.push({
    term: subject,
    category: 'topic',
    definition: def,
    references: refs,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Write output
// ═══════════════════════════════════════════════════════════════════════════
writeFileSync(join(DICT_DIR, 'people.json'), JSON.stringify(people, null, 2));
writeFileSync(join(DICT_DIR, 'places.json'), JSON.stringify(places, null, 2));
writeFileSync(join(DICT_DIR, 'events.json'), JSON.stringify(events, null, 2));
writeFileSync(join(DICT_DIR, 'topics.json'), JSON.stringify(topics, null, 2));

console.log(`\nGenerated dictionary files in ${DICT_DIR}`);
console.log(`  people.json:  ${people.length} entries`);
console.log(`  places.json:  ${places.length} entries`);
console.log(`  events.json:  ${events.length} entries`);
console.log(`  topics.json:  ${topics.length} entries`);
console.log(`  Total: ${people.length + places.length + events.length + topics.length} entries`);
