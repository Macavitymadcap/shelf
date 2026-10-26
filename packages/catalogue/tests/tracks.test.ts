import { describe, expect, it } from 'vite-plus/test';
import { formatTracklist, parseTracklist } from '../src/index.ts';

describe('parseTracklist', () => {
  it('splits a side and position and reads a duration', () => {
    // Arrange
    const text = 'A1 The Rainbow 9:06\nB2. Wealth';

    // Act
    const { tracks, errors } = parseTracklist(text);

    // Assert
    expect(errors).toEqual([]);
    expect(tracks).toEqual([
      { side: 'A', position: 1, title: 'The Rainbow', durationSeconds: 546 },
      { side: 'B', position: 2, title: 'Wealth', durationSeconds: null },
    ]);
  });

  it('puts a numbered-only track on side A and skips blank lines', () => {
    // Arrange
    const text = '\n3 Inheritance\n\n';

    // Act
    const { tracks } = parseTracklist(text);

    // Assert
    expect(tracks).toEqual([
      { side: 'A', position: 3, title: 'Inheritance', durationSeconds: null },
    ]);
  });

  it('reports a line without a position', () => {
    // Arrange
    const text = 'A1 Desire\nI Believe in You';

    // Act
    const { errors } = parseTracklist(text);

    // Assert
    expect(errors).toEqual(['Line 2 needs a position and a title, as in "A1 Title".']);
  });
});

describe('formatTracklist', () => {
  it('writes tracks back in the form they are typed', () => {
    // Arrange
    const text = 'A1 The Rainbow 9:06\nB2 Wealth';

    // Act
    const formatted = formatTracklist(parseTracklist(text).tracks);

    // Assert
    expect(formatted).toBe(text);
  });
});
