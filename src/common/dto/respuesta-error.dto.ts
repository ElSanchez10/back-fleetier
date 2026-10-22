import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RespuestaError } from '../filters/http-exception.filter';

// Forma de toda respuesta de error (la arma HttpExceptionFilter). Solo para
// documentarla en Swagger.
export class RespuestaErrorDto implements RespuestaError {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({
    example: 'ruta_ya_partio',
    description:
      'Qué falló: el código de la regla o el nombre de la restricción de la base. El front elige su mensaje con él.',
  })
  codigo: string;

  @ApiProperty({
    example: 'La ruta ya partió: solo un administrador corrige sus datos.',
  })
  message: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Solo en datos inválidos: qué campos fallaron.',
  })
  detalles?: string[];

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: '/api/v1/rutas/12' })
  path: string;

  @ApiProperty({ example: '2026-10-22T14:03:11.120Z' })
  timestamp: string;
}
