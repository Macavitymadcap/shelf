import type { Kind } from '@shelf/catalogue';

export const KIND_LABELS = { book: 'Book', record: 'Record', board_game: 'Game' } as const;

export const KIND_PLURALS: Record<Kind, string> = {
  book: 'Books',
  record: 'Records',
  board_game: 'Games',
};

// "graphic novel" becomes "Graphic novel" for display; stored values stay lower-case.
export const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const languages = new Intl.DisplayNames(['en-GB'], { type: 'language' });

export const languageName = (tag: string) => languages.of(tag) ?? tag;
