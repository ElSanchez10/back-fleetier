import { Module } from '@nestjs/common';
import { ConductoresModule } from '../conductores/conductores.module.js';
import { AtrasosController } from './atrasos.controller.js';
import { AtrasosRepositorio } from './atrasos.repositorio.js';
import { AtrasosService } from './atrasos.service.js';
import { CasosController } from './casos.controller.js';
import { CasosRepositorio } from './casos.repositorio.js';
import { CasosService } from './casos.service.js';
import { PedidosController } from './pedidos.controller.js';
import { PedidosRepositorio } from './pedidos.repositorio.js';
import { PedidosService } from './pedidos.service.js';

// Lo que se anota cada día en Actividad además de las rutas.
@Module({
  imports: [ConductoresModule],
  controllers: [PedidosController, AtrasosController, CasosController],
  providers: [
    PedidosService,
    PedidosRepositorio,
    AtrasosService,
    AtrasosRepositorio,
    CasosService,
    CasosRepositorio,
  ],
})
export class RegistrosModule {}
