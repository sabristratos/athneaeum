import { Model } from '@nozbe/watermelondb';
import { field, text, writer } from '@nozbe/watermelondb/decorators';

export class SyncMetadata extends Model {
  static table = 'sync_metadata';

  @text('key') key!: string;
  @field('last_pulled_at') lastPulledAt!: number;
  @field('last_pushed_at') lastPushedAt!: number;

  @writer async updatePulledAt(timestamp: number) {
    await this.update((record) => {
      record.lastPulledAt = timestamp;
    });
  }

  @writer async updatePushedAt(timestamp: number) {
    await this.update((record) => {
      record.lastPushedAt = timestamp;
    });
  }
}
