import { useEffect, useState, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { UserPreference } from '@/database/models/UserPreference';

export type BookFormat = 'physical' | 'ebook' | 'audiobook';

const VALID_FORMATS: BookFormat[] = ['physical', 'ebook', 'audiobook'];

export const FORMAT_OPTIONS: { key: BookFormat; label: string; shortLabel: string }[] = [
  { key: 'physical', label: 'Physical Books', shortLabel: 'Physical' },
  { key: 'ebook', label: 'E-books', shortLabel: 'E-book' },
  { key: 'audiobook', label: 'Audiobooks', shortLabel: 'Audio' },
];

export function useFavoriteFormats(): {
  formats: BookFormat[];
  defaultFormat: BookFormat;
  loading: boolean;
} {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('category', 'format'),
        Q.where('type', 'favorite')
      )
      .observe()
      .subscribe((fetchedPreferences) => {
        setPreferences(fetchedPreferences);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const formats = useMemo(() => {
    return preferences
      .map((p) => p.value as BookFormat)
      .filter((f) => VALID_FORMATS.includes(f));
  }, [preferences]);

  const defaultFormat = formats[0] || 'physical';

  return { formats, defaultFormat, loading };
}

export function useFormatPreferenceActions(): {
  toggleFormat: (format: BookFormat, currentFormats: BookFormat[]) => Promise<void>;
  setFormats: (formats: BookFormat[]) => Promise<void>;
  setDefaultFormat: (format: BookFormat, currentFormats: BookFormat[]) => Promise<void>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);

  const toggleFormat = useCallback(async (
    format: BookFormat,
    currentFormats: BookFormat[]
  ): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const preferencesCollection = database.get<UserPreference>('user_preferences');

        const existing = await preferencesCollection
          .query(
            Q.where('is_deleted', false),
            Q.where('category', 'format'),
            Q.where('type', 'favorite'),
            Q.where('normalized', format)
          )
          .fetch();

        if (existing.length > 0) {
          for (const pref of existing) {
            await pref.softDelete();
          }
        } else {
          await preferencesCollection.create((record) => {
            record.category = 'format';
            record.type = 'favorite';
            record.value = format;
            record.normalized = format;
            record.isPendingSync = true;
            record.isDeleted = false;
          });
        }
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  const setFormats = useCallback(async (formats: BookFormat[]): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const preferencesCollection = database.get<UserPreference>('user_preferences');

        const existing = await preferencesCollection
          .query(
            Q.where('is_deleted', false),
            Q.where('category', 'format'),
            Q.where('type', 'favorite')
          )
          .fetch();

        for (const pref of existing) {
          await pref.softDelete();
        }

        for (const format of formats) {
          await preferencesCollection.create((record) => {
            record.category = 'format';
            record.type = 'favorite';
            record.value = format;
            record.normalized = format;
            record.isPendingSync = true;
            record.isDeleted = false;
          });
        }
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  const setDefaultFormat = useCallback(async (
    format: BookFormat,
    currentFormats: BookFormat[]
  ): Promise<void> => {
    if (!currentFormats.includes(format)) return;

    const reorderedFormats = [
      format,
      ...currentFormats.filter((f) => f !== format),
    ];

    await setFormats(reorderedFormats);
  }, [setFormats]);

  return { toggleFormat, setFormats, setDefaultFormat, loading };
}
