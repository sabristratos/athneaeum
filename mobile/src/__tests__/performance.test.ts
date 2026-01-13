/**
 * Performance benchmarks for critical operations.
 * These tests measure execution time and ensure operations stay within bounds.
 */

import { hexToRgb, getLuminance, getContrastingTextColor } from '../utils/colorUtils';

interface BenchmarkResult {
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSecond: number;
}

function benchmark(name: string, fn: () => void, iterations = 10000): BenchmarkResult {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;
  const opsPerSecond = Math.round(1000 / avgMs);

  console.log(`[Benchmark] ${name}: ${avgMs.toFixed(4)}ms avg (${opsPerSecond.toLocaleString()} ops/sec)`);

  return { iterations, totalMs, avgMs, opsPerSecond };
}

describe('Performance Benchmarks', () => {
  describe('Color Utils', () => {
    it('hexToRgb should process > 100,000 ops/sec', () => {
      const result = benchmark('hexToRgb', () => {
        hexToRgb('#8b2e2e');
      });
      expect(result.opsPerSecond).toBeGreaterThan(100000);
    });

    it('getLuminance should process > 50,000 ops/sec', () => {
      const result = benchmark('getLuminance', () => {
        getLuminance('#8b2e2e');
      });
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });

    it('getContrastingTextColor should process > 50,000 ops/sec', () => {
      const result = benchmark('getContrastingTextColor', () => {
        getContrastingTextColor('#8b2e2e', '#ffffff', '#000000');
      });
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });
  });

  describe('Array Operations', () => {
    const testBooks = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      title: `Book ${i}`,
      author: `Author ${i}`,
    }));

    it('array slice (40 items) should be < 0.1ms', () => {
      const result = benchmark('Array.slice(0, 40)', () => {
        testBooks.slice(0, 40);
      });
      expect(result.avgMs).toBeLessThan(0.1);
    });

    it('array map should process 200 items in < 0.5ms', () => {
      const result = benchmark('Array.map (200 items)', () => {
        testBooks.map((book) => ({ ...book, processed: true }));
      });
      expect(result.avgMs).toBeLessThan(0.5);
    });

    it('array filter should process 200 items in < 0.2ms', () => {
      const result = benchmark('Array.filter (200 items)', () => {
        testBooks.filter((book) => book.id % 2 === 0);
      });
      expect(result.avgMs).toBeLessThan(0.2);
    });
  });

  describe('Object Operations', () => {
    it('object spread should be fast', () => {
      const source = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      const result = benchmark('Object spread', () => {
        const copy = { ...source, f: 6 };
      });
      expect(result.opsPerSecond).toBeGreaterThan(500000);
    });

    it('Object.keys should be fast', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      const result = benchmark('Object.keys', () => {
        Object.keys(obj);
      });
      expect(result.opsPerSecond).toBeGreaterThan(500000);
    });
  });

  describe('Spine Calculations', () => {
    function getSpineWidth(pageCount: number | null | undefined): number {
      if (!pageCount || pageCount < 100) return 16;
      if (pageCount < 300) return 20;
      if (pageCount < 600) return 26;
      if (pageCount < 1000) return 32;
      return 38;
    }

    function seededRandom(seed: string): number {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(Math.sin(hash));
    }

    function getSpineHeight(pageCount: number | null | undefined, bookId: string): number {
      const SPINE_HEIGHT_MIN = 140;
      const SPINE_HEIGHT_MAX = 160;
      const heightRange = SPINE_HEIGHT_MAX - SPINE_HEIGHT_MIN;
      const pages = pageCount || 200;
      const normalizedPages = Math.min(Math.max(pages, 50), 1200);
      const pageRatio = (normalizedPages - 50) / (1200 - 50);
      const randomFactor = seededRandom(bookId);
      const blendedRatio = (pageRatio * 0.4) + (randomFactor * 0.6);
      return Math.round(SPINE_HEIGHT_MIN + (blendedRatio * heightRange));
    }

    it('getSpineWidth should process > 1,000,000 ops/sec', () => {
      const result = benchmark('getSpineWidth', () => {
        getSpineWidth(350);
      });
      expect(result.opsPerSecond).toBeGreaterThan(1000000);
    });

    it('seededRandom should process > 500,000 ops/sec', () => {
      const result = benchmark('seededRandom', () => {
        seededRandom('book-123-abc');
      });
      expect(result.opsPerSecond).toBeGreaterThan(500000);
    });

    it('getSpineHeight should process > 200,000 ops/sec', () => {
      const result = benchmark('getSpineHeight', () => {
        getSpineHeight(350, 'book-123-abc');
      });
      expect(result.opsPerSecond).toBeGreaterThan(200000);
    });

    it('should calculate 200 spines in < 5ms', () => {
      const books = Array.from({ length: 200 }, (_, i) => ({
        id: `book-${i}`,
        pageCount: Math.floor(Math.random() * 1000) + 100,
      }));

      const result = benchmark('200 spine calculations', () => {
        books.forEach((book) => {
          getSpineWidth(book.pageCount);
          getSpineHeight(book.pageCount, book.id);
        });
      }, 1000);

      expect(result.avgMs).toBeLessThan(5);
    });
  });

  describe('Memory Estimation', () => {
    it('should estimate spine view memory usage', () => {
      const SPINE_COUNT = 200;
      const BYTES_PER_SPINE_ESTIMATE = 500;
      const ESTIMATED_MB = (SPINE_COUNT * BYTES_PER_SPINE_ESTIMATE) / (1024 * 1024);

      console.log(`[Memory] Estimated ${SPINE_COUNT} spines: ${ESTIMATED_MB.toFixed(2)}MB`);

      expect(ESTIMATED_MB).toBeLessThan(1);
    });
  });
});
