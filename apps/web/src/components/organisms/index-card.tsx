import type { Child, FC, PropsWithChildren } from 'hono/jsx';
import { joinClassNames } from '../join-class-names.ts';

type IndexCardProps = PropsWithChildren<{
  title: Child;
  corner?: string;
  byline?: string;
  level?: 1 | 2;
  class?: string;
}>;

export const IndexCard: FC<IndexCardProps> = (props) => {
  const { title, corner, byline, level = 2, children } = props;
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <article class={joinClassNames('index-card', props.class)}>
      {corner && <p class="index-card__corner">{corner}</p>}
      <header class="index-card__header">
        {byline && <p>{byline}</p>}
        <Heading class="index-card__title">{title}</Heading>
      </header>
      {children}
    </article>
  );
};
