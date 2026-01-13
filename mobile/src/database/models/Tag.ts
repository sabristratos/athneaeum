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
  @text('slug') slug!: string;
  @text('color') color!: string;
  @field('is_system') isSystem!: boolean;
  @field('sort_order') sortOrder!: number;
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

  @writer async updateTag(data: { name?: string; slug?: string; color?: string; sortOrder?: number }) {
    await this.update((record) => {
      if (data.name !== undefined) {
        record.name = data.name;
      }
      if (data.slug !== undefined) {
        record.slug = data.slug;
      } else if (data.name !== undefined) {
        record.slug = data.name.toLowerCase().replace(/\s+/g, '-');
      }
      if (data.color !== undefined) {
        record.color = data.color;
      }
      if (data.sortOrder !== undefined) {
        record.sortOrder = data.sortOrder;
      }
      record.isPendingSync = true;
      record.updatedAt = new Date();
    });
  }
}
