import { Module } from '@nestjs/common';
import { ConductoresModule } from '../conductores/conductores.module.js';
import { DevolucionesController } from './devoluciones.controller.js';
import { DevolucionesService } from './devoluciones.service.js';
import { OperacionesService } from './operaciones.service.js';
import { ProblemasController } from './problemas.controller.js';
import { ProblemasService } from './problemas.service.js';
import { RutasConsultasRepositorio } from './rutas-consultas.repositorio.js';
import { RutasController } from './rutas.controller.js';
import { RutasRepositorio } from './rutas.repositorio.js';
import { RutasService } from './rutas.service.js';

@Module({
  imports: [ConductoresModule],
  controllers: [RutasController, ProblemasController, DevolucionesController],
  providers: [
    RutasService,
    ProblemasService,
    DevolucionesService,
    OperacionesService,
    RutasRepositorio,
    RutasConsultasRepositorio,
  ],
  exports: [OperacionesService],
})
export class RutasModule {}
