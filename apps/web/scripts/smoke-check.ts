export const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
export const USERNAME = 'smoke';
export const DISPLAY_NAME = 'Smoke Test';
export const PASSWORD = 'smoke-test-password-123';

const get = (path: string, cookie = '') =>
  fetch(BASE + path, { redirect: 'manual', headers: cookie ? { cookie } : {} });

const post = (path: string, body: Record<string, string>, cookie = '') =>
  fetch(BASE + path, {
    method: 'POST',
    redirect: 'manual',
    body: new URLSearchParams(body),
    headers: cookie ? { origin: BASE, cookie } : { origin: BASE },
  });

const signIn = (password: string) =>
  post('/login', { username: USERNAME, password, next: '/manage' });

const cookieFrom = (response: Response) =>
  (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

const state = { cookie: '' };

export const checks: [string, () => Promise<boolean>][] = [
  [
    'home page shows "Sign in"',
    async () => {
      const response = await get('/');
      return response.status === 200 && (await response.text()).includes('href="/login"');
    },
  ],
  [
    '/manage redirects a signed-out visitor to sign in',
    async () => {
      const response = await get('/manage');
      return (
        response.status === 303 && response.headers.get('location') === '/login?next=%2Fmanage'
      );
    },
  ],
  [
    'a wrong password is refused and keeps the username',
    async () => {
      const response = await signIn('wrong-password');
      const html = await response.text();
      return (
        response.status === 401 &&
        html.includes('Incorrect username or password.') &&
        html.includes(`value="${USERNAME}"`)
      );
    },
  ],
  [
    'the right password signs in and shows /manage',
    async () => {
      const response = await signIn(PASSWORD);
      const cookie = response.headers.get('set-cookie') ?? '';
      state.cookie = cookieFrom(response);
      const manage = await (await get('/manage', state.cookie)).text();
      return (
        response.status === 303 &&
        /^__Host-session=.+HttpOnly; Secure/.test(cookie) &&
        manage.includes(`Signed in as ${DISPLAY_NAME}.`) &&
        manage.includes('Sign out')
      );
    },
  ],
  [
    'signing out ends the session',
    async () => {
      const response = await post('/logout', {}, state.cookie);
      const manage = await get('/manage', state.cookie);
      return (
        response.status === 303 && response.headers.get('location') === '/' && manage.status === 303
      );
    },
  ],
];
