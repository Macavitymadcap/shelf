import { constantTimeEqual, fromBase64Url, randomBytes, toBase64Url, utf8 } from './bytes.ts';

const ALGORITHM = 'pbkdf2_sha256';

export const ITERATIONS = 50_000;

export const MIN_PASSWORD_LENGTH = 16;

export const DUMMY_HASH = [ALGORITHM, ITERATIONS, 'A'.repeat(22), 'A'.repeat(43)].join('$');

const pepper = async (password: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(password)));
};

type Bytes = Uint8Array<ArrayBuffer>;

const derive = async (input: Bytes, salt: Bytes, iterations: number) => {
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  const params = { name: 'PBKDF2', hash: 'SHA-256', salt, iterations };

  return new Uint8Array(await crypto.subtle.deriveBits(params, key, 256));
};

export const hashPassword = async (password: string, secret: string, iterations = ITERATIONS) => {
  const salt = randomBytes(16);
  const hash = await derive(await pepper(password, secret), salt, iterations);

  return [ALGORITHM, iterations, toBase64Url(salt), toBase64Url(hash)].join('$');
};

export const verifyPassword = async (stored: string, password: string, secret: string) => {
  const [algorithm, iterations, salt, hash] = stored.split('$');
  if (algorithm !== ALGORITHM || !iterations || !salt || !hash) return false;
  const input = await pepper(password, secret);
  const actual = await derive(input, fromBase64Url(salt), Number(iterations));

  return constantTimeEqual(actual, fromBase64Url(hash));
};
