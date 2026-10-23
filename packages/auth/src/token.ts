import { randomBytes, toBase64Url, toHex, utf8 } from './bytes.ts';

export const newToken = () => toBase64Url(randomBytes(32));

export const hashToken = async (token: string) =>
  toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(token))));
