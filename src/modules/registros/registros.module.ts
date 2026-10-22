import { Module } from '@nestjs/common';
import { ConductoresModule } from '@/modules/conductores/conductores.module';
import { AtrasosController } from './atrasos/atrasos.controller';
import { AtrasosService } from './atrasos/atrasos.service';
import { AtrasosRepository } from './atrasos/repositories/atrasos.repository';
import { CasosController } from './casos/casos.controller';
import { CasosService } from './casos/casos.service';
import { CasosRepository } from './casos/repositories/casos.repository';
import { PedidosController } from './pedidos/pedidos.controller';
import { PedidosService } from './pedidos/pedidos.service';
import { PedidosRepository } from './pedidos/repositories/pedidos.repository';

// Lo que se anota cada día en Actividad además de las rutas.
@Module({
  imports: [ConductoresModule],
  controllers: [PedidosController, AtrasosController, CasosController],
  providers: [
    PedidosService,
    PedidosRepository,
    AtrasosService,
    AtrasosRepository,
    CasosService,
    CasosRepository,
  ],
})
export class RegistrosModule {}
