import { useEffect, useState, useCallback, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { Tag } from '@/database/models/Tag';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tagsCollection = database.get<Tag>('tags');

    const subscription = tagsCollection
      .query(Q.where('is_deleted', false), Q.sortBy('sort_order', Q.asc))
      .observe()
      .subscribe((fetchedTags) => {
        setTags(fetchedTags);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { tags, loading };
}

export function useSystemTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tagsCollection = database.get<Tag>('tags');

    const subscription = tagsCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('is_system', true),
        Q.sortBy('sort_order', Q.asc)
      )
      .observe()
      .subscribe((fetchedTags) => {
        setTags(fetchedTags);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { tags, loading };
}

export function useUserTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tagsCollection = database.get<Tag>('tags');

    const subscription = tagsCollection
      .query(
        Q.where('is_deleted', false),
        Q.where('is_system', false),
        Q.sortBy('sort_order', Q.asc)
      )
      .observe()
      .subscribe((fetchedTags) => {
        setTags(fetchedTags);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { tags, loading };
}

export function useTag(tagId: string) {
  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = database
      .get<Tag>('tags')
      .findAndObserve(tagId)
      .subscribe({
        next: (fetchedTag) => {
          setTag(fetchedTag);
          setLoading(false);
        },
        error: () => {
          setTag(null);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [tagId]);

  return { tag, loading };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useTagActions() {
  const [loading, setLoading] = useState(false);

  const createTag = useCallback(async (name: string, color: string): Promise<Tag> => {
    setLoading(true);
    try {
      let createdTag: Tag | null = null;

      await database.write(async () => {
        const tagsCollection = database.get<Tag>('tags');

        const existingTags = await tagsCollection
          .query(Q.where('is_deleted', false))
          .fetch();
        const maxSortOrder = existingTags.reduce(
          (max, tag) => Math.max(max, tag.sortOrder),
          0
        );

        createdTag = await tagsCollection.create((record) => {
          record.name = name;
          record.slug = generateSlug(name);
          record.color = color;
          record.isSystem = false;
          record.sortOrder = maxSortOrder + 1;
          record.isPendingSync = true;
          record.isDeleted = false;
        });
      });

      scheduleSyncAfterMutation();
      return createdTag!;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTag = useCallback(
    async (tagId: string, data: { name?: string; color?: string }): Promise<void> => {
      setLoading(true);
      try {
        await database.write(async () => {
          const tag = await database.get<Tag>('tags').find(tagId);
          await tag.updateTag({
            name: data.name,
            slug: data.name ? generateSlug(data.name) : undefined,
            color: data.color,
          });
        });

        scheduleSyncAfterMutation();
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteTag = useCallback(async (tagId: string): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const tag = await database.get<Tag>('tags').find(tagId);
        await tag.softDelete();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  const reorderTags = useCallback(async (tagIds: string[]): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const tagsCollection = database.get<Tag>('tags');
        for (let i = 0; i < tagIds.length; i++) {
          const tag = await tagsCollection.find(tagIds[i]);
          await tag.update((record) => {
            record.sortOrder = i;
            record.isPendingSync = true;
          });
        }
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTag, updateTag, deleteTag, reorderTags, loading };
}

export function useTagsByIds(tagIds: string[]) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const sortedTagIds = useMemo(() => [...tagIds].sort(), [tagIds]);
  const tagIdsKey = sortedTagIds.join(',');

  useEffect(() => {
    if (sortedTagIds.length === 0) {
      setTags([]);
      setLoading(false);
      return;
    }

    const tagsCollection = database.get<Tag>('tags');

    const subscription = tagsCollection
      .query(Q.where('id', Q.oneOf(sortedTagIds)), Q.where('is_deleted', false))
      .observe()
      .subscribe((fetchedTags) => {
        setTags(fetchedTags);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [tagIdsKey]);

  return { tags, loading };
}
