import * as v from 'valibot';
import { language, optionalText, optionalWhole, requiredWhole, yesNo } from './fields.ts';
import type { FieldSpec } from './spec.ts';

const number = { type: 'number', inputmode: 'numeric' } as const;

export const gameEditionFields: FieldSpec[] = [
  { name: 'minPlayers', label: 'Fewest players', ...number, required: true },
  { name: 'maxPlayers', label: 'Most players', ...number, required: true },
  { name: 'playMinutes', label: 'Playing time (minutes)', ...number, required: true },
  { name: 'minAge', label: 'Minimum age', ...number },
  { name: 'language', label: 'Language', hint: 'A language code: en, de, fr.' },
];

export const gameEditionSchema = v.pipe(
  v.object({
    minPlayers: requiredWhole(1, 100, 'Enter the fewest players.'),
    maxPlayers: requiredWhole(1, 100, 'Enter the most players.'),
    playMinutes: requiredWhole(1, 10000, 'Enter the playing time.'),
    minAge: optionalWhole(0, 99),
    language: language(),
  }),
  v.forward(
    v.check((game) => game.maxPlayers >= game.minPlayers, 'Enter at least the fewest players.'),
    ['maxPlayers'],
  ),
);

const yesOrNo = ['yes', 'no'] as const;

export const gameCopyFields: FieldSpec[] = [
  { name: 'complete', label: 'Complete', control: 'select', options: yesOrNo, required: true },
  { name: 'sleeved', label: 'Cards sleeved', control: 'select', options: yesOrNo, required: true },
  { name: 'missingNotes', label: 'What is missing', control: 'textarea' },
];

export const gameCopySchema = v.object({
  complete: yesNo(),
  sleeved: yesNo(),
  missingNotes: optionalText(1000),
});

export const gameDefaults = { language: 'en', complete: 'yes', sleeved: 'no' };
