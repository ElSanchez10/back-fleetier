import { Module } from '@nestjs/common';
import { ConductoresModule } from '@/modules/conductores/conductores.module';
import { DevolucionesController } from './devoluciones/devoluciones.controller';
import { DevolucionesService } from './devoluciones/devoluciones.service';
import { OperacionesService } from './operaciones.service';
import { ProblemasController } from './problemas/problemas.controller';
import { ProblemasService } from './problemas/problemas.service';
import { DevolucionesRepository } from './devoluciones/repositories/devoluciones.repository';
import { ProblemasRepository } from './problemas/repositories/problemas.repository';
import { RutasRepository } from './repositories/rutas.repository';
import { RutasController } from './rutas.controller';
import { RutasService } from './rutas.service';

@Module({
  imports: [ConductoresModule],
  controllers: [RutasController, ProblemasController, DevolucionesController],
  providers: [
    RutasService,
    ProblemasService,
    DevolucionesService,
    OperacionesService,
    RutasRepository,
    ProblemasRepository,
    DevolucionesRepository,
  ],
  exports: [OperacionesService],
})
export class RutasModule {}
