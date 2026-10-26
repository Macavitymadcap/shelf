import { countByKind, getPerson, getWork, listRecent, searchWorks } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { HomePage } from '../pages/home.tsx';
import { PersonPage } from '../pages/person.tsx';
import { SearchPage, SearchResults } from '../pages/search.tsx';
import { WorkPage } from '../pages/work.tsx';
import { render } from '../render.tsx';
import type { Detail } from '../components/molecules/detail-list.tsx';
import { sentence } from '../views/labels.ts';
import { toItemSummary } from '../views/summary.ts';
import { toWorkView } from '../views/work.ts';
import { asKind } from './kind.ts';

export const catalogueRoutes = new Hono<AppEnv>();

catalogueRoutes.get('/', async (context) => {
  const [counts, recent] = await Promise.all([
    countByKind(context.var.db),
    listRecent(context.var.db),
  ]);

  const page = (
    <HomePage user={context.var.user} counts={counts} recent={recent.map(toItemSummary)} />
  );

  return render(context, page);
});

catalogueRoutes.get('/search', async (context) => {
  const text = (context.req.query('q') ?? '').trim();
  const kind = asKind(context.req.query('kind'));
  const results = (await searchWorks(context.var.db, { text, kind })).map(toItemSummary);
  const props = { text, kind, results };

  return render(context, <SearchPage {...props} user={context.var.user} />, {
    fragment: <SearchResults {...props} />,
  });
});

catalogueRoutes.get('/works/:id', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  return render(context, <WorkPage user={context.var.user} work={toWorkView(work)} />);
});

catalogueRoutes.get('/people/:id', async (context) => {
  const person = await getPerson(context.var.db, context.req.param('id'));

  if (!person) return context.notFound();

  const works = person.works.map((work) => {
    const item = toItemSummary(work);
    return { ...item, details: [['Role', sentence(work.role)] as Detail, ...item.details] };
  });

  return render(context, <PersonPage user={context.var.user} name={person.name} works={works} />);
});
