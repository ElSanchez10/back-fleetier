import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarClaveDto {
  @IsString()
  @MaxLength(200)
  claveActual: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  claveNueva: string;
}
