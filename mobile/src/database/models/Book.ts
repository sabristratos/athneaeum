import { Model, type Query } from '@nozbe/watermelondb';
import {
  field,
  text,
  date,
  readonly,
  children,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { UserBook } from '@/database/models/UserBook';

export class Book extends Model {
  static table = 'books';

  static associations: Associations = {
    user_books: { type: 'has_many', foreignKey: 'book_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('external_id') externalId!: string | null;
  @text('external_provider') externalProvider!: string | null;
  @text('title') title!: string;
  @text('author') author!: string;
  @text('cover_url') coverUrl!: string | null;
  @text('local_cover_path') localCoverPath!: string | null;
  @field('page_count') pageCount!: number | null;
  @text('isbn') isbn!: string | null;
  @text('description') description!: string | null;
  @text('genres_json') genresJson!: string | null;
  @text('published_date') publishedDate!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @children('user_books') userBooks!: Query<UserBook>;

  get genres(): string[] {
    return this.genresJson ? JSON.parse(this.genresJson) : [];
  }

  get effectiveCoverUrl(): string | null {
    return this.localCoverPath || this.coverUrl;
  }

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
