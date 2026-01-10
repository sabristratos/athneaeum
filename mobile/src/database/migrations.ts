import {
  schemaMigrations,
  createTable,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Initial schema - no migrations needed for v1
    // Future migrations will be added here as schema evolves
  ],
});
