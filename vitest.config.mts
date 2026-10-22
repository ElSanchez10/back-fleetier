import swc from 'unplugin-swc';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // swc en vez de esbuild: emite la metadata de los decoradores, que Nest
  // necesita para inyectar dependencias en Test.createTestingModule.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Las pruebas no dependen de la zona horaria del equipo.
    env: { TZ: 'UTC' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Fuera: el arranque, el armado de módulos, los tipos y los
      // repositorios (su SQL se prueba con la app corriendo, no con mocks).
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.interface.ts',
        'src/**/*.repository.ts',
        'src/**/repositories/*.sql.ts',
        'src/common/database/database.service.ts',
        'src/common/testing/**',
        'src/**/*.spec.ts',
      ],
      // Bajo el 80 % de líneas, `npm run test:cov` falla (y el pipeline se detiene).
      thresholds: { lines: 80 },
    },
  },
});
