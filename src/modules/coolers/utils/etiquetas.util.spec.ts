import { armarEtiquetas, barrasSvg } from './etiquetas.util';

describe('etiquetas', () => {
  it('el código de barras es un SVG', () => {
    const svg = barrasSvg('37681389');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('</svg>');
  });

  it('las etiquetas son un PDF, una o muchas', async () => {
    for (const cantidad of [1, 25]) {
      const pdf = await armarEtiquetas(
        Array.from({ length: cantidad }, (_, i) => ({
          nombre: String(i + 1),
          codigo: String(10000000 + i),
        })),
      );
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    }
  });
});
