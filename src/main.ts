import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ErrorBdFilter } from './comun/error-bd.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Todo cuelga de /api: Traefik deriva ese prefijo al back y el resto al front.
  app.setGlobalPrefix('api');
  // whitelist: descarta campos que el DTO no declara; transform: convierte tipos.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ErrorBdFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
