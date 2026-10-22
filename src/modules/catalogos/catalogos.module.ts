import { Module, type Provider } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { DatabaseService } from '@/common/database/database.service';
import { CATALOGO, CatalogoService, LocalesService } from './catalogos.service';
import { CiudadesController } from './ciudades.controller';
import { DestinosController } from './destinos.controller';
import { CiudadResponseDto } from './dto/ciudad.response.dto';
import { DestinoResponseDto } from './dto/destino.response.dto';
import { LocalResponseDto } from './dto/local.response.dto';
import { TipoConductorResponseDto } from './dto/tipo-conductor.response.dto';
import { TipoCoolerResponseDto } from './dto/tipo-cooler.response.dto';
import { TipoEventoResponseDto } from './dto/tipo-evento.response.dto';
import { LocalesController } from './locales.controller';
import {
  type Catalogo,
  CatalogoRepository,
} from './repositories/catalogo.repository';
import {
  CIUDADES,
  DESTINOS,
  LOCALES,
  TIPOS_CONDUCTOR,
  TIPOS_COOLER,
  TIPOS_EVENTO,
} from './repositories/catalogos.sql';
import { TiposConductorController } from './tipos-conductor.controller';
import { TiposCoolerController } from './tipos-cooler.controller';
import { TiposEventoController } from './tipos-evento.controller';

// Los seis catálogos comparten servicio y repositorio; cambian la tabla y la
// forma de la respuesta. Cada uno se registra con su token (CATALOGO.*).
function catalogo<T extends object, R extends QueryResultRow, O>(
  token: string,
  definicion: Catalogo<T>,
  aRespuesta: (fila: R) => O,
  Servicio: new (
    datos: CatalogoRepository<T, R>,
    aRespuesta: (fila: R) => O,
  ) => CatalogoService<T, R, O> = CatalogoService,
): Provider {
  return {
    provide: token,
    inject: [DatabaseService],
    useFactory: (bd: DatabaseService) =>
      new Servicio(new CatalogoRepository<T, R>(bd, definicion), aRespuesta),
  };
}

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
  providers: [
    catalogo(CATALOGO.ciudades, CIUDADES, CiudadResponseDto.fromRow),
    catalogo(
      CATALOGO.locales,
      LOCALES,
      LocalResponseDto.fromRow,
      LocalesService,
    ),
    catalogo(CATALOGO.destinos, DESTINOS, DestinoResponseDto.fromRow),
    catalogo(CATALOGO.tiposCooler, TIPOS_COOLER, TipoCoolerResponseDto.fromRow),
    catalogo(
      CATALOGO.tiposConductor,
      TIPOS_CONDUCTOR,
      TipoConductorResponseDto.fromRow,
    ),
    catalogo(CATALOGO.tiposEvento, TIPOS_EVENTO, TipoEventoResponseDto.fromRow),
  ],
})
export class CatalogosModule {}
