import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import pg from 'pg';
import { DatabaseService } from '@/common/database/database.service';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { exigirLocal, localVisible } from '@/common/utils/alcance.util';
import { OperacionesService } from '@/modules/rutas/operaciones.service';
import type { EditarCoolerDto } from './dto/editar-cooler.request.dto';
import type { FiltroCoolersDto } from './dto/filtro-coolers.query.dto';
import type { FiltroRutasCoolerDto } from './dto/filtro-rutas-cooler.query.dto';
import type { NuevoCoolerDto } from './dto/nuevo-cooler.request.dto';
import type { EstadoCooler } from './enums/estado-cooler.enum';
import {
  CoolersRepository,
  type FiltrosCooler,
} from './repositories/coolers.repository';
import { codigoAlAzar } from './utils/codigo.util';

import type { Pagina } from '@/common/dto/pagina.response.dto';
import { CoolerResponseDto } from './dto/cooler.response.dto';
import {
  ListadoCoolersResponseDto,
  ResumenCoolersDto,
} from './dto/listado-coolers.response.dto';
import { RutaDeCoolerResponseDto } from './dto/ruta-de-cooler.response.dto';
// Inventario de coolers. Una cuenta con local solo ve y registra los de su
// local; la pistola, en cambio, encuentra un cooler de cualquier local.

const INTENTOS_CODIGO = 5;

// Estados que ponen y sacan las rutas, no una persona.
const ESTADOS_DE_RUTA: EstadoCooler[] = ['en_espera', 'en_ruta', 'pendiente'];

function noExiste(): never {
  throw new NotFoundException({ codigo: 'cooler_no_existe' });
}

@Injectable()
export class CoolersService {
  constructor(
    private readonly bd: DatabaseService,
    private readonly datos: CoolersRepository,
    private readonly operaciones: OperacionesService,
  ) {}

  // Se reemplaza en las pruebas.
  nuevoCodigo: () => string = codigoAlAzar;

  // Además del tramo pedido, el resumen de todo lo que la cuenta puede ver
  // (sin los filtros): total, disponibles y en ruta.
  async listar(
    q: FiltroCoolersDto,
    usuario: UsuarioSesion,
  ): Promise<ListadoCoolersResponseDto> {
    const f = this.filtros(q, usuario);
    const [items, total, resumen] = await Promise.all([
      this.datos.listar(f, q.limite, q.desde),
      this.datos.contar(f),
      this.datos.resumen(localVisible(usuario)),
    ]);
    return {
      items: items.map(CoolerResponseDto.fromRow),
      total,
      resumen: ResumenCoolersDto.fromRow(resumen),
    };
  }

  // Todos los que cumplen el filtro, hasta `maximo` (etiquetas y planilla).
  async todos(
    q: FiltroCoolersDto,
    usuario: UsuarioSesion,
    maximo: number,
  ): Promise<CoolerResponseDto[]> {
    const filas = await this.datos.todos(this.filtros(q, usuario), maximo);
    return filas.map(CoolerResponseDto.fromRow);
  }

  // El que leyó la pistola al armar una ruta: puede ser de otro local.
  async porCodigo(codigo: string): Promise<CoolerResponseDto> {
    return CoolerResponseDto.fromRow(
      (await this.datos.porCodigo(codigo.trim())) ?? noExiste(),
    );
  }

  // Un cooler de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<CoolerResponseDto> {
    return CoolerResponseDto.fromRow(
      (await this.datos.porId(id, localVisible(usuario))) ?? noExiste(),
    );
  }

  async rutas(
    id: number,
    q: FiltroRutasCoolerDto,
    usuario: UsuarioSesion,
  ): Promise<Pagina<RutaDeCoolerResponseDto>> {
    await this.buscar(id, usuario);
    const { items, total } = await this.datos.rutas(id, q);
    return { items: items.map(RutaDeCoolerResponseDto.fromRow), total };
  }

  // El cooler nace disponible y con un código de barras nuevo. Si justo sale
  // un código que ya existe, se prueba con otro.
  async crear(
    dto: NuevoCoolerDto,
    usuario: UsuarioSesion,
  ): Promise<CoolerResponseDto> {
    exigirLocal(usuario, dto.localId);
    for (let intento = 1; ; intento++) {
      try {
        const id = await this.datos.insertar(
          {
            nombre: dto.nombre,
            fechaAdquisicion: dto.fechaAdquisicion,
            tieneTapa: dto.tieneTapa,
            // Sin tipoNuevo siempre viene (lo valida el DTO).
            tipoCoolerId: dto.tipoCoolerId ?? 0,
            localId: dto.localId,
          },
          this.nuevoCodigo(),
          dto.tipoNuevo,
        );
        return this.buscar(id, usuario);
      } catch (error) {
        const repetido =
          error instanceof pg.DatabaseError &&
          error.constraint === 'cooler_codigo_uk';
        if (!repetido || intento >= INTENTOS_CODIGO) {
          throw error;
        }
      }
    }
  }

  // Los estados de ruta (en espera, en ruta, pendiente) no se ponen a mano.
  // Cualquier otro sí, aunque el cooler esté en una ruta: queda fuera de ella
  // como si hubiera vuelto (OperacionesService.liberar), y si era el último
  // que le faltaba, la ruta queda finalizada.
  async editar(
    id: number,
    dto: EditarCoolerDto,
    usuario: UsuarioSesion,
  ): Promise<CoolerResponseDto> {
    const actual = await this.buscar(id, usuario);
    const cambiaEstado = actual.estado !== dto.estado;
    if (cambiaEstado && ESTADOS_DE_RUTA.includes(dto.estado)) {
      throw new ConflictException({
        codigo: 'cooler_estado_de_ruta',
      });
    }
    await this.bd.transaccion(async (sql) => {
      await this.datos.actualizar(sql, id, dto);
      if (cambiaEstado) {
        await this.operaciones.liberar(sql, id, dto.estado);
      }
    });
    return this.buscar(id, usuario);
  }

  private filtros(q: FiltroCoolersDto, usuario: UsuarioSesion): FiltrosCooler {
    return {
      buscar: q.buscar,
      estado: q.estado ?? null,
      localId: localVisible(usuario, q.localId),
    };
  }
}
