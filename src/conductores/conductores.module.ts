import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { cifradoConfigurado } from './cifrado.js';
import { ConductoresController } from './conductores.controller.js';
import { ConductoresRepositorio } from './conductores.repositorio.js';
import { ConductoresService } from './conductores.service.js';
import { CuentasController } from './cuentas.controller.js';
import { CuentasRepositorio } from './cuentas.repositorio.js';
import { CuentasService } from './cuentas.service.js';
import { EventosController } from './eventos.controller.js';
import { EventosRepositorio } from './eventos.repositorio.js';
import { EventosService } from './eventos.service.js';
import { RutasConductorController } from './rutas-conductor.controller.js';

@Module({
  controllers: [
    ConductoresController,
    EventosController,
    CuentasController,
    RutasConductorController,
  ],
  providers: [
    ConductoresService,
    ConductoresRepositorio,
    CuentasService,
    CuentasRepositorio,
    EventosService,
    EventosRepositorio,
  ],
  exports: [ConductoresService],
})
export class ConductoresModule implements OnModuleInit {
  // Sin CLAVE_CUENTAS el back parte igual; solo las cuentas de los conductores
  // quedan sin poder guardarse ni leerse (responden 503).
  onModuleInit() {
    if (!cifradoConfigurado()) {
      new Logger('Conductores').warn(
        'Falta CLAVE_CUENTAS (mínimo 16 caracteres): las cuentas de los conductores no se pueden guardar ni leer.',
      );
    }
  }
}
