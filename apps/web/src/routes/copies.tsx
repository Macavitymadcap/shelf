import { addCopy, deleteCopy, getCopy, getEdition, updateCopy } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { copyValues, parseCopy } from '../forms/copy.ts';
import { FORM_DEFAULTS } from '../forms/defaults.ts';
import { readForm } from '../forms/form-data.ts';
import { CopyPart } from '../pages/copy-part.tsx';
import { EditionPart } from '../pages/edition-part.tsx';
import { CopyEditPart, NewCopyForm } from '../pages/copy-forms.tsx';
import { renderPart } from '../render.tsx';
import { toCopyView } from '../views/work.ts';
import { fresh } from './entry.tsx';
import { editionView } from './load.ts';

export const copyRoutes = new Hono<AppEnv>();

// Adding a copy swaps the whole edition card, so its copy count updates too.
copyRoutes.get('/editions/:id/copies/new', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));

  if (!edition) return context.notFound();

  const form = <NewCopyForm edition={edition} state={fresh(FORM_DEFAULTS[edition.kind])} />;
  const view = (await editionView(context.var.db, edition.id))!;

  return renderPart(context, <EditionPart edition={view} signedIn adding={form} />);
});

copyRoutes.post('/editions/:id/copies', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));

  if (!edition) return context.notFound();

  const values = await readForm(context);
  const parsed = parseCopy(values, edition.kind);

  if (parsed.ok) await addCopy(context.var.db, edition.id, parsed.value);

  const form = parsed.ok ? undefined : (
    <NewCopyForm edition={edition} state={{ values, errors: parsed.errors }} />
  );
  const view = (await editionView(context.var.db, edition.id))!;

  return renderPart(
    context,
    <EditionPart edition={view} signedIn adding={form} />,
    parsed.ok ? 200 : 422,
  );
});

copyRoutes.get('/copies/:id', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));

  if (!copy) return context.notFound();

  return renderPart(
    context,
    <CopyPart copy={toCopyView(copy)} editionId={copy.editionId} signedIn />,
  );
});

copyRoutes.get('/copies/:id/edit', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));

  if (!copy) return context.notFound();

  return renderPart(context, <CopyEditPart copy={copy} state={fresh(copyValues(copy))} />);
});

copyRoutes.put('/copies/:id', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));

  if (!copy) return context.notFound();

  const values = await readForm(context);
  const parsed = parseCopy(values, copy.kind);

  if (!parsed.ok) {
    const state = { values, errors: parsed.errors };
    return renderPart(context, <CopyEditPart copy={copy} state={state} />, 422);
  }

  await updateCopy(context.var.db, copy.id, parsed.value);
  const saved = (await getCopy(context.var.db, copy.id))!;

  return renderPart(
    context,
    <CopyPart copy={toCopyView(saved)} editionId={copy.editionId} signedIn />,
  );
});

// Answers with the edition card, whose copy count has dropped by one.
copyRoutes.delete('/copies/:id', async (context) => {
  const copy = await getCopy(context.var.db, context.req.param('id'));

  if (!copy) return context.notFound();

  await deleteCopy(context.var.db, copy.id);

  const view = (await editionView(context.var.db, copy.editionId))!;

  return renderPart(context, <EditionPart edition={view} signedIn />);
});
