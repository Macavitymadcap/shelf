import { createWork, getWork } from '@shelf/db';
import { watchmen } from '@shelf/db/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTestApp, send, signedIn } from '../testing.ts';

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const BOOK = {
  title: 'The Dispossessed',
  creditName: 'Ursula K. Le Guin',
  creditRole: 'author',
  genre: 'novel',
  binding: 'paperback',
  isbn13: '978-0-06-051275-0',
  location: 'Second shelf',
};

describe('adding, editing and deleting', () => {
  let test: TestApp;
  let headers: Record<string, string>;

  beforeEach(async () => {
    test = await createTestApp();
    headers = await signedIn(test);
  });

  afterEach(async () => {
    await test.dispose();
  });

  it('adds a book and sends htmx to its page', async () => {
    // Arrange
    const form = BOOK;

    // Act
    const response = await send(test, 'POST', '/manage/works?kind=book', headers, form);

    // Assert
    const location = response.headers.get('hx-location') ?? '';
    expect(response.status).toBe(200);
    expect(location).toMatch(/^\/works\//);
    expect(await (await test.request(location)).text()).toContain('9780060512750');
  });

  it('answers a bad form with 422 and only the form, keeping what was typed', async () => {
    // Arrange
    const form = { ...BOOK, title: '', isbn13: '12345' };

    // Act
    const response = await send(test, 'POST', '/manage/works?kind=book', headers, form);

    // Assert
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(html).not.toContain('<!doctype html>');
    expect(html).toContain('Enter the title.');
    expect(html).toContain('An ISBN-13 is 13 digits starting 978 or 979.');
    expect(html).toContain('value="Ursula K. Le Guin"');
  });

  it('puts an edited work and answers with its card', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const form = {
      title: 'Watchmen',
      subtitle: 'Absolute edition',
      creditName: 'Alan Moore',
      creditRole: 'writer',
    };

    // Act
    const response = await send(test, 'PUT', `/manage/works/${id}`, headers, form);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('id="work"');
    expect((await getWork(test.db, id))?.subtitle).toBe('Absolute edition');
  });

  it('adds a copy, then deletes it, answering with the edition card each time', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const edition = (await getWork(test.db, id))!.editions[0]!;
    const added = await send(test, 'POST', `/manage/editions/${edition.id}/copies`, headers, {
      location: 'Loft',
    });
    const copy = (await getWork(test.db, id))!.editions[0]!.copies[1]!;

    // Act
    const deleted = await send(test, 'DELETE', `/manage/copies/${copy.id}`, headers);

    // Assert
    expect(await added.text()).toContain('2 copies');
    expect(await deleted.text()).toContain('One copy');
  });

  it('deletes a work and sends htmx to /manage', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());

    // Act
    const response = await send(test, 'DELETE', `/manage/works/${id}`, headers);

    // Assert
    expect(response.headers.get('hx-location')).toBe('/manage');
    expect(await getWork(test.db, id)).toBeNull();
  });

  it('refuses a put from another site', async () => {
    // Arrange
    const id = await createWork(test.db, watchmen());
    const foreign = { ...headers, origin: 'https://evil.example' };

    // Act
    const response = await send(test, 'PUT', `/manage/works/${id}`, foreign, { title: 'Stolen' });

    // Assert
    expect(response.status).toBe(403);
  });

  it('sends a signed-out visitor to sign in and back to the add page', async () => {
    // Arrange
    const path = '/manage/add?kind=book';

    // Act
    const response = await test.request(path);

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login?next=%2Fmanage%2Fadd%3Fkind%3Dbook');
  });
});
