import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_RUTA,
  type EstadoRuta,
} from '@/modules/rutas/enums/estado-ruta.enum';
import type { ConductorRow } from '../interfaces/conductor-row.interface';

export class UltimaRutaDto {
  @ApiProperty({ example: 152 })
  id: number;

  @ApiProperty({ example: '2026-10-22T09:00', description: 'Hora de Chile' })
  fecha: string;

  @ApiProperty({ enum: ESTADOS_RUTA })
  estado: EstadoRuta;

  @ApiProperty({ example: 'Lider Temuco' })
  local: string;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;
}

export class ConductorResponseDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre: string;

  @ApiProperty({ example: '12345678-5', description: 'Sin puntos y con guion' })
  run: string;

  @ApiProperty({ example: '1990-05-05' })
  fechaNacimiento: string;

  @ApiProperty({ example: '912345678' })
  telefono: string;

  @ApiProperty({ example: 'juan@correo.cl' })
  email: string;

  @ApiProperty({ example: 1 })
  ciudadId: number;

  @ApiProperty({ example: 'Temuco' })
  ciudad: string;

  @ApiProperty({ example: 1 })
  tipoConductorId: number;

  @ApiProperty({ example: 'Planta' })
  tipoConductor: string;

  @ApiProperty({
    description:
      'Tiene una ruta en espera o en ejecución: no se le puede asignar otra',
  })
  ocupado: boolean;

  @ApiProperty({ type: UltimaRutaDto, nullable: true })
  ultimaRuta: UltimaRutaDto | null;

  static fromRow(this: void, fila: ConductorRow): ConductorResponseDto {
    const dto = new ConductorResponseDto();
    dto.id = fila.id;
    dto.nombre = fila.nombre;
    dto.run = fila.run;
    dto.fechaNacimiento = fila.fecha_nacimiento;
    dto.telefono = fila.telefono;
    dto.email = fila.email;
    dto.ciudadId = fila.ciudad_id;
    dto.ciudad = fila.ciudad;
    dto.tipoConductorId = fila.tipo_conductor_id;
    dto.tipoConductor = fila.tipo_conductor;
    dto.ocupado = fila.ocupado;
    dto.ultimaRuta = fila.ultima_ruta;
    return dto;
  }
}
