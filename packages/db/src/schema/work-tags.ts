import {
  index,
  primaryKey,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { works } from './works.ts';
import { tags } from './tags.ts';

export const workTags = sqliteTable(
  'work_tags',
  {
    workId: text()
      .notNull()
      .references((): AnySQLiteColumn => works.id, { onDelete: 'cascade' }),
    tagId: text()
      .notNull()
      .references((): AnySQLiteColumn => tags.id, { onDelete: 'cascade' }),
  },
  (workTag) => [
    primaryKey({ columns: [workTag.workId, workTag.tagId] }),
    index('work_tags_tag_id').on(workTag.tagId),
  ],
);
