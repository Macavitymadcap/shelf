import { Layout } from '../layout.tsx';

const MESSAGES = {
  invalid: 'Incorrect username or password.',
  locked: 'Too many failed attempts. Try again in 15 minutes.',
};

type LoginPageProps = { next: string; username?: string; error?: keyof typeof MESSAGES };

export const LoginPage = ({ next, username = '', error }: LoginPageProps) => (
  <Layout title="Sign in · Shelf" user={null}>
    <h1>Sign in</h1>
    {error && <p role="alert">{MESSAGES[error]}</p>}
    <form method="post" action="/login">
      <input type="hidden" name="next" value={next} />
      <label>
        Username
        <input name="username" value={username} autocomplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Sign in</button>
    </form>
  </Layout>
);
