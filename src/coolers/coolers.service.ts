import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import pg from 'pg';
import type { UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import { OperacionesService } from '../rutas/operaciones.service.js';
import type {
  EditarCoolerDto,
  EstadoCooler,
  FiltroCoolersDto,
  FiltroRutasCoolerDto,
  NuevoCoolerDto,
} from './cooler.dto.js';
import {
  type Cooler,
  CoolersRepositorio,
  type FiltrosCooler,
} from './coolers.repositorio.js';

// Inventario de coolers. Una cuenta con local solo ve y registra los de su
// local; la pistola, en cambio, encuentra un cooler de cualquier local.

const INTENTOS_CODIGO = 5;

// Estados que ponen y sacan las rutas, no una persona.
const ESTADOS_DE_RUTA: EstadoCooler[] = ['en_espera', 'en_ruta', 'pendiente'];

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'cooler_no_existe' });
}

// Ocho dígitos al azar: cortos de leer y de escribir a mano.
export function codigoAlAzar(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0');
}

@Injectable()
export class CoolersService {
  constructor(
    private readonly bd: BdService,
    private readonly datos: CoolersRepositorio,
    private readonly operaciones: OperacionesService,
  ) {}

  // Se reemplaza en las pruebas.
  nuevoCodigo: () => string = codigoAlAzar;

  // Además del tramo pedido, el resumen de todo lo que la cuenta puede ver
  // (sin los filtros): total, disponibles y en ruta.
  async listar(q: FiltroCoolersDto, usuario: UsuarioSesion) {
    const f = this.filtros(q, usuario);
    const [items, total, resumen] = await Promise.all([
      this.datos.listar(f, q.limite, q.desde),
      this.datos.contar(f),
      this.datos.resumen(localVisible(usuario)),
    ]);
    return { items, total, resumen };
  }

  // Todos los que cumplen el filtro, hasta `maximo` (etiquetas y planilla).
  todos(q: FiltroCoolersDto, usuario: UsuarioSesion, maximo: number) {
    return this.datos.todos(this.filtros(q, usuario), maximo);
  }

  // El que leyó la pistola al armar una ruta: puede ser de otro local.
  async porCodigo(codigo: string): Promise<Cooler> {
    return (await this.datos.porCodigo(codigo.trim())) ?? noExiste();
  }

  // Un cooler de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<Cooler> {
    return (await this.datos.porId(id, localVisible(usuario))) ?? noExiste();
  }

  async rutas(id: number, q: FiltroRutasCoolerDto, usuario: UsuarioSesion) {
    await this.buscar(id, usuario);
    return this.datos.rutas(id, q);
  }

  // El cooler nace disponible y con un código de barras nuevo. Si justo sale
  // un código que ya existe, se prueba con otro.
  async crear(dto: NuevoCoolerDto, usuario: UsuarioSesion): Promise<Cooler> {
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
  ): Promise<Cooler> {
    const actual = await this.buscar(id, usuario);
    const cambiaEstado = actual.estado !== dto.estado;
    if (cambiaEstado && ESTADOS_DE_RUTA.includes(dto.estado)) {
      throw new ConflictException({
        statusCode: 409,
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
