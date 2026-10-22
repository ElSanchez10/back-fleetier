import { ApiProperty } from '@nestjs/swagger';
import { TODOS_LOS_ROLES } from '@/common/decorators/roles.decorator';
import type {
  Rol,
  UsuarioSesion,
} from '@/common/interfaces/usuario-sesion.interface';
import type { SesionAbiertaRow } from '../interfaces/auth-row.interface';

// Quien tiene la sesión (la misma forma que UsuarioSesion).
export class UsuarioSesionResponseDto implements UsuarioSesion {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Ana Pérez' })
  nombre: string;

  @ApiProperty({ example: 'ana@fleetier.cl' })
  correo: string;

  @ApiProperty({ enum: TODOS_LOS_ROLES })
  rol: Rol;

  @ApiProperty({
    description:
      'true mientras tenga la contraseña inicial: solo puede cambiarla o salir',
  })
  debeCambiarClave: boolean;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Con local, solo ve y modifica lo de ese local',
  })
  localId: number | null;
}

// Un navegador con la sesión abierta.
export class SesionAbiertaResponseDto {
  @ApiProperty({ type: String, nullable: true, example: 'Mozilla/5.0 …' })
  navegador: string | null;

  @ApiProperty({ type: String, nullable: true, example: '10.8.0.6' })
  ip: string | null;

  @ApiProperty({ example: '2026-10-22T14:03:11.120Z' })
  ultimaActividad: string;

  @ApiProperty({ description: 'Es la sesión desde donde se pregunta' })
  actual: boolean;

  static fromRow(this: void, fila: SesionAbiertaRow): SesionAbiertaResponseDto {
    const dto = new SesionAbiertaResponseDto();
    dto.navegador = fila.navegador;
    dto.ip = fila.ip;
    dto.ultimaActividad = fila.ultima_actividad;
    dto.actual = fila.actual;
    return dto;
  }
}
