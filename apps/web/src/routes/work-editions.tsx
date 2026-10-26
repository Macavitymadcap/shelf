import { addEdition, getWork } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { FORM_DEFAULTS } from '../forms/defaults.ts';
import { readForm } from '../forms/form-data.ts';
import { parseNewEdition } from '../forms/new-entry.ts';
import { NewEditionForm } from '../pages/work-forms.tsx';
import { EditionsPart } from '../pages/work-parts.tsx';
import { renderPart } from '../render.tsx';
import { fresh } from './entry.tsx';
import { workView } from './load.ts';

// A work's editions as one region, #editions, which adding an edition replaces.
export const workEditionRoutes = new Hono<AppEnv>();

workEditionRoutes.get('/works/:id/editions', async (context) => {
  const work = await workView(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  return renderPart(context, <EditionsPart work={work} signedIn />);
});

workEditionRoutes.get('/works/:id/editions/new', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  const form = <NewEditionForm work={work} state={fresh(FORM_DEFAULTS[work.kind])} />;

  return renderPart(
    context,
    <EditionsPart work={(await workView(context.var.db, work.id))!} signedIn adding={form} />,
  );
});

workEditionRoutes.post('/works/:id/editions', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  const values = await readForm(context);
  const parsed = parseNewEdition(values, work.kind);

  if (parsed.ok) await addEdition(context.var.db, work.id, parsed.value.edition, parsed.value.copy);

  const form = parsed.ok ? undefined : (
    <NewEditionForm work={work} state={{ values, errors: parsed.errors }} />
  );
  const view = (await workView(context.var.db, work.id))!;

  return renderPart(
    context,
    <EditionsPart work={view} signedIn adding={form} />,
    parsed.ok ? 200 : 422,
  );
});
