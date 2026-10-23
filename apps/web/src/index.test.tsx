import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTestApp } from './testing.ts';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

describe('GET /', () => {
  let test: TestApp;

  beforeEach(async () => {
    test = await createTestApp();
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('renders the home page', async () => {
    // Arrange
    const path = '/';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      '<h1>Shelf: A catalogue of books, games and records</h1>',
    );
  });

  it('sends a content security policy', async () => {
    // Arrange
    const path = '/';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});
