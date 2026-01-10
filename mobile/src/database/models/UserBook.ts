import { Model, type Query } from '@nozbe/watermelondb';
import {
  field,
  text,
  date,
  readonly,
  relation,
  children,
  writer,
} from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { BookStatus } from '@/types/book';
import type { Book } from '@/database/models/Book';
import type { ReadingSession } from '@/database/models/ReadingSession';

export class UserBook extends Model {
  static table = 'user_books';

  static associations: Associations = {
    books: { type: 'belongs_to', key: 'book_id' },
    reading_sessions: { type: 'has_many', foreignKey: 'user_book_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('book_id') bookId!: string;
  @field('server_book_id') serverBookId!: number | null;
  @text('status') status!: BookStatus;
  @field('rating') rating!: number | null;
  @field('current_page') currentPage!: number;
  @field('is_dnf') isDnf!: boolean;
  @text('dnf_reason') dnfReason!: string | null;
  @date('started_at') startedAt!: Date | null;
  @date('finished_at') finishedAt!: Date | null;
  @text('custom_cover_url') customCoverUrl!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('pending_cover_upload') pendingCoverUpload!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @relation('books', 'book_id') book!: Book;
  @children('reading_sessions') readingSessions!: Query<ReadingSession>;

  @writer async updateStatus(newStatus: BookStatus) {
    await this.update((record) => {
      record.status = newStatus;
      record.isPendingSync = true;
      record.updatedAt = new Date();

      if (newStatus === 'reading' && !record.startedAt) {
        record.startedAt = new Date();
      }
      if (newStatus === 'read' && !record.finishedAt) {
        record.finishedAt = new Date();
      }
      if (newStatus === 'dnf') {
        record.isDnf = true;
      }
    });
  }

  @writer async updateRating(newRating: number | null) {
    await this.update((record) => {
      record.rating = newRating;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async updateProgress(page: number) {
    await this.update((record) => {
      record.currentPage = page;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async setCustomCover(localPath: string) {
    await this.update((record) => {
      record.customCoverUrl = localPath;
      record.pendingCoverUpload = true;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async markSynced(serverId: number, serverBookId: number) {
    await this.update((record) => {
      record.serverId = serverId;
      record.serverBookId = serverBookId;
      record.isPendingSync = false;
    });
  }

  @writer async markCoverUploaded(cdnUrl: string) {
    await this.update((record) => {
      record.customCoverUrl = cdnUrl;
      record.pendingCoverUpload = false;
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
