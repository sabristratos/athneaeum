import { Model, type Query } from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  children,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { Book } from '@/database/models/Book';

export class Series extends Model {
  static table = 'series';

  static associations: Associations = {
    books: { type: 'has_many', foreignKey: 'series_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('title') title!: string;
  @text('author') author!: string;
  @text('external_id') externalId!: string | null;
  @text('external_provider') externalProvider!: string | null;
  @field('total_volumes') totalVolumes!: number | null;
  @field('is_complete') isComplete!: boolean;
  @text('description') description!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @children('books') books!: Query<Book>;

  @writer async markForSync() {
    await this.update((record) => {
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async markSynced(serverId: number) {
    await this.update((record) => {
      record.serverId = serverId;
      record.isPendingSync = false;
    });
  }

  @writer async softDelete() {
    await this.update((record) => {
      record.isDeleted = true;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }
}
