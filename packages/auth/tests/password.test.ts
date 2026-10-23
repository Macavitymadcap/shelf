import { describe, expect, it } from 'vite-plus/test';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../src/password.ts';

const PEPPER = 'test-pepper';

describe('password hashing', () => {
  it('verifies the password it hashed', async () => {
    // Arrange
    const stored = await hashPassword('correct horse battery staple', PEPPER, 1_000);

    // Act
    const valid = await verifyPassword(stored, 'correct horse battery staple', PEPPER);

    // Assert
    expect(valid).toBe(true);
  });

  it('rejects a wrong password', async () => {
    // Arrange
    const stored = await hashPassword('correct horse battery staple', PEPPER, 1_000);

    // Act
    const valid = await verifyPassword(stored, 'incorrect horse', PEPPER);

    // Assert
    expect(valid).toBe(false);
  });

  it('rejects the right password with a different pepper', async () => {
    // Arrange
    const stored = await hashPassword('correct horse battery staple', PEPPER, 1_000);

    // Act
    const valid = await verifyPassword(stored, 'correct horse battery staple', 'other');

    // Assert
    expect(valid).toBe(false);
  });

  it('never matches the dummy hash', async () => {
    // Arrange
    const password = '';

    // Act
    const valid = await verifyPassword(DUMMY_HASH, password, PEPPER);

    // Assert
    expect(valid).toBe(false);
  });
});
