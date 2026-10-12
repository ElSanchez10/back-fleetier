import { Module } from '@nestjs/common';
import { CiudadesController } from './ciudades.controller.js';
import { DestinosController } from './destinos.controller.js';
import { LocalesController } from './locales.controller.js';
import { TiposConductorController } from './tipos-conductor.controller.js';
import { TiposCoolerController } from './tipos-cooler.controller.js';
import { TiposEventoController } from './tipos-evento.controller.js';

// Lo que se administra en la pantalla Configuración.
@Module({
  controllers: [
    CiudadesController,
    LocalesController,
    DestinosController,
    TiposCoolerController,
    TiposConductorController,
    TiposEventoController,
  ],
})
export class CatalogosModule {}
