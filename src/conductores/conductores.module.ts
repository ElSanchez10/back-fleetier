import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { cifradoConfigurado } from './cifrado.js';
import { ConductoresController } from './conductores.controller.js';
import { ConductoresService } from './conductores.service.js';
import { CuentasController } from './cuentas.controller.js';
import { EventosController } from './eventos.controller.js';
import { RutasConductorController } from './rutas-conductor.controller.js';

@Module({
  controllers: [
    ConductoresController,
    EventosController,
    CuentasController,
    RutasConductorController,
  ],
  providers: [ConductoresService],
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
