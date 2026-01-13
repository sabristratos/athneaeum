import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';
import { parseToHex } from '@/utils/colorUtils';

let getPalette: ((uri: string) => Promise<{ dominant?: string; vibrant?: string; muted?: string }>) | null = null;
try {
  getPalette = require('@somesoap/react-native-image-palette').getPalette;
} catch {
}

interface SpineColorEntry {
  color: string;
  extractedAt: number;
}

interface ExtractionQueueItem {
  bookId: string;
  coverUrl: string;
}

interface SpineColorState {
  colors: Record<string, SpineColorEntry>;
  extractionQueue: ExtractionQueueItem[];
  isProcessing: boolean;
  pendingBatch: Record<string, string>;

  setColor: (bookId: string, color: string) => void;
  getColor: (bookId: string) => string | null;
  hasColor: (bookId: string) => boolean;
  clearColor: (bookId: string) => void;
  clearStaleColors: (maxAge?: number) => void;
  clearAllColors: () => void;

  queueExtraction: (bookId: string, coverUrl: string) => void;
  processQueue: () => void;
  flushBatch: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CONCURRENT_EXTRACTIONS = 3;
const BATCH_DELAY_MS = 30;
const BATCH_FLUSH_DELAY_MS = 300;

let batchFlushTimeout: NodeJS.Timeout | null = null;
let processingTimeout: NodeJS.Timeout | null = null;

async function extractColorFromCover(coverUrl: string): Promise<string | null> {
  if (!getPalette) {
    return null;
  }

  try {
    const result = await getPalette(coverUrl);
    const color = (result as any).dominantAndroid || result.vibrant || result.muted;
    return color ? parseToHex(color) : null;
  } catch {
    return null;
  }
}

export const useSpineColorStore = create<SpineColorState>()(
  persist(
    (set, get) => ({
      colors: {},
      extractionQueue: [],
      isProcessing: false,
      pendingBatch: {},

      setColor: (bookId, color) => {
        const state = get();
        state.pendingBatch[bookId] = color;

        if (batchFlushTimeout) {
          clearTimeout(batchFlushTimeout);
        }

        batchFlushTimeout = setTimeout(() => {
          get().flushBatch();
        }, BATCH_FLUSH_DELAY_MS);
      },

      flushBatch: () => {
        const state = get();
        const pending = { ...state.pendingBatch };

        if (Object.keys(pending).length === 0) return;

        const batchedColors: Record<string, SpineColorEntry> = {};
        const now = Date.now();

        for (const [bookId, color] of Object.entries(pending)) {
          batchedColors[bookId] = { color, extractedAt: now };
        }

        set((s) => ({
          colors: { ...s.colors, ...batchedColors },
          pendingBatch: {},
        }));

        batchFlushTimeout = null;
      },

      getColor: (bookId) => {
        const entry = get().colors[bookId];
        if (!entry) return null;
        if (Date.now() - entry.extractedAt > SEVEN_DAYS_MS) {
          return null;
        }
        return entry.color;
      },

      hasColor: (bookId) => {
        const entry = get().colors[bookId];
        if (!entry) return false;
        return Date.now() - entry.extractedAt <= SEVEN_DAYS_MS;
      },

      clearColor: (bookId) =>
        set((state) => {
          const { [bookId]: _, ...remaining } = state.colors;
          return { colors: remaining };
        }),

      clearStaleColors: (maxAge = SEVEN_DAYS_MS) =>
        set((state) => ({
          colors: Object.fromEntries(
            Object.entries(state.colors).filter(
              ([_, entry]) => Date.now() - entry.extractedAt < maxAge
            )
          ),
        })),

      clearAllColors: () => set({ colors: {} }),

      queueExtraction: (bookId, coverUrl) => {
        const state = get();

        if (state.colors[bookId] || state.pendingBatch[bookId]) {
          return;
        }

        const alreadyQueued = state.extractionQueue.some(
          (item) => item.bookId === bookId
        );
        if (alreadyQueued) {
          return;
        }

        set((s) => ({
          extractionQueue: [...s.extractionQueue, { bookId, coverUrl }],
        }));

        if (!state.isProcessing) {
          get().processQueue();
        }
      },

      processQueue: async () => {
        const state = get();

        if (state.extractionQueue.length === 0) {
          set({ isProcessing: false });
          return;
        }

        set({ isProcessing: true });

        const batch = state.extractionQueue.slice(0, CONCURRENT_EXTRACTIONS);
        const remaining = state.extractionQueue.slice(CONCURRENT_EXTRACTIONS);
        set({ extractionQueue: remaining });

        await Promise.all(
          batch.map(async ({ bookId, coverUrl }) => {
            const color = await extractColorFromCover(coverUrl);
            if (color) {
              get().setColor(bookId, color);
            }
          })
        );

        processingTimeout = setTimeout(() => {
          get().processQueue();
        }, BATCH_DELAY_MS);
      },
    }),
    {
      name: 'athenaeum-spine-colors',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ colors: state.colors }),
    }
  )
);

export const useSpineColorActions = () =>
  useSpineColorStore(
    useShallow((state) => ({
      setColor: state.setColor,
      clearColor: state.clearColor,
      clearStaleColors: state.clearStaleColors,
      clearAllColors: state.clearAllColors,
      queueExtraction: state.queueExtraction,
    }))
  );

export const useSpineColor = (bookId: string) =>
  useSpineColorStore((state) => state.colors[bookId]?.color ?? null);

export const useHasSpineColor = (bookId: string) =>
  useSpineColorStore((state) => !!state.colors[bookId]);
