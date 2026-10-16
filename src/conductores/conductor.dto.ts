import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { TipoEventoDto } from '../catalogos/catalogo.dto.js';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { PaginaDto } from '../comun/paginacion.js';
import { recortar } from '../comun/transformaciones.js';
import { EsFecha } from '../comun/validaciones.js';
import { normalizarRun, runValido } from './run.js';

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

export class FiltroConductoresDto extends PaginaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoConductorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId?: number;

  // true: solo los que no tienen una ruta abierta (para asignarles una).
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  libres?: boolean;
}

// Como en la versión Laravel, en vez de un tipo existente (`tipoEventoId`)
// puede venir uno nuevo ("Otro": `tipoNuevo`), que se crea junto con el evento.
export class EventoDto {
  @ValidateIf((o: EventoDto) => o.tipoNuevo === undefined)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  tipoEventoId?: number;

  // Si viene, siempre se valida (aunque venga también `tipoEventoId`).
  @ValidateIf(
    (o: EventoDto) => o.tipoNuevo !== undefined || o.tipoEventoId === undefined,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => TipoEventoDto)
  tipoNuevo?: TipoEventoDto;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  titulo: string;

  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion: string = '';

  // Ambos días incluidos; que `hasta` no sea anterior lo valida la base.
  @EsFecha()
  desde: string;

  @EsFecha()
  hasta: string;
}

// El calendario pide los eventos que tocan un rango de días.
export class RangoDto {
  @EsFecha()
  desde: string;

  @EsFecha()
  hasta: string;
}

export class CuentaDto {
  // Para qué es la cuenta: el nombre de la aplicación, por ejemplo.
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cuenta: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  usuario: string;

  // No se recorta: un espacio puede ser parte de la contraseña.
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clave: string;
}

// Al editar, la contraseña solo se envía si se quiere cambiar.
export class EditarCuentaDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cuenta: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  usuario: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clave?: string;
}
