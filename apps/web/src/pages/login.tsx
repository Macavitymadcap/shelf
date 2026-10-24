import { SignInForm } from '../components/organisms/sign-in-form.tsx';
import { Page } from '../components/templates/page.tsx';

const MESSAGES = {
  invalid: 'Incorrect username or password.',
  locked: 'Too many failed attempts. Try again in 15 minutes.',
};

type LoginPageProps = { next: string; username?: string; error?: keyof typeof MESSAGES };

export const LoginPage = ({ next, username = '', error }: LoginPageProps) => (
  <Page title="Sign in to Shelf" user={null}>
    <SignInForm next={next} username={username} error={error && MESSAGES[error]} />
  </Page>
);
