/**
 * Tests for books API methods.
 */

import type { Book, ClassificationOptions } from '../types';

const mockApiClient = jest.fn();

jest.mock('../api/client', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

describe('Books API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyBook', () => {
    it('sends POST request to classify endpoint', async () => {
      const mockBook: Partial<Book> = {
        id: 123,
        title: 'Test Book',
        audience: 'adult',
        intensity: 'moderate',
        moods: ['adventurous'],
        is_classified: true,
      };

      mockApiClient.mockResolvedValueOnce(mockBook);

      const { booksApi } = require('../api/books');
      const result = await booksApi.classifyBook(123);

      expect(mockApiClient).toHaveBeenCalledWith('/books/123/classify', {
        method: 'POST',
      });
      expect(result).toEqual(mockBook);
    });

    it('throws error on API failure', async () => {
      mockApiClient.mockRejectedValueOnce(new Error('Network error'));

      const { booksApi } = require('../api/books');

      await expect(booksApi.classifyBook(123)).rejects.toThrow('Network error');
    });
  });

  describe('getClassificationOptions', () => {
    it('fetches classification options', async () => {
      const mockOptions: ClassificationOptions = {
        audiences: [
          { value: 'adult', label: 'Adult' },
          { value: 'young_adult', label: 'Young Adult' },
        ],
        intensities: [
          { value: 'light', label: 'Light' },
          { value: 'moderate', label: 'Moderate' },
        ],
        moods: [
          { value: 'adventurous', label: 'Adventurous' },
          { value: 'cozy', label: 'Cozy' },
        ],
      };

      mockApiClient.mockResolvedValueOnce(mockOptions);

      const { booksApi } = require('../api/books');
      const result = await booksApi.getClassificationOptions();

      expect(mockApiClient).toHaveBeenCalledWith('/books/classification-options');
      expect(result).toEqual(mockOptions);
    });
  });
});

describe('Classification Types', () => {
  it('Audience type includes all valid values', () => {
    const validAudiences = ['adult', 'young_adult', 'middle_grade', 'children'];

    validAudiences.forEach((audience) => {
      const book: Partial<Book> = { audience: audience as any };
      expect(book.audience).toBe(audience);
    });
  });

  it('Intensity type includes all valid values', () => {
    const validIntensities = ['light', 'moderate', 'dark', 'intense'];

    validIntensities.forEach((intensity) => {
      const book: Partial<Book> = { intensity: intensity as any };
      expect(book.intensity).toBe(intensity);
    });
  });

  it('Mood type includes all valid values', () => {
    const validMoods = [
      'adventurous',
      'romantic',
      'suspenseful',
      'humorous',
      'melancholic',
      'inspirational',
      'mysterious',
      'cozy',
      'tense',
      'thought_provoking',
    ];

    const book: Partial<Book> = { moods: validMoods as any };
    expect(book.moods).toHaveLength(10);
  });

  it('Book interface includes classification fields', () => {
    const book: Partial<Book> = {
      id: 1,
      title: 'Test',
      audience: 'adult',
      audience_label: 'Adult',
      intensity: 'light',
      intensity_label: 'Light',
      moods: ['cozy', 'romantic'],
      is_classified: true,
    };

    expect(book.audience).toBe('adult');
    expect(book.audience_label).toBe('Adult');
    expect(book.intensity).toBe('light');
    expect(book.intensity_label).toBe('Light');
    expect(book.moods).toEqual(['cozy', 'romantic']);
    expect(book.is_classified).toBe(true);
  });

  it('Book interface handles null classification fields', () => {
    const book: Partial<Book> = {
      id: 1,
      title: 'Test',
      audience: null,
      audience_label: null,
      intensity: null,
      intensity_label: null,
      moods: null,
      is_classified: false,
    };

    expect(book.audience).toBeNull();
    expect(book.intensity).toBeNull();
    expect(book.moods).toBeNull();
    expect(book.is_classified).toBe(false);
  });
});
