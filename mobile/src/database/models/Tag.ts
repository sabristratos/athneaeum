import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  writer,
} from '@nozbe/watermelondb/decorators';

export class Tag extends Model {
  static table = 'tags';

  @field('server_id') serverId!: number | null;
  @text('name') name!: string;
  @text('color') color!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

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
