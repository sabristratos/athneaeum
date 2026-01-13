import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';
import type { Tag, TagFilterMode, DeletedTagInfo } from '@/types/tag';

const MAX_RECENTLY_USED = 5;
const UNDO_WINDOW_MS = 5000;

interface TagStore {
  tags: Tag[];
  selectedTagFilters: string[];
  filterMode: TagFilterMode;
  recentlyUsedTagIds: number[];
  deletedTag: DeletedTagInfo | null;
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: number, data: Partial<Tag>) => void;
  deleteTag: (id: number) => void;
  undoDeleteTag: () => Tag | null;
  clearDeletedTag: () => void;
  toggleTagFilter: (slug: string) => void;
  setTagFilters: (slugs: string[]) => void;
  clearTagFilters: () => void;
  setFilterMode: (mode: TagFilterMode) => void;
  markTagUsed: (tagId: number) => void;
  getSystemTags: () => Tag[];
  getUserTags: () => Tag[];
  getRecentlyUsedTags: () => Tag[];
  getTagById: (id: number) => Tag | undefined;
  getTagBySlug: (slug: string) => Tag | undefined;
}

const useTagStoreBase = create<TagStore>()(
  persist(
    (set, get) => ({
      tags: [],
      selectedTagFilters: [],
      filterMode: 'any' satisfies TagFilterMode,
      recentlyUsedTagIds: [],
      deletedTag: null,
      isHydrated: false,

      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),

      setTags: (tags: Tag[]) => set({ tags }),

      addTag: (tag: Tag) =>
        set((state) => ({
          tags: [...state.tags, tag],
        })),

      updateTag: (id: number, data: Partial<Tag>) =>
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),

      deleteTag: (id: number) =>
        set((state) => {
          const tagToDelete = state.tags.find((t) => t.id === id);
          if (!tagToDelete) return state;

          return {
            tags: state.tags.filter((t) => t.id !== id),
            selectedTagFilters: state.selectedTagFilters.filter((s) => s !== tagToDelete.slug),
            recentlyUsedTagIds: state.recentlyUsedTagIds.filter((tid) => tid !== id),
            deletedTag: { tag: tagToDelete, deletedAt: Date.now() },
          };
        }),

      undoDeleteTag: () => {
        const { deletedTag } = get();
        if (!deletedTag) return null;

        const timeSinceDelete = Date.now() - deletedTag.deletedAt;
        if (timeSinceDelete > UNDO_WINDOW_MS) {
          set({ deletedTag: null });
          return null;
        }

        set((state) => ({
          tags: [...state.tags, deletedTag.tag],
          deletedTag: null,
        }));

        return deletedTag.tag;
      },

      clearDeletedTag: () => set({ deletedTag: null }),

      toggleTagFilter: (slug: string) =>
        set((state) => ({
          selectedTagFilters: state.selectedTagFilters.includes(slug)
            ? state.selectedTagFilters.filter((s) => s !== slug)
            : [...state.selectedTagFilters, slug],
        })),

      setTagFilters: (slugs: string[]) =>
        set({ selectedTagFilters: slugs }),

      clearTagFilters: () => set({ selectedTagFilters: [] }),

      setFilterMode: (mode: TagFilterMode) => set({ filterMode: mode }),

      markTagUsed: (tagId: number) =>
        set((state) => {
          const filtered = state.recentlyUsedTagIds.filter((id) => id !== tagId);
          return {
            recentlyUsedTagIds: [tagId, ...filtered].slice(0, MAX_RECENTLY_USED),
          };
        }),

      getSystemTags: () => get().tags.filter((t) => t.is_system),

      getUserTags: () => get().tags.filter((t) => !t.is_system),

      getRecentlyUsedTags: () => {
        const { tags, recentlyUsedTagIds } = get();
        return recentlyUsedTagIds
          .map((id) => tags.find((t) => t.id === id))
          .filter((t): t is Tag => t !== undefined);
      },

      getTagById: (id: number) => get().tags.find((t) => t.id === id),

      getTagBySlug: (slug: string) => get().tags.find((t) => t.slug === slug),
    }),
    {
      name: 'athenaeum-tags',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        tags: state.tags,
        selectedTagFilters: state.selectedTagFilters,
        filterMode: state.filterMode,
        recentlyUsedTagIds: state.recentlyUsedTagIds,
      }),
    }
  )
);

export const useTagStore = useTagStoreBase;

const noopFn = () => {};

export const useTagActions = () =>
  useTagStoreBase(
    useShallow((state) => ({
      setTags: state?.setTags ?? noopFn,
      addTag: state?.addTag ?? noopFn,
      updateTag: state?.updateTag ?? noopFn,
      deleteTag: state?.deleteTag ?? noopFn,
      undoDeleteTag: state?.undoDeleteTag ?? (() => null),
      clearDeletedTag: state?.clearDeletedTag ?? noopFn,
      toggleTagFilter: state?.toggleTagFilter ?? noopFn,
      setTagFilters: state?.setTagFilters ?? noopFn,
      clearTagFilters: state?.clearTagFilters ?? noopFn,
      setFilterMode: state?.setFilterMode ?? noopFn,
      markTagUsed: state?.markTagUsed ?? noopFn,
    }))
  );

export const useTags = () => useTagStoreBase((state) => state?.tags ?? []);

export const useTagFilters = () =>
  useTagStoreBase((state) => state?.selectedTagFilters ?? []);

export const useFilterMode = () =>
  useTagStoreBase((state) => state.filterMode);

export const useRecentlyUsedTags = () =>
  useTagStoreBase(
    useShallow((state) => {
      const tags = state?.tags ?? [];
      const recentlyUsedTagIds = state?.recentlyUsedTagIds ?? [];
      return recentlyUsedTagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is Tag => t !== undefined);
    })
  );

export const useDeletedTag = () =>
  useTagStoreBase((state) => state?.deletedTag ?? null);

export const useSystemTags = () =>
  useTagStoreBase(useShallow((state) => (state?.tags ?? []).filter((t) => t.is_system)));

export const useUserTags = () =>
  useTagStoreBase(useShallow((state) => (state?.tags ?? []).filter((t) => !t.is_system)));

export const useTagHydrated = () =>
  useTagStoreBase((state) => state.isHydrated);
