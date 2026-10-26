import { getEdition, getWork, type Db } from '@shelf/db';
import { toEditionView, toWorkView } from '../views/work.ts';

// A work's view after a change, for the fragment that shows it.
export const workView = async (db: Db, id: string) => {
  const work = await getWork(db, id);

  return work ? toWorkView(work) : null;
};

// One edition with its copies, read through its work so the copies come too.
export const editionView = async (db: Db, id: string) => {
  const edition = await getEdition(db, id);
  const work = edition && (await getWork(db, edition.workId));
  const found = work?.editions.find((candidate) => candidate.id === id);

  return found ? toEditionView(found) : null;
};
