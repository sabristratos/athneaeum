import { useEffect, useState, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type {
  UserPreference,
  PreferenceCategory,
  PreferenceType,
} from '@/database/models/UserPreference';

export interface GroupedPreferences {
  favorite: {
    authors: UserPreference[];
    genres: UserPreference[];
    series: UserPreference[];
  };
  exclude: {
    authors: UserPreference[];
    genres: UserPreference[];
    series: UserPreference[];
  };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(Q.where('is_deleted', false))
      .observe()
      .subscribe((fetchedPreferences) => {
        setPreferences(fetchedPreferences);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { preferences, loading };
}

export function useGroupedPreferences() {
  const { preferences, loading } = usePreferences();

  const grouped = useMemo((): GroupedPreferences => {
    const result: GroupedPreferences = {
      favorite: { authors: [], genres: [], series: [] },
      exclude: { authors: [], genres: [], series: [] },
    };

    for (const pref of preferences) {
      const typeGroup = pref.type === 'favorite' ? result.favorite : result.exclude;
      switch (pref.category) {
        case 'author':
          typeGroup.authors.push(pref);
          break;
        case 'genre':
          typeGroup.genres.push(pref);
          break;
        case 'series':
          typeGroup.series.push(pref);
          break;
      }
    }

    return result;
  }, [preferences]);

  return { grouped, loading };
}

export function useFavoriteAuthors() {
  const [authors, setAuthors] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('type', 'favorite'),
        Q.where('category', 'author')
      )
      .observe()
      .subscribe((fetchedAuthors) => {
        setAuthors(fetchedAuthors);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { authors, loading };
}

export function useExcludedAuthors() {
  const [authors, setAuthors] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('type', 'exclude'),
        Q.where('category', 'author')
      )
      .observe()
      .subscribe((fetchedAuthors) => {
        setAuthors(fetchedAuthors);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { authors, loading };
}

export function useFavoriteGenres() {
  const [genres, setGenres] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('type', 'favorite'),
        Q.where('category', 'genre')
      )
      .observe()
      .subscribe((fetchedGenres) => {
        setGenres(fetchedGenres);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { genres, loading };
}

export function useExcludedGenres() {
  const [genres, setGenres] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('type', 'exclude'),
        Q.where('category', 'genre')
      )
      .observe()
      .subscribe((fetchedGenres) => {
        setGenres(fetchedGenres);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { genres, loading };
}

function normalizeValue(value: string): string {
  return value.toLowerCase().trim();
}

export function usePreferenceActions() {
  const [loading, setLoading] = useState(false);

  const addPreference = useCallback(
    async (
      category: PreferenceCategory,
      type: PreferenceType,
      value: string
    ): Promise<UserPreference | null> => {
      setLoading(true);
      try {
        const normalized = normalizeValue(value);
        let createdPreference: UserPreference | null = null;

        await database.write(async () => {
          const preferencesCollection =
            database.get<UserPreference>('user_preferences');

          const existing = await preferencesCollection
            .query(
              Q.where('is_deleted', false),
              Q.where('category', category),
              Q.where('type', type),
              Q.where('normalized', normalized)
            )
            .fetch();

          if (existing.length > 0) {
            createdPreference = existing[0];
            return;
          }

          createdPreference = await preferencesCollection.create((record) => {
            record.category = category;
            record.type = type;
            record.value = value;
            record.normalized = normalized;
            record.isPendingSync = true;
            record.isDeleted = false;
          });
        });

        scheduleSyncAfterMutation();
        return createdPreference;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removePreference = useCallback(async (preferenceId: string): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const preference = await database
          .get<UserPreference>('user_preferences')
          .find(preferenceId);
        await preference.softDelete();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  const removePreferenceByValue = useCallback(
    async (
      category: PreferenceCategory,
      type: PreferenceType,
      value: string
    ): Promise<void> => {
      setLoading(true);
      try {
        const normalized = normalizeValue(value);

        await database.write(async () => {
          const preferencesCollection =
            database.get<UserPreference>('user_preferences');

          const existing = await preferencesCollection
            .query(
              Q.where('is_deleted', false),
              Q.where('category', category),
              Q.where('type', type),
              Q.where('normalized', normalized)
            )
            .fetch();

          for (const pref of existing) {
            await pref.softDelete();
          }
        });

        scheduleSyncAfterMutation();
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addBatchPreferences = useCallback(
    async (
      items: Array<{
        category: PreferenceCategory;
        type: PreferenceType;
        value: string;
      }>
    ): Promise<void> => {
      setLoading(true);
      try {
        await database.write(async () => {
          const preferencesCollection =
            database.get<UserPreference>('user_preferences');

          for (const item of items) {
            const normalized = normalizeValue(item.value);

            const existing = await preferencesCollection
              .query(
                Q.where('is_deleted', false),
                Q.where('category', item.category),
                Q.where('type', item.type),
                Q.where('normalized', normalized)
              )
              .fetch();

            if (existing.length === 0) {
              await preferencesCollection.create((record) => {
                record.category = item.category;
                record.type = item.type;
                record.value = item.value;
                record.normalized = normalized;
                record.isPendingSync = true;
                record.isDeleted = false;
              });
            }
          }
        });

        scheduleSyncAfterMutation();
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    addPreference,
    removePreference,
    removePreferenceByValue,
    addBatchPreferences,
    loading,
  };
}

export function useHasPreference(
  category: PreferenceCategory,
  type: PreferenceType,
  value: string
) {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  const normalized = useMemo(() => normalizeValue(value), [value]);

  useEffect(() => {
    const preferencesCollection = database.get<UserPreference>('user_preferences');

    const subscription = preferencesCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('category', category),
        Q.where('type', type),
        Q.where('normalized', normalized)
      )
      .observe()
      .subscribe((results) => {
        setExists(results.length > 0);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [category, type, normalized]);

  return { exists, loading };
}
