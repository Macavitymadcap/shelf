import { Hono } from 'hono';
import { requireUser } from '@shelf/auth';
import type { AppEnv } from '../env.ts';
import { CreditRow } from '../components/organisms/credit-rows.tsx';
import { ManagePage } from '../pages/manage.tsx';
import { StyleguidePage } from '../pages/styleguide.tsx';
import { render, renderPart } from '../render.tsx';
import { copyRoutes } from './copies.tsx';
import { editionRoutes } from './editions.tsx';
import { asKind } from './kind.ts';
import { workEditionRoutes } from './work-editions.tsx';
import { workRoutes } from './works.tsx';

export const manageRoutes = new Hono<AppEnv>();

manageRoutes.use(requireUser);

manageRoutes.get('/', (context) => render(context, <ManagePage user={context.var.user!} />));

manageRoutes.get('/styleguide', (context) =>
  render(context, <StyleguidePage user={context.var.user!} />),
);

// One blank credit row, appended by the form's "Add a person" button.
manageRoutes.get('/credit-row', (context) => {
  const kind = asKind(context.req.query('kind'));
  if (!kind) return context.notFound();
  return renderPart(context, <CreditRow kind={kind} credit={{ name: '', role: '' }} />);
});

manageRoutes.route('/', workRoutes);
manageRoutes.route('/', workEditionRoutes);
manageRoutes.route('/', editionRoutes);
manageRoutes.route('/', copyRoutes);
