import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Child } from 'hono/jsx';
import type { AppEnv } from './env';
import { NonceContext } from './nonce';

type Options = { fragment?: Child; status?: ContentfulStatusCode };

// htmx sends HX-Request-Type: partial when it swaps one region, anything else,
// including a boosted link, gets the whole page.
export const render = (context: Context<AppEnv>, page: Child, options: Options = {}) => {
  const partial = options.fragment && context.req.header('HX-Request-Type') === 'partial';

  context.header('Vary', 'HX-Request-Type');

  return renderPart(context, partial ? options.fragment : page, options.status);
};

export const renderPart = (
  context: Context<AppEnv>,
  part: Child,
  status: ContentfulStatusCode = 200,
) =>
  context.html(
    <NonceContext.Provider value={context.get('secureHeadersNonce') ?? ''}>
      {part}
    </NonceContext.Provider>,
    status,
  );
