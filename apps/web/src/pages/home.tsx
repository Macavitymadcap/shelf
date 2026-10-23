import type { SessionUser } from '@shelf/auth';
import { Layout } from '../layout.tsx';

export const HomePage = ({ user }: { user: SessionUser | null }) => (
  <Layout title="Shelf" user={user}>
    <h1>Shelf: A catalogue of books, games and records</h1>
  </Layout>
);
