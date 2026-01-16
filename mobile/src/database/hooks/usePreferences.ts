import { useEffect, useState, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { UserPreference } from '@/database/models/UserPreference';
import type {
  PreferenceCategory,
  PreferenceType,
  PreferenceState,
} from '@/types/preference';

export type { PreferenceState };

export interface PreferenceItem {
  key: string;
  label: string;
  state: PreferenceState;
}

export interface GroupedPreferences {
  favorite: {
    authors: UserPreference[];
    genres: UserPreference[];
    series: UserPreference[];
    formats: UserPreference[];
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
      favorite: { authors: [], genres: [], series: [], formats: [] },
      exclude: { authors: [], genres: [], series: [] },
    };

    const seen = new Set<string>();

    for (const pref of preferences) {
      const key = `${pref.type}-${pref.category}-${pref.normalized}`;
      if (seen.has(key)) continue;
      seen.add(key);

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
        case 'format':
          if (pref.type === 'favorite') {
            result.favorite.formats.push(pref);
          }
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

/**
 * Hook for toggling author/genre/series preferences.
 * Handles the common pattern of removing current state before adding new state.
 */
export function useTogglePreference() {
  const [loading, setLoading] = useState(false);
  const { addPreference, removePreferenceByValue } = usePreferenceActions();

  const toggle = useCallback(
    async (
      category: PreferenceCategory,
      value: string,
      currentState: PreferenceState,
      newState: PreferenceState
    ): Promise<void> => {
      setLoading(true);
      try {
        if (currentState === 'favorite') {
          await removePreferenceByValue(category, 'favorite', value);
        } else if (currentState === 'excluded') {
          await removePreferenceByValue(category, 'exclude', value);
        }

        if (newState === 'favorite') {
          await addPreference(category, 'favorite', value);
        } else if (newState === 'excluded') {
          await addPreference(category, 'exclude', value);
        }
      } finally {
        setLoading(false);
      }
    },
    [addPreference, removePreferenceByValue]
  );

  const toggleAuthor = useCallback(
    (authorName: string, currentState: PreferenceState, newState: PreferenceState) =>
      toggle('author', authorName, currentState, newState),
    [toggle]
  );

  const toggleGenre = useCallback(
    (genreName: string, currentState: PreferenceState, newState: PreferenceState) =>
      toggle('genre', genreName, currentState, newState),
    [toggle]
  );

  const toggleSeries = useCallback(
    (seriesName: string, currentState: PreferenceState, newState: PreferenceState) =>
      toggle('series', seriesName, currentState, newState),
    [toggle]
  );

  return { toggle, toggleAuthor, toggleGenre, toggleSeries, loading };
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

/**
 * Hook for setting preference to specific state (direct selection).
 * Optimized for PreferenceStateSelector usage.
 */
export function useSetPreferenceState() {
  const { addPreference, removePreferenceByValue } = usePreferenceActions();
  const [loading, setLoading] = useState(false);

  const set = useCallback(
    async (
      category: PreferenceCategory,
      value: string,
      currentState: PreferenceState,
      newState: PreferenceState
    ): Promise<void> => {
      if (currentState === newState) return;

      setLoading(true);
      try {
        if (currentState === 'favorite') {
          await removePreferenceByValue(category, 'favorite', value);
        } else if (currentState === 'excluded') {
          await removePreferenceByValue(category, 'exclude', value);
        }

        if (newState === 'favorite') {
          await addPreference(category, 'favorite', value);
        } else if (newState === 'excluded') {
          await addPreference(category, 'exclude', value);
        }
      } finally {
        setLoading(false);
      }
    },
    [addPreference, removePreferenceByValue]
  );

  return { set, loading };
}

/**
 * Hook to get preference state for a single item.
 */
export function usePreferenceState(
  category: PreferenceCategory,
  value: string
): { state: PreferenceState; loading: boolean } {
  const { preferences, loading } = usePreferences();
  const normalized = useMemo(() => normalizeValue(value), [value]);

  const state = useMemo((): PreferenceState => {
    const pref = preferences.find(
      (p) => p.category === category && p.normalized === normalized
    );

    if (!pref) return 'none';
    return pref.type === 'favorite' ? 'favorite' : 'excluded';
  }, [preferences, category, normalized]);

  return { state, loading };
}

/**
 * Hook for getting all preferences as PreferenceItem[] for a category.
 * Useful for rendering PreferenceChipGroup.
 */
export function usePreferenceItems(
  category: PreferenceCategory,
  availableValues: string[]
): { items: PreferenceItem[]; loading: boolean } {
  const { preferences, loading } = usePreferences();

  const items = useMemo((): PreferenceItem[] => {
    return availableValues.map((value) => {
      const normalized = normalizeValue(value);
      const pref = preferences.find(
        (p) => p.category === category && p.normalized === normalized
      );

      const state: PreferenceState = pref
        ? pref.type === 'favorite'
          ? 'favorite'
          : 'excluded'
        : 'none';

      return { key: value, label: value, state };
    });
  }, [preferences, category, availableValues]);

  return { items, loading };
}

/**
 * Hook for cycling preference through states: none -> favorite -> excluded -> none.
 */
export function useCyclePreference() {
  const { addPreference, removePreferenceByValue } = usePreferenceActions();
  const [loading, setLoading] = useState(false);

  const cycle = useCallback(
    async (
      category: PreferenceCategory,
      value: string,
      currentState: PreferenceState
    ): Promise<PreferenceState> => {
      setLoading(true);
      try {
        const nextState: PreferenceState =
          currentState === 'none'
            ? 'favorite'
            : currentState === 'favorite'
              ? 'excluded'
              : 'none';

        if (currentState === 'favorite') {
          await removePreferenceByValue(category, 'favorite', value);
        } else if (currentState === 'excluded') {
          await removePreferenceByValue(category, 'exclude', value);
        }

        if (nextState === 'favorite') {
          await addPreference(category, 'favorite', value);
        } else if (nextState === 'excluded') {
          await addPreference(category, 'exclude', value);
        }

        return nextState;
      } finally {
        setLoading(false);
      }
    },
    [addPreference, removePreferenceByValue]
  );

  return { cycle, loading };
}
