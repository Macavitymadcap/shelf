import { KINDS, type Kind } from '@shelf/catalogue';

export const asKind = (value: string | undefined): Kind | undefined =>
  KINDS.find((kind) => kind === value);
