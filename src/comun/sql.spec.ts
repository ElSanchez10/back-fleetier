import { patron } from './sql.js';

describe('patron', () => {
  it('sin texto deja pasar todo', () => {
    expect(patron()).toBe('%');
    expect(patron('')).toBe('%');
  });

  it('busca el texto en cualquier parte', () => {
    expect(patron('cool')).toBe('%cool%');
  });

  it('toma literales los comodines que escriba el usuario', () => {
    expect(patron('100%_a\\')).toBe('%100\\%\\_a\\\\%');
  });
});
