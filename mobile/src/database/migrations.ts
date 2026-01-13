import {
  schemaMigrations,
  addColumns,
  createTable,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'books',
          columns: [
            { name: 'height_cm', type: 'number', isOptional: true },
            { name: 'width_cm', type: 'number', isOptional: true },
            { name: 'thickness_cm', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'read_throughs',
          columns: [
            { name: 'server_id', type: 'number', isOptional: true, isIndexed: true },
            { name: 'user_book_id', type: 'string', isIndexed: true },
            { name: 'server_user_book_id', type: 'number', isOptional: true },
            { name: 'read_number', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'rating', type: 'number', isOptional: true },
            { name: 'review', type: 'string', isOptional: true },
            { name: 'is_dnf', type: 'boolean' },
            { name: 'dnf_reason', type: 'string', isOptional: true },
            { name: 'started_at', type: 'number', isOptional: true },
            { name: 'finished_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'is_pending_sync', type: 'boolean' },
            { name: 'is_deleted', type: 'boolean' },
          ],
        }),
        addColumns({
          table: 'reading_sessions',
          columns: [
            { name: 'read_through_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'server_read_through_id', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'series',
          columns: [
            { name: 'server_id', type: 'number', isOptional: true, isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'author', type: 'string' },
            { name: 'external_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'external_provider', type: 'string', isOptional: true },
            { name: 'total_volumes', type: 'number', isOptional: true },
            { name: 'is_complete', type: 'boolean' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'is_pending_sync', type: 'boolean' },
            { name: 'is_deleted', type: 'boolean' },
          ],
        }),
        addColumns({
          table: 'books',
          columns: [
            { name: 'series_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'server_series_id', type: 'number', isOptional: true },
            { name: 'volume_number', type: 'number', isOptional: true },
            { name: 'volume_title', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'user_books',
          columns: [
            { name: 'format', type: 'string', isOptional: true },
            { name: 'price', type: 'number', isOptional: true },
            { name: 'is_pinned', type: 'boolean' },
            { name: 'queue_position', type: 'number', isOptional: true },
            { name: 'review', type: 'string', isOptional: true },
          ],
        }),
        createTable({
          name: 'tags',
          columns: [
            { name: 'server_id', type: 'number', isOptional: true, isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'color', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'is_pending_sync', type: 'boolean' },
            { name: 'is_deleted', type: 'boolean' },
          ],
        }),
        createTable({
          name: 'user_book_tags',
          columns: [
            { name: 'user_book_id', type: 'string', isIndexed: true },
            { name: 'tag_id', type: 'string', isIndexed: true },
            { name: 'server_user_book_id', type: 'number', isOptional: true },
            { name: 'server_tag_id', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'books',
          columns: [
            { name: 'audience', type: 'string', isOptional: true },
            { name: 'intensity', type: 'string', isOptional: true },
            { name: 'moods_json', type: 'string', isOptional: true },
            { name: 'is_classified', type: 'boolean', isOptional: true },
            { name: 'classification_confidence', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'tags',
          columns: [
            { name: 'slug', type: 'string' },
            { name: 'is_system', type: 'boolean' },
            { name: 'sort_order', type: 'number' },
          ],
        }),
        createTable({
          name: 'user_preferences',
          columns: [
            { name: 'server_id', type: 'number', isOptional: true, isIndexed: true },
            { name: 'category', type: 'string', isIndexed: true },
            { name: 'type', type: 'string', isIndexed: true },
            { name: 'value', type: 'string' },
            { name: 'normalized', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'is_pending_sync', type: 'boolean' },
            { name: 'is_deleted', type: 'boolean' },
          ],
        }),
        createTable({
          name: 'reading_goals',
          columns: [
            { name: 'server_id', type: 'number', isOptional: true, isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'period', type: 'string' },
            { name: 'target', type: 'number' },
            { name: 'year', type: 'number', isIndexed: true },
            { name: 'month', type: 'number', isOptional: true },
            { name: 'week', type: 'number', isOptional: true },
            { name: 'is_active', type: 'boolean', isIndexed: true },
            { name: 'completed_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'is_pending_sync', type: 'boolean' },
            { name: 'is_deleted', type: 'boolean' },
          ],
        }),
      ],
    },
  ],
});
