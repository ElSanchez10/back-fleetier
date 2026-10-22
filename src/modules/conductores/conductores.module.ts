import { Module } from '@nestjs/common';
import { ConductoresController } from './conductores.controller';
import { ConductoresService } from './conductores.service';
import { CuentasController } from './cuentas/cuentas.controller';
import { CuentasService } from './cuentas/cuentas.service';
import { CuentasRepository } from './cuentas/repositories/cuentas.repository';
import { CifradoService } from './cuentas/cifrado.service';
import { EventosController } from './eventos/eventos.controller';
import { EventosService } from './eventos/eventos.service';
import { EventosRepository } from './eventos/repositories/eventos.repository';
import { ConductoresRepository } from './repositories/conductores.repository';

@Module({
  controllers: [ConductoresController, EventosController, CuentasController],
  providers: [
    ConductoresService,
    ConductoresRepository,
    CuentasService,
    CuentasRepository,
    CifradoService,
    EventosService,
    EventosRepository,
  ],
  exports: [ConductoresService],
})
export class ConductoresModule {}
