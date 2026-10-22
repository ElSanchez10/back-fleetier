import { ApiProperty } from '@nestjs/swagger';
import { UsuarioResponseDto } from './usuario.response.dto';

// La contraseña con que parte la cuenta: se entrega a la persona, que debe
// cambiarla en su primer ingreso.
export class ClaveInicialResponseDto {
  @ApiProperty({ example: 'fleetier-inicial-2026' })
  claveInicial: string;
}

export class UsuarioCreadoResponseDto extends ClaveInicialResponseDto {
  @ApiProperty({ type: UsuarioResponseDto })
  usuario: UsuarioResponseDto;
}
