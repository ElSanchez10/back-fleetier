import { Module } from '@nestjs/common';
import { RutasModule } from '../rutas/rutas.module.js';
import { CoolersController } from './coolers.controller.js';
import { CoolersRepositorio } from './coolers.repositorio.js';
import { CoolersService } from './coolers.service.js';

@Module({
  imports: [RutasModule],
  controllers: [CoolersController],
  providers: [CoolersService, CoolersRepositorio],
})
export class CoolersModule {}
