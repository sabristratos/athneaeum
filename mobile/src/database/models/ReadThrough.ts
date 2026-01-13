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
import type { UserBook } from '@/database/models/UserBook';
import type { ReadingSession } from '@/database/models/ReadingSession';

export class ReadThrough extends Model {
  static table = 'read_throughs';

  static associations: Associations = {
    user_books: { type: 'belongs_to', key: 'user_book_id' },
    reading_sessions: { type: 'has_many', foreignKey: 'read_through_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('user_book_id') userBookId!: string;
  @field('server_user_book_id') serverUserBookId!: number | null;
  @field('read_number') readNumber!: number;
  @text('status') status!: BookStatus;
  @field('rating') rating!: number | null;
  @text('review') review!: string | null;
  @field('is_dnf') isDnf!: boolean;
  @text('dnf_reason') dnfReason!: string | null;
  @date('started_at') startedAt!: Date | null;
  @date('finished_at') finishedAt!: Date | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @relation('user_books', 'user_book_id') userBook!: UserBook;
  @children('reading_sessions') readingSessions!: Query<ReadingSession>;

  @writer async updateStatus(newStatus: BookStatus) {
    await this.update((record) => {
      record.status = newStatus;
      record.isPendingSync = true;
      record.updatedAt = new Date();

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

  @writer async updateReview(newReview: string | null) {
    await this.update((record) => {
      record.review = newReview;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }

  @writer async markDnf(reason?: string) {
    await this.update((record) => {
      record.status = 'dnf';
      record.isDnf = true;
      record.dnfReason = reason ?? null;
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
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

  get isComplete(): boolean {
    return this.status === 'read';
  }

  get isActive(): boolean {
    return this.status === 'reading';
  }
}
