import { describe, expect, it } from 'vite-plus/test';
import { sortName, sortTitle } from '../src/index.ts';

describe('sortTitle', () => {
  it('drops a leading article and lower-cases', () => {
    // Arrange
    const title = '  The   Dispossessed ';

    // Act
    const sorted = sortTitle(title);

    // Assert
    expect(sorted).toBe('dispossessed');
  });

  it('keeps an article that is part of a word', () => {
    // Arrange
    const title = 'Anansi Boys';

    // Act
    const sorted = sortTitle(title);

    // Assert
    expect(sorted).toBe('anansi boys');
  });
});

describe('sortName', () => {
  it('puts the last word first', () => {
    // Arrange
    const name = 'Alan Moore';

    // Act
    const sorted = sortName(name);

    // Assert
    expect(sorted).toBe('moore, alan');
  });

  it('keeps a name typed surname first', () => {
    // Arrange
    const name = 'Le Guin, Ursula K.';

    // Act
    const sorted = sortName(name);

    // Assert
    expect(sorted).toBe('le guin, ursula k.');
  });

  it('drops a leading "The" from a band', () => {
    // Arrange
    const name = 'The Specials';

    // Act
    const sorted = sortName(name);

    // Assert
    expect(sorted).toBe('specials');
  });
});
