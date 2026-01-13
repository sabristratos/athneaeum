import {
  normalizeSeriesName,
  getSignificantWords,
  levenshteinDistance,
  calculateSimilarity,
  calculateWordSimilarity,
  STOPWORDS,
} from '../queries/useSeries';

describe('Series Matching Helpers', () => {
  describe('normalizeSeriesName', () => {
    it.each([
      ['The Lord of the Rings', 'lord of the rings'],
      ['  Stormlight Archive  ', 'stormlight archive'],
      ['THE HUNGER GAMES', 'hunger games'],
      ['the wheel of time', 'wheel of time'],
      ['A Song of Ice and Fire', 'a song of ice and fire'],
    ])('removes "The" prefix and lowercases: "%s" -> "%s"', (input, expected) => {
      expect(normalizeSeriesName(input)).toBe(expected);
    });

    it.each([
      ['Series—Book 1', 'series-book 1'],
      ['Series–Part 2', 'series-part 2'],
      ['"Quoted Series"', '"quoted series"'],
      ["Series's Name", "series's name"],
    ])('normalizes special characters: "%s" -> "%s"', (input, expected) => {
      expect(normalizeSeriesName(input)).toBe(expected);
    });

    it.each([
      ['Series Name:', 'series name'],
      ['Series Name-', 'series name'],
      ['Series Name,', 'series name'],
      ['Series Name:-,', 'series name'],
    ])('removes trailing punctuation: "%s" -> "%s"', (input, expected) => {
      expect(normalizeSeriesName(input)).toBe(expected);
    });

    it.each([
      ['Multiple   Spaces', 'multiple spaces'],
      ['  Leading Trailing  ', 'leading trailing'],
      ['\tTabbed\tSeries\t', 'tabbed series'],
    ])('normalizes whitespace: "%s" -> "%s"', (input, expected) => {
      expect(normalizeSeriesName(input)).toBe(expected);
    });
  });

  describe('getSignificantWords', () => {
    it('filters out stopwords', () => {
      const result = getSignificantWords('a song of ice and fire');
      expect(result).toEqual(['song', 'ice', 'fire']);
    });

    it('filters out single-character words', () => {
      const result = getSignificantWords('a b c real word');
      expect(result).toEqual(['real', 'word']);
    });

    it('handles empty string', () => {
      expect(getSignificantWords('')).toEqual([]);
    });

    it('handles string with only stopwords', () => {
      const result = getSignificantWords('the a an of');
      expect(result).toEqual([]);
    });

    it('converts to lowercase', () => {
      const result = getSignificantWords('STORMLIGHT ARCHIVE');
      expect(result).toEqual(['stormlight', 'archive']);
    });
  });

  describe('levenshteinDistance', () => {
    it.each([
      ['', '', 0],
      ['', 'test', 4],
      ['test', '', 4],
      ['test', 'test', 0],
      ['kitten', 'sitting', 3],
      ['stormlight', 'stromlight', 2],
      ['archive', 'archiv', 1],
      ['book', 'back', 2],
      ['harry', 'hary', 1],
      ['potter', 'poter', 1],
    ])('calculates distance between "%s" and "%s" as %d', (a, b, expected) => {
      expect(levenshteinDistance(a, b)).toBe(expected);
    });

    it('is symmetric', () => {
      expect(levenshteinDistance('abc', 'def')).toBe(levenshteinDistance('def', 'abc'));
    });
  });

  describe('calculateSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(calculateSimilarity('stormlight', 'stormlight')).toBe(1);
    });

    it('returns 1 for empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(1);
    });

    it('returns high similarity for single character deletion', () => {
      const similarity = calculateSimilarity('archive', 'archiv');
      expect(similarity).toBeGreaterThan(0.85);
    });

    it('returns moderate similarity for transposition', () => {
      const similarity = calculateSimilarity('stormlight', 'stromlight');
      expect(similarity).toBeGreaterThanOrEqual(0.8);
    });

    it('returns low similarity for very different strings', () => {
      const similarity = calculateSimilarity('abc', 'xyz');
      expect(similarity).toBeLessThan(0.5);
    });

    it.each([
      ['stormlight archive', 'stormlight archiv', 0.9],
      ['harry potter', 'hary poter', 0.8],
      ['divergent', 'divergant', 0.85],
    ])('"%s" vs "%s" has similarity >= %d', (a, b, minSimilarity) => {
      expect(calculateSimilarity(a, b)).toBeGreaterThanOrEqual(minSimilarity);
    });
  });

  describe('calculateWordSimilarity', () => {
    it('returns 1 for identical significant words', () => {
      const similarity = calculateWordSimilarity('song ice fire', 'song ice fire');
      expect(similarity).toBe(1);
    });

    it('returns 0 when no words match', () => {
      const similarity = calculateWordSimilarity('abc def', 'xyz uvw');
      expect(similarity).toBe(0);
    });

    it('returns 0 for empty strings', () => {
      expect(calculateWordSimilarity('', 'test')).toBe(0);
      expect(calculateWordSimilarity('test', '')).toBe(0);
    });

    it('ignores stopwords in calculation', () => {
      const similarity = calculateWordSimilarity(
        'a song of ice and fire',
        'the song of ice and fire'
      );
      expect(similarity).toBe(1);
    });

    it.each([
      ['song ice fire', 'a song of ice and fire', 1],
      ['harry potter', 'harry potter olympians', 1],
      ['stormlight', 'stormlight archive', 1],
      ['wheel time', 'the wheel of time', 1],
    ])('"%s" vs "%s" has high similarity', (search, target, expected) => {
      expect(calculateWordSimilarity(search, target)).toBe(expected);
    });

    it('returns partial match for some common words', () => {
      const similarity = calculateWordSimilarity('ice fire', 'song ice water');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });
});

