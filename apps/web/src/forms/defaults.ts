import { bookDefaults } from './book.ts';
import { gameDefaults } from './game.ts';
import { recordDefaults } from './record.ts';

// What a blank add form starts with, for each kind.
export const FORM_DEFAULTS = {
  book: bookDefaults,
  record: recordDefaults,
  board_game: gameDefaults,
};
