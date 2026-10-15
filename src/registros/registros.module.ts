import { Module } from '@nestjs/common';
import { ConductoresModule } from '../conductores/conductores.module.js';
import { AtrasosController } from './atrasos.controller.js';
import { CasosController } from './casos.controller.js';
import { PedidosController } from './pedidos.controller.js';

// Lo que se anota cada día en Actividad además de las rutas.
@Module({
  imports: [ConductoresModule],
  controllers: [PedidosController, AtrasosController, CasosController],
})
export class RegistrosModule {}