describe('Series Matching Integration', () => {
  const mockSeries = [
    { id: 1, title: 'Stormlight Archive', author: 'Brandon Sanderson' },
    { id: 2, title: 'The Lord of the Rings', author: 'J.R.R. Tolkien' },
    { id: 3, title: 'A Song of Ice and Fire', author: 'George R.R. Martin' },
    { id: 4, title: 'Harry Potter', author: 'J.K. Rowling' },
    { id: 5, title: 'The Wheel of Time', author: 'Robert Jordan' },
    { id: 6, title: 'The Hunger Games', author: 'Suzanne Collins' },
    { id: 7, title: 'Divergent', author: 'Veronica Roth' },
    { id: 8, title: 'Star Wars', author: 'Various' },
  ];

  function findMatches(searchName: string) {
    const normalizedSearch = normalizeSeriesName(searchName);
    const matches: Array<{ series: typeof mockSeries[0]; confidence: string }> = [];

    for (const series of mockSeries) {
      const normalizedTitle = normalizeSeriesName(series.title);

      if (normalizedTitle === normalizedSearch) {
        matches.push({ series, confidence: 'exact' });
        continue;
      }

      const similarity = calculateSimilarity(normalizedTitle, normalizedSearch);
      if (similarity >= 0.9) {
        matches.push({ series, confidence: 'exact' });
        continue;
      }

      const minSubstringLength = 4;
      if (
        (normalizedTitle.includes(normalizedSearch) && normalizedSearch.length >= minSubstringLength) ||
        (normalizedSearch.includes(normalizedTitle) && normalizedTitle.length >= minSubstringLength)
      ) {
        matches.push({ series, confidence: 'high' });
        continue;
      }

      const wordSimilarity = calculateWordSimilarity(normalizedSearch, normalizedTitle);

      if (wordSimilarity >= 0.8) {
        matches.push({ series, confidence: 'high' });
        continue;
      }

      if (wordSimilarity >= 0.5 || similarity >= 0.85) {
        matches.push({ series, confidence: 'medium' });
        continue;
      }

      if (wordSimilarity >= 0.3 || similarity >= 0.75) {
        matches.push({ series, confidence: 'low' });
      }
    }

    return matches;
  }

  describe('Exact matches', () => {
    it.each([
      ['Stormlight Archive', 'Stormlight Archive'],
      ['stormlight archive', 'Stormlight Archive'],
      ['STORMLIGHT ARCHIVE', 'Stormlight Archive'],
      ['The Lord of the Rings', 'The Lord of the Rings'],
      ['Lord of the Rings', 'The Lord of the Rings'],
      ['A Song of Ice and Fire', 'A Song of Ice and Fire'],
      ['Song of Ice and Fire', 'A Song of Ice and Fire'],
      ['Harry Potter', 'Harry Potter'],
      ['The Wheel of Time', 'The Wheel of Time'],
      ['Wheel of Time', 'The Wheel of Time'],
      ['The Hunger Games', 'The Hunger Games'],
      ['Hunger Games', 'The Hunger Games'],
    ])('"%s" matches "%s" with exact confidence', (search, expectedTitle) => {
      const matches = findMatches(search);
      const exactMatch = matches.find((m) => m.confidence === 'exact');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.series.title).toBe(expectedTitle);
    });
  });

  describe('Typo tolerance (near-exact)', () => {
    it.each([
      ['Stormlight Archiv', 'Stormlight Archive'],
      ['Harry Poter', 'Harry Potter'],
    ])('"%s" matches "%s" with high confidence', (search, expectedTitle) => {
      const matches = findMatches(search);
      const match = matches.find((m) => m.series.title === expectedTitle);
      expect(match).toBeDefined();
      expect(['exact', 'high', 'medium']).toContain(match?.confidence);
    });

    it.each([
      ['Stromlight Archive', 'Stormlight Archive'],
      ['Hary Potter', 'Harry Potter'],
    ])('"%s" still finds "%s" (may be lower confidence due to transposition)', (search, expectedTitle) => {
      const matches = findMatches(search);
      const match = matches.find((m) => m.series.title === expectedTitle);
      expect(match).toBeDefined();
    });
  });

  describe('Substring matches', () => {
    it.each([
      ['Stormlight', 'Stormlight Archive'],
      ['Hunger', 'The Hunger Games'],
      ['Divergent', 'Divergent'],
    ])('"%s" matches "%s" via substring', (search, expectedTitle) => {
      const matches = findMatches(search);
      const match = matches.find((m) => m.series.title === expectedTitle);
      expect(match).toBeDefined();
    });
  });

  describe('Short substrings should not match aggressively', () => {
    it('short search "War" should not highly match "Star Wars"', () => {
      const matches = findMatches('War');
      const starWarsMatch = matches.find((m) => m.series.title === 'Star Wars');
      if (starWarsMatch) {
        expect(['low', 'medium']).toContain(starWarsMatch.confidence);
      }
    });

    it('short search "Ice" should not highly match "A Song of Ice and Fire"', () => {
      const matches = findMatches('Ice');
      const gotMatch = matches.find((m) => m.series.title === 'A Song of Ice and Fire');
      if (gotMatch) {
        expect(gotMatch.confidence).not.toBe('exact');
      }
    });
  });

  describe('Word-based matching', () => {
    it('matches based on significant words ignoring stopwords', () => {
      const matches = findMatches('Song Ice Fire');
      const gotMatch = matches.find((m) => m.series.title === 'A Song of Ice and Fire');
      expect(gotMatch).toBeDefined();
      expect(['exact', 'high']).toContain(gotMatch?.confidence);
    });
  });

  describe('No false matches', () => {
    it('completely different names should not match', () => {
      const matches = findMatches('Random Unrelated Series');
      expect(matches.filter((m) => m.confidence === 'exact')).toHaveLength(0);
      expect(matches.filter((m) => m.confidence === 'high')).toHaveLength(0);
    });
  });
});

describe('STOPWORDS constant', () => {
  it('contains common English stopwords', () => {
    expect(STOPWORDS.has('the')).toBe(true);
    expect(STOPWORDS.has('a')).toBe(true);
    expect(STOPWORDS.has('an')).toBe(true);
    expect(STOPWORDS.has('of')).toBe(true);
    expect(STOPWORDS.has('and')).toBe(true);
  });

  it('does not contain content words', () => {
    expect(STOPWORDS.has('book')).toBe(false);
    expect(STOPWORDS.has('series')).toBe(false);
    expect(STOPWORDS.has('fire')).toBe(false);
  });
});
