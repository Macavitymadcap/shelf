import type { FC } from 'hono/jsx';
import { Button } from '../atoms/button.tsx';
import { Notice } from '../atoms/notice.tsx';
import { Field } from '../molecules/field.tsx';
import { IndexCard } from './index-card.tsx';

type SignInFormProps = { next: string; username: string; error?: string };

export const SignInForm: FC<SignInFormProps> = ({ next, username, error }) => (
  <IndexCard level={1} corner="Staff only" title="Sign in">
    {error && <Notice tone="error">{error}</Notice>}
    <form class="sign-in-form" method="post" action="/login">
      <input type="hidden" name="next" value={next} />
      <Field
        class="sign-in-form__field"
        label="Username"
        name="username"
        value={username}
        autocomplete="username"
        required
      />
      <Field
        class="sign-in-form__field"
        label="Password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />
      <Button>Sign in</Button>
    </form>
  </IndexCard>
);
