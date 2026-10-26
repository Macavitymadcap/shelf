import { createWork } from '@shelf/db';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTestApp, signedIn } from '../testing.ts';
import { watchmen } from '@shelf/db/testing';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

describe('the public catalogue', () => {
  let test: TestApp;

  beforeEach(async () => {
    test = await createTestApp();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('lists a saved work on the home page', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const html = await (await test.request('/')).text();

    // Assert
    expect(html).toContain('Watchmen');
    expect(html).toContain('1</span> Books');
  });

  it('answers a live search with only the results', async () => {
    // Arrange
    await createWork(test.db, watchmen());
    const headers = { 'HX-Request': 'true', 'HX-Request-Type': 'partial' };

    // Act
    const response = await test.request('/search?q=gibb', { headers });

    // Assert
    const html = await response.text();
    expect(html).toContain('Watchmen');
    expect(html).not.toContain('<!doctype html>');
    expect(response.headers.get('vary')).toContain('HX-Request-Type');
  });

  it('shows the whole search page to a plain request', async () => {
    // Arrange
    await createWork(test.db, watchmen());

    // Act
    const html = await (await test.request('/search?q=watch')).text();

    // Assert
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Watchmen');
  });

  it('shows editing controls on a work only when signed in', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const headers = await signedIn(test);

    // Act
    const visitor = await (await test.request(`/works/${id}`)).text();
    const editor = await (await test.request(`/works/${id}`, { headers })).text();

    // Assert
    expect(visitor).toContain('Alan Moore');
    expect(visitor).not.toContain('Edit work');
    expect(editor).toContain('Edit work');
  });

  it('answers an unknown work with a 404 page', async () => {
    // Arrange
    const path = '/works/missing';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Not on the shelf');
  });

  it('stamps the response nonce on every htmx element', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const headers = await signedIn(test);

    // Act
    const response = await test.request(`/works/${id}`, { headers });

    // Assert
    const policy = response.headers.get('content-security-policy') ?? '';
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
    const tags = (await response.text()).match(/<[a-z]+ [^>]*\shx-[a-z]+[^>]*>/g) ?? [];

    expect(tags.length).toBeGreaterThan(5);

    for (const tag of tags) expect(tag).toContain(`hx-nonce="${nonce}"`);
  });
});
