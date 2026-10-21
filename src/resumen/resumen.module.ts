import { Module } from '@nestjs/common';
import { ResumenController } from './resumen.controller.js';
import { ResumenRepositorio } from './resumen.repositorio.js';
import { ResumenService } from './resumen.service.js';

// Indicadores y resumen de la pantalla de inicio.
@Module({
  controllers: [ResumenController],
  providers: [ResumenService, ResumenRepositorio],
})
export class ResumenModule {}
