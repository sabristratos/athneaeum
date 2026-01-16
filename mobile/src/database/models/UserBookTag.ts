import { Model, type Relation } from '@nozbe/watermelondb';
import { date, field, text, immutableRelation } from '@nozbe/watermelondb/decorators';
import type { Associations } from '@nozbe/watermelondb/Model';
import type { UserBook } from '@/database/models/UserBook';
import type { Tag } from '@/database/models/Tag';

export class UserBookTag extends Model {
  static table = 'user_book_tags';

  static associations: Associations = {
    user_books: { type: 'belongs_to', key: 'user_book_id' },
    tags: { type: 'belongs_to', key: 'tag_id' },
  };

  @text('user_book_id') userBookId!: string;
  @text('tag_id') tagId!: string;
  @field('server_user_book_id') serverUserBookId!: number | null;
  @field('server_tag_id') serverTagId!: number | null;
  @date('updated_at') updatedAt!: Date;
  @field('is_pending_sync') isPendingSync!: boolean;
  @field('is_deleted') isDeleted!: boolean;

  @immutableRelation('user_books', 'user_book_id') userBook!: Relation<UserBook>;
  @immutableRelation('tags', 'tag_id') tag!: Relation<Tag>;
}
