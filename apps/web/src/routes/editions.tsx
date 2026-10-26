import { deleteEdition, getEdition, updateEdition } from '@shelf/db';
import { Hono } from 'hono';
import type { AppEnv } from '../env.ts';
import { editionValues, parseEdition } from '../forms/edition.ts';
import { readForm } from '../forms/form-data.ts';
import { EditionPart } from '../pages/edition-part.tsx';
import { EditionEditPart } from '../pages/work-forms.tsx';
import { renderPart } from '../render.tsx';
import { fresh } from './entry.tsx';
import { editionView } from './load.ts';

export const editionRoutes = new Hono<AppEnv>();

editionRoutes.get('/editions/:id', async (context) => {
  const edition = await editionView(context.var.db, context.req.param('id'));

  if (!edition) return context.notFound();

  return renderPart(context, <EditionPart edition={edition} signedIn />);
});

editionRoutes.get('/editions/:id/edit', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));

  if (!edition) return context.notFound();

  return renderPart(
    context,
    <EditionEditPart edition={edition} state={fresh(editionValues(edition))} />,
  );
});

editionRoutes.put('/editions/:id', async (context) => {
  const edition = await getEdition(context.var.db, context.req.param('id'));

  if (!edition) return context.notFound();

  const values = await readForm(context);
  const parsed = parseEdition(values, edition.kind);

  if (!parsed.ok) {
    const state = { values, errors: parsed.errors };
    return renderPart(context, <EditionEditPart edition={edition} state={state} />, 422);
  }

  await updateEdition(context.var.db, edition.id, parsed.value);

  return renderPart(
    context,
    <EditionPart edition={(await editionView(context.var.db, edition.id))!} signedIn />,
  );
});

// Answers 200 with nothing; the button's hx-swap="delete" removes the card.
editionRoutes.delete('/editions/:id', async (context) => {
  await deleteEdition(context.var.db, context.req.param('id'));

  return context.body(null, 200);
});
