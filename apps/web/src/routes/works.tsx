import { createWork, deleteWork, getWork, updateWork } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { FORM_DEFAULTS } from '../forms/defaults.ts';
import { readForm } from '../forms/form-data.ts';
import { parseNewWork } from '../forms/new-entry.ts';
import { parseWork, workValues } from '../forms/work.ts';
import { NewWorkForm, NewWorkPage } from '../pages/entry.tsx';
import { ChooseKindPage } from '../pages/manage.tsx';
import { WorkEditPart } from '../pages/work-forms.tsx';
import { WorkPart } from '../pages/work-parts.tsx';
import { render, renderPart } from '../render.tsx';
import { fresh, relocate, statusOf } from './entry.tsx';
import { asKind } from './kind.ts';
import { workView } from './load.ts';

export const workRoutes = new Hono<AppEnv>();

workRoutes.get('/add', (context) => {
  const user = context.var.user!;
  const kind = asKind(context.req.query('kind'));

  if (!kind) return render(context, <ChooseKindPage user={user} />);

  return render(
    context,
    <NewWorkPage user={user} kind={kind} state={fresh(FORM_DEFAULTS[kind])} />,
  );
});

workRoutes.post('/works', async (context) => {
  const kind = asKind(context.req.query('kind'));

  if (!kind) return context.notFound();

  const values = await readForm(context);
  const parsed = parseNewWork(values, kind);

  if (parsed.ok)
    return relocate(context, `/works/${await createWork(context.var.db, parsed.value)}`);

  const state = { values, errors: parsed.errors };

  return renderPart(context, <NewWorkForm kind={kind} state={state} />, 422);
});

workRoutes.get('/works/:id', async (context) => {
  const work = await workView(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  return renderPart(context, <WorkPart work={work} signedIn />);
});

workRoutes.get('/works/:id/edit', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  return renderPart(context, <WorkEditPart work={work} state={fresh(workValues(work))} />);
});

workRoutes.put('/works/:id', async (context) => {
  const work = await getWork(context.var.db, context.req.param('id'));

  if (!work) return context.notFound();

  const values = await readForm(context);
  const parsed = parseWork(values, work.kind);

  if (!parsed.ok) {
    const state = { values, errors: parsed.errors };
    return renderPart(context, <WorkEditPart work={work} state={state} />, statusOf(state.errors));
  }
  await updateWork(context.var.db, work.id, parsed.value);

  return renderPart(
    context,
    <WorkPart work={(await workView(context.var.db, work.id))!} signedIn />,
  );
});

workRoutes.delete('/works/:id', async (context) => {
  await deleteWork(context.var.db, context.req.param('id'));

  return relocate(context, '/manage');
});
