import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { BdModule } from './bd/bd.module.js';
import { CatalogosModule } from './catalogos/catalogos.module.js';
import { CoolersModule } from './coolers/coolers.module.js';
import { SaludController } from './salud/salud.controller.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    BdModule,
    AuthModule,
    CatalogosModule,
    CoolersModule,
    UsuariosModule,
  ],
  controllers: [SaludController],
})
export class AppModule {}
