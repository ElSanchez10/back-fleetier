import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validarEntorno } from '@/common/config/env.validation';
import { DatabaseModule } from '@/common/database/database.module';
import { RequestLoggingMiddleware } from '@/common/middleware/request-logging.middleware';
import { AuthModule } from '@/modules/auth/auth.module';
import { CatalogosModule } from '@/modules/catalogos/catalogos.module';
import { ConductoresModule } from '@/modules/conductores/conductores.module';
import { CoolersModule } from '@/modules/coolers/coolers.module';
import { RegistrosModule } from '@/modules/registros/registros.module';
import { ResumenModule } from '@/modules/resumen/resumen.module';
import { RutasModule } from '@/modules/rutas/rutas.module';
import { SaludModule } from '@/modules/salud/salud.module';
import { UsuariosModule } from '@/modules/usuarios/usuarios.module';

@Module({
  imports: [
    // Una sola vez, aquí: valida las variables al arrancar.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validarEntorno,
    }),
    DatabaseModule,
    AuthModule,
    CatalogosModule,
    ConductoresModule,
    CoolersModule,
    RegistrosModule,
    ResumenModule,
    RutasModule,
    SaludModule,
    UsuariosModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('{*ruta}');
  }
}
