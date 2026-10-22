import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { ID_MAXIMO } from '@/common/pipes/id.pipe';
import { recortar } from '@/common/utils/transformaciones.util';
import { EsFecha } from '@/common/utils/validaciones.util';
import { normalizarRun, runValido } from '../utils/run.util';

@ValidatorConstraint({ name: 'run' })
class RunValido implements ValidatorConstraintInterface {
  validate(valor: unknown) {
    return typeof valor === 'string' && runValido(valor);
  }

  defaultMessage() {
    return 'run no es un RUN válido';
  }
}

export class ConductorDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  // Llega como lo escriba la persona; se guarda sin puntos y con guion.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizarRun(value) : value,
  )
  @Validate(RunValido)
  run: string;

  @EsFecha()
  fechaNacimiento: string;

  // Celular: nueve dígitos, sin el +56.
  @Transform(recortar)
  @Matches(/^\d{9}$/)
  telefono: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(120)
  email: string;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId: number;

  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoConductorId: number;
}
