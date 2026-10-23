import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { addUser, createTestApp, loginForm, ORIGIN, PASSWORD } from '../testing.ts';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const signIn = (test: TestApp, password = PASSWORD, origin = ORIGIN) =>
  test.request('/login', { method: 'POST', body: loginForm('Dan', password), headers: { origin } });

const sessionCookie = (response: Response) =>
  (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

describe('authentication', () => {
  let test: TestApp;

  beforeEach(async () => {
    test = await createTestApp();
    await addUser(test);
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('redirects a signed-out visitor from /manage to the login page', async () => {
    // Arrange
    const path = '/manage';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login?next=%2Fmanage');
  });

  it('tells htmx to redirect instead of following a redirect', async () => {
    // Arrange
    const headers = { 'HX-Request': 'true' };

    // Act
    const response = await test.request('/manage', { headers });

    // Assert
    expect(response.status).toBe(401);
    expect(response.headers.get('hx-redirect')).toBe('/login?next=%2Fmanage');
  });

  it('signs in with a secure session cookie', async () => {
    // Arrange
    const password = PASSWORD;

    // Act
    const response = await signIn(test, password);

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/manage');
    expect(response.headers.get('set-cookie')).toMatch(
      /^__Host-session=.+HttpOnly; Secure; SameSite=Lax/,
    );
  });

  it('shows the manage page to a signed-in user', async () => {
    // Arrange
    const cookie = sessionCookie(await signIn(test));

    // Act
    const response = await test.request('/manage', { headers: { cookie } });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Signed in as Dan.');
  });

  it('rejects a wrong password without a cookie', async () => {
    // Arrange
    const password = 'wrong';

    // Act
    const response = await signIn(test, password);

    // Assert
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a sign-in posted from another site', async () => {
    // Arrange
    const origin = 'https://evil.example';

    // Act
    const response = await signIn(test, PASSWORD, origin);

    // Assert
    expect(response.status).toBe(403);
  });

  it('ends the session on sign out', async () => {
    // Arrange
    const cookie = sessionCookie(await signIn(test));
    await test.request('/logout', { method: 'POST', headers: { cookie, origin: ORIGIN } });

    // Act
    const response = await test.request('/manage', { headers: { cookie } });

    // Assert
    expect(response.status).toBe(303);
  });
});
