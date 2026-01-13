import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  readonly,
  date,
  writer,
} from '@nozbe/watermelondb/decorators';

export type PreferenceCategory = 'author' | 'genre' | 'series';
export type PreferenceType = 'favorite' | 'exclude';

export class UserPreference extends Model {
  static table = 'user_preferences';

  @field('server_id') serverId!: number | null;
  @text('category') category!: PreferenceCategory;
  @text('type') type!: PreferenceType;
  @text('value') value!: string;
  @text('normalized') normalized!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

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
