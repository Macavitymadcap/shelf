import { describe, expect, it } from 'vite-plus/test';
import app from './index';

describe('GET /', () => {
  it('renders the home page', async () => {
    // Arrange
    const request = new Request('http://localhost/');

    // Act
    const response = await app.request(request);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<h1>Shelf</h1>');
  });
});
