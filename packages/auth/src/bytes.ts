const encoder = new TextEncoder();

export const utf8 = (text: string) => encoder.encode(text);

export const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

export const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

export const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (char) =>
    char.charCodeAt(0),
  );

export const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const constantTimeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  a.forEach((byte, index) => {
    difference |= byte ^ (b[index] ?? 0);
  });
  return difference === 0;
};
