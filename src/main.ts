import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import type { Entorno } from '@/common/config/env.validation';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { COOKIE_SESION } from '@/common/utils/cookie.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);

  // Todo cuelga de /api: Traefik deriva ese prefijo al back y el resto al front.
  app.setGlobalPrefix('api');
  // /api/v1/...: los controllers no escriben la versión, la pone defaultVersion.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  // whitelist + forbidNonWhitelisted: un campo que el DTO no declara es un 400;
  // transform: convierte los tipos (números de la query, por ejemplo).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (config.get('SWAGGER_HABILITADO', { infer: true })) {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Fleetier API')
        .setDescription(
          'API del backoffice de Fleetier. Toda ruta exige sesión salvo las marcadas como públicas.',
        )
        .setVersion('1')
        .addCookieAuth(COOKIE_SESION)
        .build(),
    );
    SwaggerModule.setup('api/docs', app, documento);
  }

  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
