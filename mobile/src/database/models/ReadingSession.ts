import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  date,
  readonly,
  relation,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { UserBook } from '@/database/models/UserBook';

export class ReadingSession extends Model {
  static table = 'reading_sessions';

  static associations: Associations = {
    user_books: { type: 'belongs_to', key: 'user_book_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('user_book_id') userBookId!: string;
  @field('server_user_book_id') serverUserBookId!: number | null;
  @text('date') sessionDate!: string;
  @field('pages_read') pagesRead!: number;
  @field('start_page') startPage!: number;
  @field('end_page') endPage!: number;
  @field('duration_seconds') durationSeconds!: number | null;
  @text('notes') notes!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @relation('user_books', 'user_book_id') userBook!: UserBook;

  get formattedDuration(): string | null {
    if (!this.durationSeconds) return null;
    const hours = Math.floor(this.durationSeconds / 3600);
    const minutes = Math.floor((this.durationSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  @writer async markSynced(serverId: number, serverUserBookId: number) {
    await this.update((record) => {
      record.serverId = serverId;
      record.serverUserBookId = serverUserBookId;
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
