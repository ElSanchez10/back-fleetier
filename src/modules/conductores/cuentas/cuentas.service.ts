import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { ConductoresService } from '../conductores.service';
import type { CuentaDto } from './dto/cuenta.request.dto';
import type { EditarCuentaDto } from './dto/editar-cuenta.request.dto';
import { CuentasRepository } from './repositories/cuentas.repository';
import { CifradoService } from './cifrado.service';

import {
  ClaveCuentaResponseDto,
  CuentaResponseDto,
} from './dto/cuenta.response.dto';

function noExiste(): never {
  throw new NotFoundException({ codigo: 'cuenta_no_existe' });
}

// Cuentas del conductor en aplicaciones externas. Son credenciales ajenas: se
// guardan cifradas, la contraseña no viaja en el listado y se pide aparte, una
// a la vez. Quién las ve lo decide el controlador (admin y asistente); aquí,
// que la cuenta vea al conductor.
@Injectable()
export class CuentasService {
  constructor(
    private readonly datos: CuentasRepository,
    private readonly conductores: ConductoresService,
    private readonly cifrado: CifradoService,
  ) {}

  async listar(
    conductorId: number,
    usuario: UsuarioSesion,
  ): Promise<CuentaResponseDto[]> {
    await this.conductores.buscar(conductorId, usuario);
    return (await this.datos.listar(conductorId)).map(
      CuentaResponseDto.fromRow,
    );
  }

  async clave(
    conductorId: number,
    cuentaId: number,
    usuario: UsuarioSesion,
  ): Promise<ClaveCuentaResponseDto> {
    await this.conductores.buscar(conductorId, usuario);
    const cifrada = await this.datos.claveCifrada(conductorId, cuentaId);
    return { clave: this.cifrado.descifrar(cifrada ?? noExiste()) };
  }

  async crear(
    conductorId: number,
    dto: CuentaDto,
    usuario: UsuarioSesion,
  ): Promise<CuentaResponseDto> {
    await this.conductores.buscar(conductorId, usuario);
    const nueva = await this.datos.insertar(
      conductorId,
      dto.cuenta,
      dto.usuario,
      this.cifrado.cifrar(dto.clave),
    );
    return CuentaResponseDto.fromRow(nueva);
  }

  // Sin contraseña nueva, queda la que estaba.
  async editar(
    conductorId: number,
    cuentaId: number,
    dto: EditarCuentaDto,
    usuario: UsuarioSesion,
  ): Promise<CuentaResponseDto> {
    await this.conductores.buscar(conductorId, usuario);
    const cuenta = await this.datos.actualizar(
      conductorId,
      cuentaId,
      dto.cuenta,
      dto.usuario,
      dto.clave === undefined ? null : this.cifrado.cifrar(dto.clave),
    );
    return CuentaResponseDto.fromRow(cuenta ?? noExiste());
  }

  async eliminar(
    conductorId: number,
    cuentaId: number,
    usuario: UsuarioSesion,
  ): Promise<void> {
    await this.conductores.buscar(conductorId, usuario);
    if (!(await this.datos.eliminar(conductorId, cuentaId))) {
      noExiste();
    }
  }
}
