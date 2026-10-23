import type { SessionUser } from '@shelf/auth';
import { Layout } from '../layout.tsx';

export const ManagePage = ({ user }: { user: SessionUser }) => (
  <Layout title="Manage · Shelf" user={user}>
    <h1>Manage</h1>
    <p>Signed in as {user.displayName}.</p>
  </Layout>
);
