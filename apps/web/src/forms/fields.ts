import * as v from 'valibot';

// Every field arrives as a string, or not at all; blank optional fields become null.
const input = () => v.pipe(v.optional(v.string(), ''), v.trim());

const nullIfBlank = v.transform((text: string) => (text === '' ? null : text));

export const requiredText = (message: string) =>
  v.pipe(input(), v.nonEmpty(message), v.maxLength(300, 'Keep this under 300 characters.'));

export const optionalText = (max = 300) =>
  v.pipe(input(), v.maxLength(max, `Keep this under ${max} characters.`), nullIfBlank);

const whole = (min: number, max: number) =>
  v.pipe(
    v.string(),
    v.regex(/^\d+$/, 'Enter a whole number.'),
    v.transform(Number),
    v.minValue(min, `Enter ${min} or more.`),
    v.maxValue(max, `Enter ${max} or less.`),
  );

export const requiredWhole = (min: number, max: number, message: string) =>
  v.pipe(input(), v.nonEmpty(message), whole(min, max));

export const optionalWhole = (min: number, max: number) =>
  v.pipe(input(), nullIfBlank, v.nullable(whole(min, max)));

export const choice = <const Options extends readonly string[]>(
  options: Options,
  message: string,
) => v.pipe(input(), v.picklist(options, message));

export const optionalChoice = <const Options extends readonly string[]>(options: Options) =>
  v.pipe(input(), nullIfBlank, v.nullable(v.picklist(options, 'Choose one of the options.')));

// Spaces and hyphens are dropped first, so "978-0-930289-23-2" is accepted.
export const optionalCode = (pattern: RegExp, message: string) =>
  v.pipe(
    input(),
    v.transform((text) => text.replace(/[\s-]/g, '').toUpperCase()),
    nullIfBlank,
    v.nullable(v.pipe(v.string(), v.regex(pattern, message))),
  );

export const yesNo = () =>
  v.pipe(
    input(),
    v.picklist(['yes', 'no'], 'Choose yes or no.'),
    v.transform((answer) => answer === 'yes'),
  );

export const textOr = (fallback: string) =>
  v.pipe(
    input(),
    v.maxLength(100, 'Keep this under 100 characters.'),
    v.transform((text) => text || fallback),
  );

const isLanguageTag = (tag: string) => {
  try {
    return Intl.getCanonicalLocales(tag).length === 1;
  } catch {
    return false;
  }
};

// A BCP 47 tag such as en, la or grc; blank means English.
export const language = () =>
  v.pipe(textOr('en'), v.check(isLanguageTag, 'Enter a language code such as en, la or grc.'));

export const isoDate = () =>
  v.pipe(input(), nullIfBlank, v.nullable(v.pipe(v.string(), v.isoDate('Enter a date.'))));
