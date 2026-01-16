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
import type { ReadThrough } from '@/database/models/ReadThrough';
import { secondsToDuration } from '@/utils/dateUtils';

export class ReadingSession extends Model {
  static table = 'reading_sessions';

  static associations: Associations = {
    user_books: { type: 'belongs_to', key: 'user_book_id' },
    read_throughs: { type: 'belongs_to', key: 'read_through_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('user_book_id') userBookId!: string;
  @field('server_user_book_id') serverUserBookId!: number | null;
  @text('read_through_id') readThroughId!: string | null;
  @field('server_read_through_id') serverReadThroughId!: number | null;
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
  @relation('read_throughs', 'read_through_id') readThrough!: ReadThrough | null;

  get formattedDuration(): string | null {
    if (!this.durationSeconds) return null;
    const { hours, minutes } = secondsToDuration(this.durationSeconds);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  @writer async markSynced(
    serverId: number,
    serverUserBookId: number,
    serverReadThroughId?: number | null
  ) {
    await this.update((record) => {
      record.serverId = serverId;
      record.serverUserBookId = serverUserBookId;
      if (serverReadThroughId !== undefined) {
        record.serverReadThroughId = serverReadThroughId;
      }
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

  @writer async updateSession(data: {
    date?: string;
    startPage?: number;
    endPage?: number;
    durationSeconds?: number | null;
    notes?: string | null;
  }) {
    await this.update((record) => {
      if (data.date !== undefined) {
        record.sessionDate = data.date;
      }
      if (data.startPage !== undefined) {
        record.startPage = data.startPage;
      }
      if (data.endPage !== undefined) {
        record.endPage = data.endPage;
        if (data.startPage !== undefined) {
          record.pagesRead = data.endPage - data.startPage;
        } else {
          record.pagesRead = data.endPage - record.startPage;
        }
      }
      if (data.durationSeconds !== undefined) {
        record.durationSeconds = data.durationSeconds;
      }
      if (data.notes !== undefined) {
        record.notes = data.notes;
      }
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }
}
