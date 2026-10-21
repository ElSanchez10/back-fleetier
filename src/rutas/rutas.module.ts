import { Module } from '@nestjs/common';
import { ConductoresModule } from '../conductores/conductores.module.js';
import { DevolucionesController } from './devoluciones.controller.js';
import { ProblemasController } from './problemas.controller.js';
import { RutasController } from './rutas.controller.js';
import { OperacionesService } from './operaciones.service.js';
import { RutasRepositorio } from './rutas.repositorio.js';
import { RutasService } from './rutas.service.js';

@Module({
  imports: [ConductoresModule],
  controllers: [RutasController, ProblemasController, DevolucionesController],
  providers: [RutasService, RutasRepositorio, OperacionesService],
  exports: [OperacionesService],
})
export class RutasModule {}
