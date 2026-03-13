import { BIBLE_BOOKS, bookFileName } from './bibleBooks';

describe('BIBLE_BOOKS', () => {
  it('contains 66 books', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
  });

  it('has 39 Old Testament books', () => {
    const ot = BIBLE_BOOKS.filter(b => b.testament === 'OT');
    expect(ot).toHaveLength(39);
  });

  it('has 27 New Testament books', () => {
    const nt = BIBLE_BOOKS.filter(b => b.testament === 'NT');
    expect(nt).toHaveLength(27);
  });

  it('starts with Genesis and ends with Revelation', () => {
    expect(BIBLE_BOOKS[0].name).toBe('Genesis');
    expect(BIBLE_BOOKS[BIBLE_BOOKS.length - 1].name).toBe('Revelation');
  });

  it('every book has a non-empty name, abbreviation, and at least 1 chapter', () => {
    for (const book of BIBLE_BOOKS) {
      expect(book.name.length).toBeGreaterThan(0);
      expect(book.abbr.length).toBeGreaterThan(0);
      expect(book.chapters).toBeGreaterThanOrEqual(1);
    }
  });

  it('every book has a valid testament', () => {
    for (const book of BIBLE_BOOKS) {
      expect(['OT', 'NT']).toContain(book.testament);
    }
  });

  it('has unique book names', () => {
    const names = BIBLE_BOOKS.map(b => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has unique abbreviations', () => {
    const abbrs = BIBLE_BOOKS.map(b => b.abbr);
    expect(new Set(abbrs).size).toBe(abbrs.length);
  });

  it('Psalms has 150 chapters', () => {
    const psalms = BIBLE_BOOKS.find(b => b.name === 'Psalms');
    expect(psalms?.chapters).toBe(150);
  });

  it('Genesis has 50 chapters', () => {
    const genesis = BIBLE_BOOKS.find(b => b.name === 'Genesis');
    expect(genesis?.chapters).toBe(50);
  });
});

describe('bookFileName', () => {
  it('converts simple book names to lowercase', () => {
    expect(bookFileName('Genesis')).toBe('genesis');
    expect(bookFileName('Revelation')).toBe('revelation');
  });

  it('converts spaces to hyphens', () => {
    expect(bookFileName('Song of Solomon')).toBe('song-of-solomon');
  });

  it('handles numbered books', () => {
    expect(bookFileName('1 Samuel')).toBe('1-samuel');
    expect(bookFileName('2 Chronicles')).toBe('2-chronicles');
    expect(bookFileName('1 Corinthians')).toBe('1-corinthians');
    expect(bookFileName('3 John')).toBe('3-john');
  });
});
